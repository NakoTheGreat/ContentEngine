import type { Scene, Script, Timeline } from "@/lib/pipeline/types";
import { clamp01, paintGraphic, roundRectPath, type Palette } from "./graphics";

export type Fonts = { serif: string; sans: string };

export const DEFAULT_FONTS: Fonts = {
  serif: '"Instrument Serif", Georgia, "Times New Roman", serif',
  sans: '"Inter", "Helvetica Neue", Arial, sans-serif',
};

/** Logical render size. Every number below is in these units. */
export const STAGE = { width: 1080, height: 1920 };

export const SAFE = { top: 0.17, bottom: 0.78 };

export const THEME: Record<"dark" | "light", Palette> = {
  dark: {
    bg1: "#171311",
    bg2: "#070605",
    ink: "#f4efe7",
    muted: "rgba(244,239,231,0.48)",
    accent: "#c89a62",
    line: "rgba(244,239,231,0.14)",
  },
  light: {
    bg1: "#f8f4ed",
    bg2: "#e6ddcd",
    ink: "#17130f",
    muted: "rgba(23,19,15,0.52)",
    accent: "#a9743f",
    line: "rgba(23,19,15,0.14)",
  },
};

const clamp01Local = clamp01;
const easeOut = (x: number) => 1 - Math.pow(1 - clamp01Local(x), 3);
const easeInOut = (x: number) => {
  const t = clamp01Local(x);
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
};

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

/** Backgrounds never change inside a scene, so bake them once per theme/size. */
const backgroundCache = new Map<string, HTMLCanvasElement>();
const layoutCache = new Map<string, SceneLayout>();

function backgroundFor(theme: "dark" | "light", W: number, H: number): HTMLCanvasElement | null {
  if (typeof document === "undefined") return null;
  const key = `${theme}|${W}|${H}`;
  const hit = backgroundCache.get(key);
  if (hit) return hit;

  const canvas = document.createElement("canvas");
  canvas.width = Math.round(W);
  canvas.height = Math.round(H);
  const bake = canvas.getContext("2d");
  if (!bake) return null;

  const palette = THEME[theme];
  const gradient = bake.createLinearGradient(0, 0, W * 0.4, H);
  gradient.addColorStop(0, palette.bg1);
  gradient.addColorStop(1, palette.bg2);
  bake.fillStyle = gradient;
  bake.fillRect(0, 0, W, H);

  const glow = bake.createRadialGradient(W / 2, H * 0.56, 0, W / 2, H * 0.56, W * 0.6);
  glow.addColorStop(0, rgba(palette.accent, theme === "dark" ? 0.15 : 0.09));
  glow.addColorStop(1, "rgba(0,0,0,0)");
  bake.fillStyle = glow;
  bake.fillRect(0, 0, W, H);

  bake.globalAlpha = 0.65;
  bake.strokeStyle = palette.line;
  bake.lineWidth = 2;
  roundRectPath(bake, W * 0.06, W * 0.06, W * 0.88, H - W * 0.12, 28);
  bake.stroke();

  backgroundCache.set(key, canvas);
  return canvas;
}

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
  const scene = script.scenes[Math.min(index, script.scenes.length - 1)];

  if (k < 1 && index > 0) {
    const prev = script.scenes[index - 1];
    drawScene(ctx, prev, timeline.scenes[index - 1].dur, W, H, fonts, 1);
    drawScene(ctx, scene, local, W, H, fonts, k);
  } else {
    drawScene(ctx, scene, local, W, H, fonts, 1);
  }

  if (opts.guides) drawGuides(ctx, W, H);
  ctx.restore();
}

