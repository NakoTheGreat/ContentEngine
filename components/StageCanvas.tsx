"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { buildTimeline, drawFrame, STAGE } from "@/lib/render/engine";
import type { Script, Voice } from "@/lib/pipeline/types";

type Props = {
  script: Script;
  voice?: Voice | null;
  guides?: boolean;
  className?: string;
  /** Called with the playhead position, used by the scene strip. */
  onTime?: (t: number) => void;
};

/** 9:16 canvas player. One renderer, so the preview is the render. */
export function StageCanvas({ script, voice, guides = false, className = "", onTime }: Props) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const audioRef = useRef<AudioContext | null>(null);
  const sourcesRef = useRef<AudioBufferSourceNode[]>([]);
  const buffersRef = useRef<Array<AudioBuffer | null> | null>(null);
  const startRef = useRef(0);
  const rafRef = useRef<number | null>(null);

  const [playing, setPlaying] = useState(false);
  const [time, setTime] = useState(0);

  const timeline = useMemo(() => buildTimeline(script, voice ?? null), [script, voice]);
  const total = timeline.total;

  const draw = useCallback(
    (t: number) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      // 720 wide keeps the preview cheap; the export renders at 1080.
      const width = 720;
      const height = Math.round((width * STAGE.height) / STAGE.width);
      if (canvas.width !== width || canvas.height !== height) {
        canvas.width = width;
        canvas.height = height;
      }
      drawFrame(ctx, { w: canvas.width, h: canvas.height, script, timeline, t, guides });
    },
    [script, timeline, guides],
  );

  // Redraw when paused or when the script/timeline changes.
  useEffect(() => {
    if (!playing) draw(Math.min(time, total));
  }, [draw, playing, time, total]);

  useEffect(() => {
    onTime?.(time);
  }, [time, onTime]);

  const stopSources = useCallback(() => {
    sourcesRef.current.forEach((source) => {
      try {
        source.stop();
      } catch {
        // Already stopped.
      }
    });
    sourcesRef.current = [];
  }, []);

  const loadBuffers = useCallback(async (ctx: AudioContext) => {
    if (buffersRef.current) return buffersRef.current;
    const clips = voice?.clips ?? [];
    const out: Array<AudioBuffer | null> = [];
    for (const clip of clips) {
      try {
        const response = await fetch(clip.url);
        out.push(await ctx.decodeAudioData(await response.arrayBuffer()));
      } catch {
        out.push(null);
      }
    }
    buffersRef.current = out;
    return out;
  }, [voice]);

  const play = useCallback(
    async (from: number) => {
      const ctx = audioRef.current ?? new AudioContext();
      audioRef.current = ctx;
      // Never block on resume: it only resolves after a real user gesture.
      if (ctx.state === "suspended") void ctx.resume().catch(() => undefined);

      stopSources();
      // Frames follow the wall clock; audio is scheduled against its own clock.
      startRef.current = performance.now() / 1000 - from;
      const startAt = ctx.currentTime + 0.08;

      if (voice?.clips.length) {
        const buffers = await loadBuffers(ctx);
        voice.clips.forEach((clip, index) => {
          const buffer = buffers[index];
          if (!buffer) return;
          const offset = Math.max(0, from - clip.start);
          if (offset >= buffer.duration) return;
          const source = ctx.createBufferSource();
          source.buffer = buffer;
          source.connect(ctx.destination);
          source.start(startAt + Math.max(0, clip.start - from), offset);
          sourcesRef.current.push(source);
        });
      }

      setPlaying(true);

      const tick = () => {
        const position = Math.max(0, performance.now() / 1000 - startRef.current);
        if (position >= total) {
          setTime(total);
          setPlaying(false);
          stopSources();
          draw(total - 0.02);
          return;
        }
        setTime(position);
        draw(position);
        rafRef.current = requestAnimationFrame(tick);
      };
      rafRef.current = requestAnimationFrame(tick);
    },
    [draw, loadBuffers, stopSources, total, voice],
  );

  const pause = useCallback(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
    stopSources();
    setPlaying(false);
  }, [stopSources]);

  useEffect(() => {
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      sourcesRef.current.forEach((source) => {
        try {
          source.stop();
        } catch {
          // ignore
        }
      });
      audioRef.current?.close().catch(() => undefined);
    };
  }, []);

  const seek = (next: number) => {
    const clamped = Math.max(0, Math.min(total, next));
    setTime(clamped);
    if (playing) {
      void play(clamped);
    } else {
      draw(clamped);
    }
  };

  const activeScene = timeline.scenes.findIndex((entry) => time >= entry.start && time < entry.end);
  const scene = script.scenes[activeScene >= 0 ? activeScene : script.scenes.length - 1];

  return (
    <div className={className}>
      <div className="relative overflow-hidden rounded-[20px] border border-white/12 bg-black shadow-[0_20px_60px_-25px_rgba(0,0,0,0.9)]">
        <canvas ref={canvasRef} className="block h-auto w-full" style={{ aspectRatio: "9 / 16" }} />
        <button
          type="button"
          onClick={() => (playing ? pause() : void play(time >= total ? 0 : time))}
          className="group absolute inset-0 flex items-end justify-center pb-4 opacity-0 transition hover:opacity-100"
          aria-label={playing ? "Pause preview" : "Play preview"}
        >
          <span className="rounded-full bg-black/70 px-4 py-2 text-[11px] uppercase tracking-[0.2em] text-white backdrop-blur">
            {playing ? "Pause" : "Play"}
          </span>
        </button>
      </div>

      <div className="mt-3 flex items-center gap-3">
        <button
          type="button"
          onClick={() => (playing ? pause() : void play(time >= total ? 0 : time))}
          className="rounded-full border border-white/15 px-3 py-1.5 text-[11px] text-white/70 transition hover:border-white/35 hover:text-white"
        >
          {playing ? "❙❙ Pause" : "▶ Play"}
        </button>
        <input
          type="range"
          min={0}
          max={Math.max(total, 0.1)}
          step={0.01}
          value={time}
          onChange={(event) => seek(Number(event.target.value))}
          className="h-1 flex-1 cursor-pointer appearance-none rounded-full bg-white/15 accent-[#c89a62]"
          aria-label="Scrub preview"
        />
        <span className="w-16 shrink-0 text-right font-mono text-[11px] text-white/45">
          {time.toFixed(1)}s
        </span>
      </div>

      {scene ? (
        <p className="mt-2 line-clamp-1 text-[11px] text-white/35">
          Scene {scene.n} · {scene.visual}
        </p>
      ) : null}
    </div>
  );
}
