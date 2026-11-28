import type { Scene, Script, Timeline } from "@/lib/pipeline/types";
import { GRAPHIC_NAMES } from "./graphics";

export type Fonts = { serif: string; sans: string };

/** No brand typography yet — the structural render uses the OS stack. */
export const DEFAULT_FONTS: Fonts = {
  serif: 'system-ui, -apple-system, "Segoe UI", Arial, sans-serif',
  sans: 'system-ui, -apple-system, "Segoe UI", Arial, sans-serif',
};

const MONO = 'ui-monospace, SFMono-Regular, Menlo, Consolas, "Courier New", monospace';

/**
 * Greyscale scaffolding only: this render shows the mechanism of a scene —
 * what lands where and when. Colour, type and texture come later as real
 * graphics libraries that replace the placeholder slots.
 */
export const STRUCTURE = {
  bg: "#101010",
  ink: "#f3f3f3",
  label: "rgba(255,255,255,0.55)",
  faint: "rgba(255,255,255,0.09)",
  dashed: "rgba(255,255,255,0.18)",
};

/** Logical render size. Every number below is in these units. */
export const STAGE = { width: 1080, height: 1920 };

export const SAFE = { top: 0.17, bottom: 0.78 };

const clamp01Local = (value: number) => (value < 0 ? 0 : value > 1 ? 1 : value);
const easeOut = (x: number) => 1 - Math.pow(1 - clamp01Local(x), 3);

/** Master timeline: real voiceover timestamps when available, estimates otherwise. */
export function buildTimeline(
  script: Script,
  voice?: { clips: Array<{ n: number; start: number; end: number; dur: number; url: string }> } | null,
): Timeline {
  if (voice && voice.clips.length) {
    const scenes = voice.clips.map((clip) => ({
      n: clip.n,
      start: clip.start,
      end: clip.end,
      dur: clip.dur,
      audioUrl: clip.url,
    }));
    const total = Math.max(
      script.total,
      scenes.reduce((max, entry) => Math.max(max, entry.end), 0),
    );
    return { scenes, total: Math.round(total * 100) / 100 };
  }

  let cursor = 0;
  const scenes = script.scenes.map((scene) => {
    const start = Math.round(cursor * 100) / 100;
    cursor += scene.dur;
    return {
      n: scene.n,
      start,
      end: Math.round(cursor * 100) / 100,
      dur: scene.dur,
    };
  });
  return { scenes, total: Math.round(cursor * 100) / 100 };
}

export function sceneAt(timeline: Timeline, t: number) {
  const scenes = timeline.scenes;
  if (!scenes.length) return { index: 0, local: 0, k: 1 };
  let index = scenes.findIndex((entry) => t >= entry.start && t < entry.end);
  if (index < 0) index = t < scenes[0].start ? 0 : scenes.length - 1;
  const local = Math.max(0, t - scenes[index].start);
  return { index, local, k: easeOut(local / 0.32) };
}

type Word = { text: string; emphasis: boolean };

function words(line: string): Word[] {
  return line
    .split(/\s+/)
    .filter(Boolean)
    .map((token) => {
      const emphasis = token.startsWith("*") && token.endsWith("*") && token.length > 2;
      return { text: emphasis ? token.slice(1, -1) : token.replace(/\*/g, ""), emphasis };
    });
}

function wrapWords(
  ctx: CanvasRenderingContext2D,
  list: Word[],
  maxWidth: number,
  fontFor: (word: Word) => string,
): Word[][] {
  const lines: Word[][] = [];
  let current: Word[] = [];
  let width = 0;

  for (const word of list) {
    ctx.font = fontFor(word);
    const measured = ctx.measureText(word.text).width;
    ctx.font = fontFor({ text: " ", emphasis: false });
    const space = current.length ? ctx.measureText(" ").width : 0;
    if (current.length && width + space + measured > maxWidth) {
      lines.push(current);
      current = [word];
      width = measured;
    } else {
      current.push(word);
      width += space + measured;
    }
  }
  if (current.length) lines.push(current);
  return lines;
}

