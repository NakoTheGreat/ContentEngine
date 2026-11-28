"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { decodeVoices, peakLevel, pickMime, renderVideo } from "@/lib/audio/record";
import { buildTimeline, checkLayout } from "@/lib/render/engine";
import type { Brief, ExportRecord, QaCheck, Script, Voice } from "@/lib/pipeline/types";
import { Button, Label, Panel, Pill, SectionTitle } from "./ui";

type Props = {
  brief: Brief;
  script: Script;
  voice: Voice;
  renderToken: number;
  onExported: (record: ExportRecord) => void;
  onRevise: (instruction: string) => void;
  notify: (message: string) => void;
};

export function ExportTab({ brief, script, voice, renderToken, onExported, onRevise, notify }: Props) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [quality, setQuality] = useState<"1080" | "720">("1080");
  const [music, setMusic] = useState(true);
  const [rendering, setRendering] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [file, setFile] = useState<{ url: string; name: string; size: number; mime: string } | null>(null);
  const [revision, setRevision] = useState("");
  const [fontsReady, setFontsReady] = useState(false);
  const cancelRef = useRef({ cancelled: false });

  const timeline = useMemo(() => buildTimeline(script, voice), [script, voice]);
  const codec = useMemo(() => (typeof window === "undefined" ? { mime: "", ext: "mp4" as const } : pickMime()), []);

  useEffect(() => {
    if (typeof document === "undefined") return;
    document.fonts
      .load('400 100px "Instrument Serif", Georgia, serif')
      .then(() => setFontsReady(true))
      .catch(() => setFontsReady(true));
  }, []);

  const layout = useMemo(() => {
    if (typeof document === "undefined") return [];
    const canvas = document.createElement("canvas");
    canvas.width = 1080;
    canvas.height = 1920;
    const ctx = canvas.getContext("2d");
    if (!ctx) return [];
    return checkLayout(ctx, script);
    // fontsReady re-measures once the display face is loaded.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [script, fontsReady]);

  const qa: QaCheck[] = useMemo(() => {
    const hook = script.scenes[0];
    const clear = layout.filter((item) => item.pass).length;
    return [
      {
        label: "Hook lands inside 2 seconds",
        pass: hook.dur <= 2.6,
        detail: `First beat holds ${hook.dur}s before the cut`,
      },
      {
        label: "Length on target",
        pass: Math.abs(timeline.total - brief.length) <= 3,
        detail: `${timeline.total}s against a ${brief.length}s target`,
      },
      {
        label: "Nothing in the bottom 22%",
        pass: layout.length > 0 && clear === layout.length,
        detail: layout.length ? `${clear}/${layout.length} scenes clear of the safe line` : "measuring…",
      },
      {
        label: "Captions timed to the audio",
        pass: voice.mode === "elevenlabs" && voice.clips.length === script.scenes.length,
        detail:
          voice.mode === "elevenlabs"
            ? `${voice.clips.length} clips keyed to measured durations`
            : "Captions-only cut — no audio to key to",
      },
      {
        label: "Voice consistent across scenes",
        pass: voice.mode !== "elevenlabs" || new Set(voice.clips.map(() => voice.voiceId)).size <= 1,
        detail: voice.mode === "elevenlabs" ? `${voice.voiceName}, one take` : "No voiceover in this cut",
      },
    ];
  }, [brief.length, layout, script.scenes, timeline.total, voice]);

  const render = async () => {
    if (rendering) return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    setRendering(true);
    setProgress(0);
    setError(null);
    cancelRef.current = { cancelled: false };

    try {
      const [width, height] = quality === "1080" ? [1080, 1920] : [720, 1280];

      let buffers: Array<AudioBuffer | null> = [];
      if (voice.clips.length) {
        const ctx = new AudioContext();
        // decodeAudioData works while suspended; resume only matters for playback.
        buffers = await decodeVoices(ctx, voice.clips.map((clip) => clip.url));
        await ctx.close();
        const peak = peakLevel(buffers.filter((buffer): buffer is AudioBuffer => Boolean(buffer)));
        if (peak < 0.01) notify("The voice clips measured silent — check the ElevenLabs take.");
      }

      const result = await renderVideo({
        canvas,
        script,
        timeline,
        buffers,
        music,
        width,
        height,
        signal: cancelRef.current,
        onProgress: setProgress,
      });

      const name = `${brief.project}.${result.ext}`;
      const url = URL.createObjectURL(result.blob);
      setFile({ url, name, size: result.blob.size, mime: result.mime });

      const record: ExportRecord = {
        file: name,
        mime: result.mime,
        bytes: result.blob.size,
        width: result.width,
        height: result.height,
        duration: result.duration,
        voiceMode: voice.mode,
        createdAt: new Date().toISOString(),
        qa,
      };
      onExported(record);

      const link = document.createElement("a");
      link.href = url;
      link.download = name;
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Render failed.");
    } finally {
      setRendering(false);
    }
  };

  // The Lead AI's "render it" action bumps this token.
  const lastToken = useRef(renderToken);
  useEffect(() => {
    if (renderToken !== lastToken.current) {
      lastToken.current = renderToken;
      void render();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [renderToken]);

  const [width, height] = quality === "1080" ? [1080, 1920] : [720, 1280];
  const seconds = Math.max(1, Math.round(timeline.total + 2));

  return (
    <div className="space-y-6">
      <div>
        <SectionTitle hint="Stage 7 + 8">Assembly and delivery</SectionTitle>
        <p className="mt-2 max-w-xl text-[13px] leading-relaxed text-white/45">
          The cut is rendered in this browser at {width}×{height} and muxed to{" "}
          {codec.ext === "mp4" ? "MP4 (H.264 + AAC)" : "WebM (this browser has no MP4 encoder)"}. QA runs
          first; anything that fails is listed before you download.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[240px_1fr]">
        <div>
          <canvas
            ref={canvasRef}
            className="block w-full rounded-[18px] border border-white/12 bg-black"
            style={{ aspectRatio: "9 / 16" }}
          />
          <p className="mt-2 text-center text-[10px] uppercase tracking-[0.16em] text-white/25">
            render surface
          </p>
        </div>

        <div className="space-y-4">
          <Panel className="p-4">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <Label>Quality</Label>
                <div className="mt-1 flex gap-2">
                  {(["1080", "720"] as const).map((value) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setQuality(value)}
                      className={`rounded-full border px-3 py-1.5 text-[12px] transition ${
                        quality === value
                          ? "border-[#c89a62]/60 bg-[#c89a62]/10 text-[#f4efe7]"
                          : "border-white/12 text-white/50 hover:border-white/30"
                      }`}
                    >
                      {value === "1080" ? "1080×1920" : "720×1280"}
                    </button>
                  ))}
                </div>
              </div>
              <label className="flex items-center gap-2 text-[12px] text-white/55">
                <input
                  type="checkbox"
                  checked={music}
                  onChange={(event) => setMusic(event.target.checked)}
                  className="h-4 w-4 accent-[#c89a62]"
                />
                Music bed
              </label>
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-3">
              <Button onClick={render} disabled={rendering}>
                {rendering ? `Rendering ${Math.round(progress * 100)}%` : "Render the ad"}
              </Button>
              {rendering ? (
                <Button
                  variant="ghost"
                  onClick={() => {
                    cancelRef.current.cancelled = true;
                  }}
                >
                  Cancel
                </Button>
              ) : null}
              <span className="text-[11px] text-white/30">
                ~{seconds}s · {voice.mode === "elevenlabs" ? "with voice" : "captions only"}
              </span>
            </div>

            {rendering ? (
              <div className="mt-3 h-1 overflow-hidden rounded-full bg-white/10">
                <div
                  className="h-full bg-[#c89a62] transition-[width] duration-150"
                  style={{ width: `${Math.round(progress * 100)}%` }}
                />
              </div>
            ) : null}

            {error ? <p className="mt-3 text-[12px] text-amber-300/80">{error}</p> : null}

            {file ? (
              <div className="mt-4 flex flex-wrap items-center gap-3 border-t border-white/10 pt-3">
                <Pill tone="good">{file.mime.split(";")[0]}</Pill>
                <span className="text-[12px] text-white/60">{file.name}</span>
                <span className="text-[11px] text-white/30">{(file.size / 1024 / 1024).toFixed(1)} MB</span>
                <a
                  href={file.url}
                  download={file.name}
                  className="rounded-full bg-[#c89a62] px-4 py-1.5 text-[12px] font-medium text-[#161310] transition hover:bg-[#d9ab73]"
                >
                  Download
                </a>
              </div>
            ) : null}
          </Panel>

          <Panel className="p-4">
            <div className="flex items-center justify-between">
              <Label>QA gate</Label>
              <Pill tone={qa.every((item) => item.pass) ? "good" : "accent"}>
                {qa.filter((item) => item.pass).length}/{qa.length} passing
              </Pill>
            </div>
            <ul className="mt-3 space-y-2">
              {qa.map((item) => (
                <li key={item.label} className="flex items-start gap-2 text-[12px]">
                  <span className={item.pass ? "text-emerald-300/90" : "text-amber-300/90"}>
                    {item.pass ? "✓" : "!"}
                  </span>
                  <span className="text-white/70">
                    {item.label}
                    <span className="block text-[11px] text-white/30">{item.detail}</span>
                  </span>
                </li>
              ))}
            </ul>
          </Panel>

          <Panel className="p-4">
            <Label>Revision — plain English</Label>
            <p className="mt-1 text-[12px] text-white/40">
              Only the affected stages re-run. &quot;Punchier hook&quot; rewrites the script and voice,
              &quot;swap the voice&quot; only re-records.
            </p>
            <div className="mt-2 flex gap-2">
              <input
                value={revision}
                onChange={(event) => setRevision(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" && revision.trim()) {
                    onRevise(revision.trim());
                    setRevision("");
                  }
                }}
                placeholder="make the hook punchier"
                className="flex-1 rounded-xl border border-white/10 bg-black/25 px-3 py-2 text-[13px] text-[#f4efe7] outline-none placeholder:text-white/25 focus:border-[#c89a62]/60"
              />
              <Button
                variant="ghost"
                onClick={() => {
                  if (!revision.trim()) return;
                  onRevise(revision.trim());
                  setRevision("");
                }}
              >
                Apply
              </Button>
            </div>
          </Panel>
        </div>
      </div>
    </div>
  );
}
