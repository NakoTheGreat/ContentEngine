import { drawFrame, DEFAULT_FONTS, type Fonts } from "@/lib/render/engine";
import type { Script, Timeline } from "@/lib/pipeline/types";

export type RecordedFile = {
  blob: Blob;
  mime: string;
  ext: "mp4" | "webm";
  width: number;
  height: number;
  duration: number;
};

export type RenderOptions = {
  canvas: HTMLCanvasElement;
  script: Script;
  timeline: Timeline;
  /** Decoded voiceover buffers aligned to timeline.scenes; nulls are silent. */
  buffers: Array<AudioBuffer | null>;
  music: boolean;
  width: number;
  height: number;
  fps?: number;
  onProgress?: (fraction: number) => void;
  signal?: { cancelled: boolean };
};

/** Prefer MP4 (works in Chromium 130+), fall back to WebM. */
export function pickMime(): { mime: string; ext: "mp4" | "webm" } {
  const candidates: Array<{ mime: string; ext: "mp4" | "webm" }> = [
    { mime: "video/mp4;codecs=avc1.42001E,mp4a.40.2", ext: "mp4" },
    { mime: "video/mp4;codecs=avc1.4D401F,mp4a.40.2", ext: "mp4" },
    { mime: "video/webm;codecs=vp9,opus", ext: "webm" },
    { mime: "video/webm;codecs=vp8,opus", ext: "webm" },
    { mime: "video/webm", ext: "webm" },
  ];
  for (const candidate of candidates) {
    if (typeof MediaRecorder !== "undefined" && MediaRecorder.isTypeSupported(candidate.mime)) {
      return candidate;
    }
  }
  return { mime: "video/webm", ext: "webm" };
}

export async function decodeVoices(
  ctx: BaseAudioContext,
  urls: string[],
): Promise<Array<AudioBuffer | null>> {
  const buffers: Array<AudioBuffer | null> = [];
  for (const url of urls) {
    try {
      const response = await fetch(url);
      if (!response.ok) {
        buffers.push(null);
        continue;
      }
      const data = await response.arrayBuffer();
      buffers.push(await ctx.decodeAudioData(data));
    } catch {
      // A missing clip just means that scene runs silent.
      buffers.push(null);
    }
  }
  return buffers;
}

export function peakLevel(buffers: AudioBuffer[]): number {
  let peak = 0;
  for (const buffer of buffers) {
    for (let channel = 0; channel < buffer.numberOfChannels; channel++) {
      const data = buffer.getChannelData(channel);
      for (let i = 0; i < data.length; i += 32) {
        const abs = Math.abs(data[i]);
        if (abs > peak) peak = abs;
      }
    }
  }
  return Math.round(peak * 1000) / 1000;
}

/** A quiet procedural bed so the mix is never bare, with a fade in and out. */
function scheduleMusic(ctx: AudioContext, destination: AudioNode, total: number, startAt: number) {
  const master = ctx.createGain();
  master.gain.setValueAtTime(0.0001, startAt);
  master.gain.exponentialRampToValueAtTime(0.06, startAt + 1.2);
  master.gain.setValueAtTime(0.06, startAt + Math.max(1.4, total - 1.6));
  master.gain.exponentialRampToValueAtTime(0.0001, startAt + total + 0.3);

  const filter = ctx.createBiquadFilter();
  filter.type = "lowpass";
  filter.frequency.value = 1400;
  filter.Q.value = 0.6;

  filter.connect(master);
  master.connect(destination);

  // A minor ninth arpeggio: A, C, E, B.
  const notes = [220, 261.63, 329.63, 493.88, 329.63, 261.63];
  const step = 0.42;
  const loopLength = notes.length * step;

  for (let time = 0; time < total; time += loopLength) {
    notes.forEach((frequency, index) => {
      const at = startAt + time + index * step;
      if (at > startAt + total) return;
      const voice = ctx.createOscillator();
      const gain = ctx.createGain();
      voice.type = "triangle";
      voice.frequency.value = frequency / 2;
      gain.gain.setValueAtTime(0.0001, at);
      gain.gain.exponentialRampToValueAtTime(0.5, at + 0.03);
      gain.gain.exponentialRampToValueAtTime(0.0001, at + step * 1.8);
      voice.connect(gain);
      gain.connect(filter);
      voice.start(at);
      voice.stop(at + step * 2);
    });
  }
}