function wrapMono(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
  font: string,
): string[] {
  ctx.save();
  ctx.font = font;
  const lines: string[] = [];
  let line = "";
  for (const token of text.split(/\s+/).filter(Boolean)) {
    const next = line ? `${line} ${token}` : token;
    if (line && ctx.measureText(next).width > maxWidth) {
      lines.push(line);
      line = token;
    } else {
      line = next;
    }
  }
  if (line) lines.push(line);
  ctx.restore();
  return lines;
}

export type SceneLayout = {
  kickerY: number;
  headlineY: number;
  headlineSize: number;
  headlineLineHeight: number;
  headlineLines: string[];
  graphic: { cx: number; cy: number; r: number };
  captionY: number;
  captionSize: number;
  captionLineHeight: number;
  captionLines: string[];
  bottom: number;
};

export function layoutScene(
  ctx: CanvasRenderingContext2D,
  scene: Scene,
  fonts: Fonts,
  W = STAGE.width,
  H = STAGE.height,
): SceneLayout {
  const pad = W * 0.09;
  const maxWidth = W - pad * 2;
  const text = scene.text || "";
  const size = text.length > 44 ? 92 : text.length > 26 ? 104 : 118;
  const serifFont = (word: Word) =>
    `${word.emphasis ? "italic " : ""}400 ${size}px ${fonts.serif}`;

  const headlineLines = wrapWords(ctx, words(text), maxWidth, serifFont).map((line) =>
    line.map((w) => (w.emphasis ? `*${w.text}*` : w.text)).join(" "),
  );

  const captionSize = 44;
  const sanCaption = `600 ${captionSize}px ${fonts.sans}`;
  const captionLines =
    scene.role === "cta"
      ? []
      : wrapWords(ctx, words(text), maxWidth * 0.9, () => sanCaption).map((line) =>
          line.map((w) => w.text).join(" "),
        );

  const captionLineHeight = captionSize * 1.3;
  const captionY = H * 0.7;

  const headlineLineHeight = size * 1.06;
  const headlineY = H * 0.31;

  const bottom = Math.max(
    headlineY + headlineLines.length * headlineLineHeight,
    captionY + (captionLines.length ? captionLines.length * captionLineHeight : 0),
  );

  return {
    kickerY: H * SAFE.top,
    headlineY,
    headlineSize: size,
    headlineLineHeight,
    headlineLines,
    graphic: { cx: W / 2, cy: H * 0.565, r: Math.min(W * 0.35, H * 0.17) },
    captionY,
    captionSize,
    captionLineHeight,
    captionLines,
    bottom,
  };
}

/** Layouts only change when the scene text or the size does. */
const layoutCache = new Map<string, SceneLayout>();

function layoutFor(
  ctx: CanvasRenderingContext2D,
  scene: Scene,
  fonts: Fonts,
  W: number,
  H: number,
): SceneLayout {
  const key = `${scene.n}|${scene.text}|${scene.role}|${scene.visual}|${W}|${H}|${fonts.serif}`;
  const hit = layoutCache.get(key);
  if (hit) return hit;
  const value = layoutScene(ctx, scene, fonts, W, H);
  if (layoutCache.size > 240) layoutCache.clear();
  layoutCache.set(key, value);
  return value;
}

export type FrameOptions = {
  w: number;
  h: number;
  script: Script;
  timeline: Timeline;
  t: number;
  fonts?: Fonts;
  guides?: boolean;
};

export function drawFrame(ctx: CanvasRenderingContext2D, opts: FrameOptions) {
  const { w, h, script, timeline, t } = opts;
  const fonts = opts.fonts ?? DEFAULT_FONTS;
  const scale = w / STAGE.width;
  const H = h / scale;
  const W = STAGE.width;

  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.scale(scale, scale);
  ctx.clearRect(0, 0, W, H);

  const { index, local, k } = sceneAt(timeline, t);
  const safeIndex = Math.min(index, script.scenes.length - 1);
  const scene = script.scenes[safeIndex];

  const frame = { script, timeline, W, H, fonts, guides: Boolean(opts.guides), t };

  if (k < 1 && index > 0) {
    drawScene(ctx, { ...frame, scene: script.scenes[index - 1], index: index - 1, local: 0, alpha: 1 });
    drawScene(ctx, { ...frame, scene, index: safeIndex, local, alpha: k });
  } else {
    drawScene(ctx, { ...frame, scene, index: safeIndex, local, alpha: 1 });
  }

  ctx.restore();
}