function drawScene(
  ctx: CanvasRenderingContext2D,
  scene: Scene,
  local: number,
  W: number,
  H: number,
  fonts: Fonts,
  alpha: number,
) {
  const palette = THEME[scene.theme];
  ctx.save();
  ctx.globalAlpha = alpha;

  const background = backgroundFor(scene.theme, W, H);
  if (background) {
    ctx.drawImage(background, 0, 0, W, H);
  } else {
    ctx.fillStyle = palette.bg2;
    ctx.fillRect(0, 0, W, H);
  }

  const layout = layoutFor(ctx, scene, fonts, W, H);

  paintGraphic(
    ctx,
    scene.graphic,
    clamp01((local - 0.1) / 1.5),
    palette,
    layout.graphic.cx,
    layout.graphic.cy,
    layout.graphic.r,
  );

  // Kicker.
  const kickerText = (
    scene.role === "hook" ? "Hook" : scene.role === "cta" ? "Your move" : scene.visual.split(/[,.:]/)[0]
  ).toUpperCase();
  const kickerAlpha = easeOut(local / 0.45) * alpha;
  ctx.globalAlpha = kickerAlpha;
  ctx.fillStyle = palette.accent;
  ctx.beginPath();
  ctx.arc(W * 0.09 + 6, layout.kickerY - 9, 6, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = palette.muted;
  ctx.font = `500 24px ${fonts.sans}`;
  setTracking(ctx, "5px");
  ctx.fillText(kickerText.slice(0, 30), W * 0.09 + 26, layout.kickerY);
  setTracking(ctx, "0px");

  // Headline, word by word.
  const reveal = easeOut((local - 0.06) / 0.85);
  layout.headlineLines.forEach((line, lineIndex) => {
    drawLine(
      ctx,
      words(line),
      W * 0.09,
      layout.headlineY + lineIndex * layout.headlineLineHeight,
      layout.headlineSize,
      palette,
      fonts.serif,
      alpha,
      reveal * 1.5 - lineIndex * 0.3,
    );
  });

  // Caption block.
  if (layout.captionLines.length) {
    const captionAlpha = easeInOut((local - 0.5) / 0.55) * alpha;
    if (captionAlpha > 0.01) {
      ctx.save();
      ctx.globalAlpha = captionAlpha;
      ctx.fillStyle = palette.accent;
      roundRectPath(ctx, W * 0.09, layout.captionY - 58, 64, 5, 2.5);
      ctx.fill();
      ctx.fillStyle = palette.ink;
      setTracking(ctx, "0px");
      layout.captionLines.forEach((line, i) => {
        ctx.font = `600 ${layout.captionSize}px ${fonts.sans}`;
        ctx.fillText(line, W * 0.09, layout.captionY + i * layout.captionLineHeight);
      });
      ctx.restore();
    }
  }

  ctx.restore();
}

function drawLine(
  ctx: CanvasRenderingContext2D,
  list: Word[],
  x: number,
  baseline: number,
  size: number,
  palette: Palette,
  family: string,
  alpha: number,
  reveal: number,
) {
  let cursor = x;
  ctx.save();
  ctx.textBaseline = "alphabetic";
  ctx.textAlign = "left";
  setTracking(ctx, "0px");

  list.forEach((word, index) => {
    const local = clamp01((reveal - index * 0.06) / 0.55);
    const eased = easeOut(local);
    ctx.globalAlpha = alpha * eased;
    ctx.fillStyle = word.emphasis ? palette.accent : palette.ink;
    ctx.font = `${word.emphasis ? "italic " : ""}400 ${size}px ${family}`;
    ctx.fillText(word.text, cursor, baseline + (1 - eased) * size * 0.26);
    cursor += ctx.measureText(word.text).width;
    ctx.font = `400 ${size}px ${family}`;
    if (index < list.length - 1) cursor += ctx.measureText(" ").width;
  });

  ctx.restore();
}

function setTracking(ctx: CanvasRenderingContext2D, value: string) {
  if ("letterSpacing" in ctx) {
    (ctx as unknown as { letterSpacing: string }).letterSpacing = value;
  }
}

function rgba(hex: string, alpha: number): string {
  const clean = hex.replace("#", "");
  const full =
    clean.length === 3
      ? clean
          .split("")
          .map((c) => c + c)
          .join("")
      : clean;
  const value = parseInt(full, 16);
  return `rgba(${(value >> 16) & 255},${(value >> 8) & 255},${value & 255},${alpha})`;
}

function drawGuides(ctx: CanvasRenderingContext2D, W: number, H: number) {
  ctx.save();
  ctx.setLineDash([14, 14]);
  ctx.strokeStyle = "rgba(200,154,98,0.5)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(0, H * SAFE.top);
  ctx.lineTo(W, H * SAFE.top);
  ctx.moveTo(0, H * SAFE.bottom);
  ctx.lineTo(W, H * SAFE.bottom);
  ctx.stroke();
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