/**
 * Render the animated ad in real time into an MP4 (or WebM).
 * The audio clock drives frame selection, so audio and picture cannot drift.
 */
export async function renderVideo(options: RenderOptions): Promise<RecordedFile> {
  const { canvas, script, timeline, buffers, music, width, height, onProgress, signal } = options;
  const fps = options.fps ?? 30;
  const total = timeline.total;

  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas is not available in this browser.");

  const fonts = DEFAULT_FONTS;
  try {
    await Promise.all([
      document.fonts.load(`400 100px ${fonts.serif}`),
      document.fonts.load(`italic 400 100px ${fonts.serif}`),
      document.fonts.load(`600 44px ${fonts.sans}`),
    ]);
  } catch {
    // System fallbacks are fine.
  }

  const { mime, ext } = pickMime();
  const audioCtx = new AudioContext({ sampleRate: 48000 });
  if (audioCtx.state === "suspended") void audioCtx.resume().catch(() => undefined);

  const stream = canvas.captureStream(fps);
  let destination: MediaStreamAudioDestinationNode | null = null;

  if (buffers.length || music) {
    destination = audioCtx.createMediaStreamDestination();
    destination.stream.getAudioTracks().forEach((track) => stream.addTrack(track));
    if (music) scheduleMusic(audioCtx, destination, total, audioCtx.currentTime + 0.25);
    timeline.scenes.forEach((entry, index) => {
      const clip = buffers[index];
      if (!clip) return;
      const source = audioCtx.createBufferSource();
      const gain = audioCtx.createGain();
      gain.gain.value = 1;
      source.buffer = clip;
      source.connect(gain);
      gain.connect(destination as MediaStreamAudioDestinationNode);
      source.start(audioCtx.currentTime + 0.25 + entry.start);
    });
  }

  const recorder = new MediaRecorder(stream, {
    mimeType: mime,
    videoBitsPerSecond: 8_000_000,
    audioBitsPerSecond: 128_000,
  });

  const chunks: BlobPart[] = [];
  const recorded = new Promise<Blob>((resolve, reject) => {
    recorder.ondataavailable = (event) => {
      if (event.data.size) chunks.push(event.data);
    };
    recorder.onerror = () => reject(new Error("The browser stopped the recording."));
    recorder.onstop = () => resolve(new Blob(chunks, { type: mime }));
  });

  const clockStart = performance.now();
  recorder.start(250);

  // Drawing stops in a background tab, so the render must not run hidden.
  const hiddenMessage =
    "Keep this tab visible while the ad renders — browsers pause animation frames in background tabs.";
  let aborted = document.visibilityState !== "visible";
  let endRender: (() => void) | null = null;

  const watchdog = window.setInterval(() => {
    if (document.visibilityState !== "visible") {
      aborted = true;
      endRender?.();
    }
  }, 400);

  if (!aborted) {
    await new Promise<void>((resolve) => {
      endRender = resolve;
      const tick = () => {
        if (signal?.cancelled || aborted) {
          resolve();
          return;
        }
        const elapsed = Math.max(0, (performance.now() - clockStart) / 1000);
        drawFrame(ctx, { w: width, h: height, script, timeline, t: elapsed, fonts });
        onProgress?.(Math.min(1, elapsed / total));
        if (elapsed >= total + 0.05) {
          resolve();
          return;
        }
        requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    });
  }

  window.clearInterval(watchdog);
  await new Promise((resolve) => setTimeout(resolve, 220));
  if (recorder.state !== "inactive") recorder.stop();
  const blob = await recorded.catch(() => new Blob());

  stream.getTracks().forEach((track) => track.stop());
  await audioCtx.close();

  if (aborted) throw new Error(hiddenMessage);
  if (!blob.size) throw new Error("The recorder produced an empty file. Try a smaller resolution.");

  return { blob, mime, ext, width, height, duration: Math.round(total * 10) / 10 };
}