type SceneFrame = {
  scene: Scene;
  index: number;
  local: number;
  alpha: number;
  script: Script;
  timeline: Timeline;
  W: number;
  H: number;
  fonts: Fonts;
  guides: boolean;
  t: number;
};

/** One scene, drawn as boxes and labels: the shape of the cut, not the look. */
function drawScene(ctx: CanvasRenderingContext2D, frame: SceneFrame) {
  const { scene, index, local, alpha, timeline, W, H, fonts, guides } = frame;
  const pad = W * 0.09;
  const inner = W - pad * 2;
  const total = timeline.scenes.length || frame.script.scenes.length;
  const dur = timeline.scenes[index]?.dur ?? scene.dur;

  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = STRUCTURE.bg;
  ctx.fillRect(0, 0, W, H);

  // Frame edge.
  ctx.strokeStyle = STRUCTURE.faint;
  ctx.lineWidth = 2;
  ctx.strokeRect(pad, pad, inner, H - pad * 2);

  drawSafeArea(ctx, W, H, guides);

  const layout = layoutFor(ctx, scene, fonts, W, H);
  ctx.textBaseline = "alphabetic";

  // Scene header: which beat this is, how long it holds.
  ctx.font = `500 24px ${MONO}`;
  ctx.fillStyle = STRUCTURE.label;
  ctx.textAlign = "left";
  setTracking(ctx, "4px");
  ctx.fillText(`SCENE ${scene.n}/${total} · ${scene.role.toUpperCase()}`, pad, layout.kickerY - 40);
  ctx.textAlign = "right";
  ctx.fillText(`${dur.toFixed(1)}s`, W - pad, layout.kickerY - 40);
  setTracking(ctx, "0px");

  // Headline slot.
  const size = layout.headlineSize;
  const lineHeight = layout.headlineLineHeight;
  const boxTop = layout.headlineY - size * 0.92;
  const boxHeight = lineHeight * layout.headlineLines.length;
  slot(ctx, pad, boxTop, inner, boxHeight, "HEADLINE");

  ctx.fillStyle = STRUCTURE.ink;
  ctx.textAlign = "left";
  layout.headlineLines.forEach((line, lineIndex) => {
    let cursor = pad;
    ctx.font = `400 ${size}px ${fonts.serif}`;
    words(line).forEach((word, wordIndex, list) => {
      ctx.fillText(word.text, cursor, layout.headlineY + lineIndex * lineHeight);
      cursor += ctx.measureText(word.text).width;
      if (wordIndex < list.length - 1) cursor += ctx.measureText(" ").width;
    });
  });

  // Graphic slot: the placeholder a real graphics library fills.
  const slotW = W * 0.58;
  const slotH = W * 0.38;
  const slotX = layout.graphic.cx - slotW / 2;
  const slotY = layout.graphic.cy - slotH / 2;
  const name = GRAPHIC_NAMES[scene.graphic] ?? `library ${scene.graphic}`;
  slot(ctx, slotX, slotY, slotW, slotH, "GRAPHIC");
  ctx.textAlign = "center";
  ctx.fillStyle = STRUCTURE.label;
  ctx.font = `500 30px ${MONO}`;
  setTracking(ctx, "3px");
  ctx.fillText(`#${scene.graphic} ${name.toUpperCase()}`, layout.graphic.cx, layout.graphic.cy);
  setTracking(ctx, "0px");
  ctx.font = `400 20px ${MONO}`;
  ctx.fillStyle = "rgba(255,255,255,0.32)";
  ctx.fillText("animated painter goes here", layout.graphic.cx, layout.graphic.cy + 46);

  // Caption slot: what the voiceover puts on screen.
  const capFont = `400 28px ${MONO}`;
  const capLines = wrapMono(ctx, scene.vo, inner - 32, capFont).slice(0, 2);
  const capTop = layout.captionY - 54;
  const capHeight = Math.max(96, capLines.length * 38 + 46);
  slot(ctx, pad, capTop, inner, capHeight, "CAPTION");
  ctx.textAlign = "left";
  ctx.font = capFont;
  ctx.fillStyle = layout.captionLines.length ? "rgba(255,255,255,0.78)" : "rgba(255,255,255,0.3)";
  if (capLines.length) {
    capLines.forEach((line, i) => {
      ctx.fillText(line, pad + 16, capTop + 48 + i * 38);
    });
  } else {
    ctx.fillText("spoken only — no caption", pad + 16, capTop + 48);
  }

  // Scene clock and progress.
  const barY = H * 0.945;
  ctx.strokeStyle = STRUCTURE.faint;
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(pad, barY);
  ctx.lineTo(W - pad, barY);
  ctx.stroke();
  ctx.strokeStyle = STRUCTURE.ink;
  ctx.beginPath();
  ctx.moveTo(pad, barY);
  ctx.lineTo(pad + inner * clamp01Local(local / Math.max(dur, 0.01)), barY);
  ctx.stroke();

  ctx.font = `400 20px ${MONO}`;
  ctx.fillStyle = "rgba(255,255,255,0.34)";
  ctx.textAlign = "left";
  ctx.fillText(
    `t ${local.toFixed(1)}s / ${dur.toFixed(1)}s · ${frame.t.toFixed(1)}s of ${timeline.total}s`,
    pad,
    barY + 34,
  );

  ctx.restore();
}

