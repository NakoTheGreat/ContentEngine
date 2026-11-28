"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { Brief, Script, Voice, VoiceSettings } from "@/lib/pipeline/types";
import { Button, Label, Panel, Pill, Row, SectionTitle } from "./ui";

type VoiceOption = { id: string; name: string; labels?: Record<string, string> };

type Props = {
  brief: Brief;
  script: Script;
  voice: Voice | null;
  onVoice: (voice: Voice) => void;
  onNext: () => void;
  notify: (message: string) => void;
};

const DEFAULTS: VoiceSettings = {
  stability: 0.45,
  similarity_boost: 0.75,
  style: 0.25,
  speed: 1,
  modelId: "eleven_multilingual_v2",
};

const SAMPLE = "Custom graphics, drawn for your brand. First draft in three days.";

export function VoiceTab({ brief, script, voice, onVoice, onNext, notify }: Props) {
  const [voices, setVoices] = useState<VoiceOption[]>([]);
  const [configured, setConfigured] = useState<boolean | null>(null);
  const [voiceId, setVoiceId] = useState(voice?.voiceId ?? "");
  const [settings, setSettings] = useState<VoiceSettings>(voice?.settings ?? DEFAULTS);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const previewRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/voice")
      .then((response) => response.json())
      .then((data: { configured: boolean; voices: VoiceOption[]; settings?: Partial<VoiceSettings>; message?: string }) => {
        if (cancelled) return;
        setVoices(data.voices ?? []);
        setConfigured(Boolean(data.configured));
        setVoiceId((current) => current || data.voices?.[0]?.id || "");
        if (!voice) setSettings({ ...DEFAULTS, ...(data.settings ?? {}) });
        if (data.message) setError(data.message);
      })
      .catch(() => {
        if (!cancelled) {
          setConfigured(false);
          setError("Could not reach the voice service.");
        }
      });
    return () => {
      cancelled = true;
    };
  }, [voice]);

  const selectedName = useMemo(
    () => voices.find((option) => option.id === voiceId)?.name ?? voice?.voiceName ?? "Voice",
    [voices, voiceId, voice?.voiceName],
  );

  const audition = async () => {
    setBusy(true);
    setError(null);
    try {
      const response = await fetch("/api/voice", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ voiceId, settings: { ...settings, model_id: settings.modelId }, previewText: SAMPLE }),
      });
      const data = (await response.json()) as { preview?: string; error?: string };
      if (!response.ok || !data.preview) throw new Error(data.error ?? "Preview failed.");
      setPreview(data.preview);
      requestAnimationFrame(() => previewRef.current?.play().catch(() => undefined));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Preview failed.");
    } finally {
      setBusy(false);
    }
  };

  const generate = async () => {
    setBusy(true);
    setError(null);
    try {
      const response = await fetch("/api/voice", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          project: brief.project,
          voiceId,
          settings: { ...settings, model_id: settings.modelId },
          scenes: script.scenes.map((scene) => ({ n: scene.n, text: scene.vo })),
        }),
      });
      const data = (await response.json()) as {
        clips?: Array<{ n: number; file: string; url: string }>;
        failures?: string[];
        settings?: Record<string, unknown>;
        error?: string;
      };
      if (!response.ok || !data.clips?.length) throw new Error(data.error ?? "Voiceover failed.");

      // Measure the real clip lengths so the animation can sync to them.
      const ctx = new AudioContext();
      const measured: Array<{ n: number; file: string; url: string; dur: number }> = [];
      for (const clip of data.clips) {
        try {
          const audio = await fetch(clip.url);
          const buffer = await ctx.decodeAudioData(await audio.arrayBuffer());
          measured.push({ ...clip, dur: Math.round(buffer.duration * 100) / 100 });
        } catch {
          notify(`Scene ${clip.n} audio could not be measured.`);
        }
      }
      await ctx.close();

      const order = new Map(script.scenes.map((scene) => [scene.n, scene.n]));
      measured.sort((a, b) => (order.get(a.n) ?? a.n) - (order.get(b.n) ?? b.n));

      const GAP = 0.12;
      let cursor = 0.1;
      const clips = measured.map((clip) => {
        const start = Math.round(cursor * 100) / 100;
        const end = Math.round((start + clip.dur + GAP) * 100) / 100;
        cursor = end;
        return { n: clip.n, file: clip.file, url: clip.url, start, end, dur: Math.round((end - start) * 100) / 100 };
      });

      onVoice({
        mode: "elevenlabs",
        voiceId,
        voiceName: selectedName,
        settings,
        clips,
        total: Math.round(cursor * 100) / 100,
        generatedAt: new Date().toISOString(),
        note: data.failures?.length ? `Missing: ${data.failures.join(", ")}` : undefined,
      });
      if (data.failures?.length) setError(`Some lines failed — ${data.failures.join(" · ")}`);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Voiceover failed.");
    } finally {
      setBusy(false);
    }
  };

  const captionsOnly = () => {
    onVoice({
      mode: "silent",
      voiceId: "none",
      voiceName: "Captions only",
      settings,
      clips: [],
      total: script.total,
      generatedAt: new Date().toISOString(),
      note: "No voiceover: captions and music carry the cut.",
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <SectionTitle hint="Stage 5">Voiceover</SectionTitle>
        <p className="mt-2 max-w-xl text-[13px] leading-relaxed text-white/45">
          One voice for every line. Only the voiceover lines are sent; the take, the settings and the
          real clip timings are saved with the project so the animation can lock to them.
        </p>
      </div>

      {configured === false ? (
        <Panel className="border-[#c89a62]/30 bg-[#c89a62]/[0.06] p-4">
          <p className="text-[13px] leading-relaxed text-[#e7d3b6]">
            <strong className="font-medium">ElevenLabs key not set.</strong> Add{" "}
            <code className="rounded bg-black/40 px-1.5 py-0.5 text-[12px]">ELEVENLABS_API_KEY</code> to{" "}
            <code className="rounded bg-black/40 px-1.5 py-0.5 text-[12px]">.env.local</code> in the project
            folder, restart the dev server, then reload this tab. You can run the cut captions-only in the
            meantime — the animation, QA and export all work without audio.
          </p>
        </Panel>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
        <Panel className="p-4">
          <div className="flex items-center justify-between">
            <Label>Voice</Label>
            <Pill>{voices.length} available</Pill>
          </div>
          <div className="mt-2 max-h-56 space-y-1 overflow-y-auto pr-1">
            {voices.map((option) => (
              <button
                key={option.id}
                type="button"
                onClick={() => setVoiceId(option.id)}
                className={`flex w-full items-center justify-between rounded-lg border px-3 py-2 text-left text-[13px] transition ${
                  voiceId === option.id
                    ? "border-[#c89a62]/60 bg-[#c89a62]/10 text-[#f4efe7]"
                    : "border-white/10 text-white/60 hover:border-white/25"
                }`}
              >
                <span>{option.name}</span>
                <span className="text-[10px] uppercase tracking-[0.16em] text-white/30">
                  {[option.labels?.accent, option.labels?.gender].filter(Boolean).join(" · ")}
                </span>
              </button>
            ))}
          </div>
          <div className="mt-3 flex items-center gap-2">
            <Button variant="ghost" onClick={audition} disabled={busy || configured === false}>
              Preview voice
            </Button>
            {preview ? <audio ref={previewRef} src={preview} controls className="h-8 flex-1" /> : null}
          </div>
        </Panel>

        <Panel className="p-4">
          <Label>Settings</Label>
          {(
            [
              ["stability", settings.stability],
              ["similarity_boost", settings.similarity_boost],
              ["style", settings.style],
              ["speed", settings.speed],
            ] as Array<[keyof VoiceSettings, number]>
          ).map(([key, value]) => (
            <label key={key} className="mt-3 block">
              <span className="flex items-center justify-between text-[11px] text-white/45">
                <span className="capitalize">{key.replace("_", " ")}</span>
                <span className="font-mono text-white/60">{Number(value).toFixed(2)}</span>
              </span>
              <input
                type="range"
                min={key === "speed" ? 0.7 : 0}
                max={key === "speed" ? 1.2 : 1}
                step={0.05}
                value={value}
                onChange={(event) =>
                  setSettings((current) => ({ ...current, [key]: Number(event.target.value) }))
                }
                className="mt-1 h-1 w-full cursor-pointer appearance-none rounded-full bg-white/15 accent-[#c89a62]"
              />
            </label>
          ))}
          <p className="mt-3 text-[10px] uppercase tracking-[0.16em] text-white/25">
            model · {settings.modelId}
          </p>
        </Panel>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Button onClick={generate} disabled={busy || !voiceId || configured === false}>
          {busy ? "Working…" : `Generate ${script.scenes.length} lines`}
        </Button>
        <Button variant="ghost" onClick={captionsOnly}>
          Skip voiceover (captions only)
        </Button>
        {voice ? <Pill tone="good">Take saved · {voice.total}s</Pill> : null}
      </div>

      {error ? <p className="text-[12px] leading-relaxed text-amber-300/80">{error}</p> : null}

      {voice && voice.clips.length ? (
        <Panel className="px-4 py-2">
          <Row label="Voice">{voice.voiceName}</Row>
          <Row label="Settings">
            <span className="font-mono text-[11px] text-white/50">
              stab {voice.settings.stability} · sim {voice.settings.similarity_boost} · style{" "}
              {voice.settings.style} · speed {voice.settings.speed}
            </span>
          </Row>
          {voice.clips.map((clip) => (
            <Row key={clip.n} label={`Scene ${clip.n}`}>
              <span className="font-mono text-[11px] text-white/55">
                {clip.start.toFixed(2)}s → {clip.end.toFixed(2)}s ({clip.dur.toFixed(2)}s)
              </span>
            </Row>
          ))}
          <Row label="Total">{voice.total}s</Row>
        </Panel>
      ) : null}

      <div className="flex flex-wrap items-center gap-3">
        <Button onClick={onNext} disabled={!voice}>
          Build the animation
        </Button>
        <span className="text-[11px] text-white/30">
          {voice ? `Saved to pipeline/${brief.project}/voice.json` : "Record or skip the voice first."}
        </span>
      </div>
    </div>
  );
}
