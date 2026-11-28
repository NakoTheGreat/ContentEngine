import { promises as fs } from "node:fs";
import path from "node:path";

/**
 * Stage 5: ElevenLabs. One consistent voice for the whole ad, recorded settings
 * saved with the take, audio written per scene so the animation can sync to it.
 */

const ROOT = path.join(process.cwd(), "pipeline");
const API = "https://api.elevenlabs.io/v1";

const DEFAULT_SETTINGS = {
  stability: 0.45,
  similarity_boost: 0.75,
  style: 0.25,
  speed: 1,
  model_id: "eleven_multilingual_v2",
};

/** A short, safe fallback list so the picker is never empty. */
const FALLBACK_VOICES = [
  { id: "21m00Tcm4TlvDq8ikWAM", name: "Rachel", labels: { accent: "american", gender: "female" } },
  { id: "pNInz6obpgDQGcFmaJgB", name: "Adam", labels: { accent: "american", gender: "male" } },
  { id: "EXAVITQu4vr4xnSDxMaL", name: "Sarah", labels: { accent: "american", gender: "female" } },
  { id: "TxGEqnHWrfWFTfGW9XjX", name: "Josh", labels: { accent: "american", gender: "male" } },
];

function key(): string | null {
  const value = process.env.ELEVENLABS_API_KEY;
  return value && value.trim() ? value.trim() : null;
}

function safeName(value: string): string {
  return value.replace(/[^a-zA-Z0-9-]/g, "-").slice(0, 60) || "ad";
}

async function synthesise(
  apiKey: string,
  voiceId: string,
  text: string,
  settings: Record<string, unknown>,
): Promise<Uint8Array> {
  const response = await fetch(
    `${API}/text-to-speech/${encodeURIComponent(voiceId)}?output_format=mp3_44100_128`,
    {
      method: "POST",
      headers: {
        "xi-api-key": apiKey,
        "Content-Type": "application/json",
        Accept: "audio/mpeg",
      },
      body: JSON.stringify({
        text,
        model_id: settings.model_id ?? DEFAULT_SETTINGS.model_id,
        voice_settings: {
          stability: settings.stability ?? DEFAULT_SETTINGS.stability,
          similarity_boost: settings.similarity_boost ?? DEFAULT_SETTINGS.similarity_boost,
          style: settings.style ?? DEFAULT_SETTINGS.style,
          use_speaker_boost: true,
          speed: settings.speed ?? DEFAULT_SETTINGS.speed,
        },
      }),
    },
  );

  if (!response.ok) {
    const detail = await response.text();
    let message = detail.slice(0, 400);
    try {
      const parsed = JSON.parse(detail) as { detail?: { message?: string } | string };
      if (typeof parsed.detail === "string") message = parsed.detail;
      else if (parsed.detail?.message) message = parsed.detail.message;
    } catch {
      // Keep the raw text.
    }
    throw new Error(`ElevenLabs ${response.status}: ${message}`);
  }

  return new Uint8Array(await response.arrayBuffer());
}

export async function GET() {
  const apiKey = key();
  if (!apiKey) {
    return Response.json({
      configured: false,
      voices: FALLBACK_VOICES,
      settings: DEFAULT_SETTINGS,
      message: "Add ELEVENLABS_API_KEY to .env.local to generate voiceover.",
    });
  }

  try {
    const response = await fetch(`${API}/voices`, {
      headers: { "xi-api-key": apiKey },
      cache: "no-store",
    });
    if (!response.ok) throw new Error(`ElevenLabs ${response.status}`);
    const payload = (await response.json()) as {
      voices: Array<{ voice_id: string; name: string; labels?: Record<string, string> }>;
    };
    const voices = payload.voices.map((voice) => ({
      id: voice.voice_id,
      name: voice.name,
      labels: voice.labels ?? {},
    }));
    return Response.json({
      configured: true,
      voices: voices.length ? voices : FALLBACK_VOICES,
      settings: DEFAULT_SETTINGS,
    });
  } catch (error) {
    return Response.json({
      configured: true,
      voices: FALLBACK_VOICES,
      settings: DEFAULT_SETTINGS,
      message: error instanceof Error ? error.message : "Could not load voices.",
    });
  }
}

export async function POST(request: Request) {
  let body: {
    project?: string;
    voiceId?: string;
    settings?: Record<string, unknown>;
    scenes?: Array<{ n: number; text: string }>;
    previewText?: string;
  };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const apiKey = key();
  if (!apiKey) {
    return Response.json(
      {
        configured: false,
        error:
          "No ElevenLabs key. Add ELEVENLABS_API_KEY to .env.local in the project folder and restart the dev server.",
      },
      { status: 400 },
    );
  }

  const voiceId = body.voiceId?.trim();
  if (!voiceId) return Response.json({ error: "Choose a voice first." }, { status: 400 });

  const settings = body.settings ?? {};

  // Audition a voice without saving anything.
  if (body.previewText) {
    try {
      const audio = await synthesise(apiKey, voiceId, body.previewText, settings);
      return Response.json({
        preview: `data:audio/mpeg;base64,${Buffer.from(audio).toString("base64")}`,
      });
    } catch (error) {
      return Response.json(
        { error: error instanceof Error ? error.message : "Preview failed." },
        { status: 502 },
      );
    }
  }

  const scenes = (body.scenes ?? []).filter((scene) => scene.text?.trim());
  if (!scenes.length) return Response.json({ error: "No voiceover lines to send." }, { status: 400 });

  const project = safeName(body.project ?? "");
  const dir = path.join(ROOT, project, "audio");
  await fs.mkdir(dir, { recursive: true });

  const clips: Array<{ n: number; file: string; url: string }> = [];
  const failures: string[] = [];

  for (const scene of scenes) {
    try {
      const audio = await synthesise(apiKey, voiceId, scene.text.trim(), settings);
      const file = `scene-${scene.n}.mp3`;
      await fs.writeFile(path.join(dir, file), Buffer.from(audio));
      clips.push({
        n: scene.n,
        file,
        url: `/api/media?project=${encodeURIComponent(project)}&file=${file}`,
      });
    } catch (error) {
      failures.push(`scene ${scene.n}: ${error instanceof Error ? error.message : "failed"}`);
    }
  }

  if (!clips.length) {
    return Response.json({ error: failures.join(" · ") || "Voiceover failed." }, { status: 502 });
  }

  return Response.json({
    clips,
    failures,
    voiceId,
    settings,
    savedTo: `pipeline/${project}/audio/`,
  });
}