/** Dashed box with a mono label sitting on its top edge. */
function slot(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  label: string,
) {
  ctx.save();
  ctx.setLineDash([12, 10]);
  ctx.strokeStyle = STRUCTURE.dashed;
  ctx.lineWidth = 2;
  ctx.strokeRect(x, y, w, h);
  ctx.setLineDash([]);

  ctx.font = `500 18px ${MONO}`;
  ctx.fillStyle = STRUCTURE.label;
  ctx.textAlign = "left";
  ctx.textBaseline = "alphabetic";
  setTracking(ctx, "4px");
  ctx.fillStyle = STRUCTURE.bg;
  ctx.fillRect(x, y - 13, ctx.measureText(label).width + 20, 26);
  ctx.fillStyle = STRUCTURE.label;
  ctx.fillText(label, x + 10, y + 6);
  setTracking(ctx, "0px");
  ctx.restore();
}

function setTracking(ctx: CanvasRenderingContext2D, value: string) {
  if ("letterSpacing" in ctx) {
    (ctx as unknown as { letterSpacing: string }).letterSpacing = value;
  }
}

function drawSafeArea(ctx: CanvasRenderingContext2D, W: number, H: number, guides: boolean) {
  ctx.save();
  ctx.setLineDash([14, 14]);
  ctx.strokeStyle = STRUCTURE.dashed;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(0, H * SAFE.top);
  ctx.lineTo(W, H * SAFE.top);
  ctx.moveTo(0, H * SAFE.bottom);
  ctx.lineTo(W, H * SAFE.bottom);
  ctx.stroke();
  setTracking(ctx, "3px");

  ctx.font = `500 18px ${MONO}`;
  ctx.fillStyle = "rgba(255,255,255,0.4)";
  ctx.textAlign = "left";
  ctx.fillText("SAFE TOP 17%", 24, H * SAFE.top - 12);
  ctx.fillText("SAFE BOTTOM 78%", 24, H * SAFE.bottom + 28);

  if (guides) {
    ctx.setLineDash([6, 12]);
    ctx.strokeStyle = "rgba(255,255,255,0.12)";
    for (let i = 1; i < 3; i++) {
      ctx.beginPath();
      ctx.moveTo((W * i) / 3, 0);
      ctx.lineTo((W * i) / 3, H);
      ctx.moveTo(0, (H * i) / 3);
      ctx.lineTo(W, (H * i) / 3);
      ctx.stroke();
    }
  }
  ctx.restore();
}

/** QA: no text block may cross into the bottom 22% of the frame. */
export function checkLayout(
  ctx: CanvasRenderingContext2D,
  script: Script,
  fonts: Fonts = DEFAULT_FONTS,
  W = STAGE.width,
  H = STAGE.height,
) {
  const limit = Math.round(H * SAFE.bottom);
  return script.scenes.map((scene) => {
    const layout = layoutScene(ctx, scene, fonts, W, H);
    const bottom = Math.round(layout.bottom);
    return { scene: scene.n, bottom, limit, pass: bottom <= limit };
  });
}
