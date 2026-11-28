/**
 * Canvas motion-graphics library. Every painter runs inside a 600x600 box
 * centred on the origin, so the caller only has to translate and scale.
 *
 * `p` is the scene's local progress, eased by the caller.
 */

export type Palette = {
  bg1: string;
  bg2: string;
  ink: string;
  muted: string;
  accent: string;
  line: string;
};

const TAU = Math.PI * 2;

/** Human names for the painters below, used by the structural render slots. */
export const GRAPHIC_NAMES = [
  "Bloom",
  "Frames",
  "Grid",
  "Bars",
  "Burst",
  "Ribbon",
  "Type",
] as const;

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  const radius = Math.min(r, Math.abs(w) / 2, Math.abs(h) / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + w - radius, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + radius);
  ctx.lineTo(x + w, y + h - radius);
  ctx.quadraticCurveTo(x + w, y + h, x + w - radius, y + h);
  ctx.lineTo(x + radius, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
}

const STAR =
  "M0 -196 Q22 -88 130 0 Q22 88 0 196 Q-22 88 -130 0 Q-22 -88 0 -196";

function starPath(ctx: CanvasRenderingContext2D) {
  ctx.beginPath();
  // Build the four-point star from arc-safe quadratic segments.
  const points: Array<[number, number]> = [
    [0, -196],
    [130, 0],
    [0, 196],
    [-130, 0],
  ];
  const control: Array<[number, number]> = [
    [22, -88],
    [88, 22],
    [-22, 88],
    [-88, -22],
  ];
  ctx.moveTo(points[0][0], points[0][1]);
  for (let i = 0; i < points.length; i++) {
    const next = points[(i + 1) % points.length];
    const c = control[i];
    ctx.quadraticCurveTo(c[0], c[1], next[0], next[1]);
  }
  ctx.closePath();
  void STAR;
}

/** 0 — Bloom: concentric rings drawing in around a filled star. */
function bloom(ctx: CanvasRenderingContext2D, p: number, c: Palette) {
  const radii = [196, 258, 320];
  radii.forEach((r, i) => {
    const local = clamp01((p - i * 0.16) / 0.65);
    if (local <= 0) return;
    ctx.strokeStyle = i === 1 ? c.accent : c.muted;
    ctx.globalAlpha *= 1;
    ctx.lineWidth = i === 1 ? 3 : 1.6;
    ctx.beginPath();
    ctx.arc(0, 0, r, -Math.PI / 2, -Math.PI / 2 + TAU * local);
    ctx.stroke();
  });

  for (let i = 0; i < 32; i++) {
    const local = clamp01((p - 0.5 - i * 0.012) / 0.3);
    if (local <= 0) continue;
    const a = (i / 32) * TAU - Math.PI / 2;
    ctx.globalAlpha = local;
    ctx.strokeStyle = c.muted;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(Math.cos(a) * 320, Math.sin(a) * 320);
    ctx.lineTo(Math.cos(a) * 348, Math.sin(a) * 348);
    ctx.stroke();
  }

  const fill = clamp01((p - 0.25) / 0.6);
  ctx.globalAlpha = 1;
  ctx.fillStyle = c.ink;
  ctx.save();
  ctx.scale(0.55 + fill * 0.45, 0.55 + fill * 0.45);
  ctx.globalAlpha = fill;
  starPath(ctx);
  ctx.fill();
  ctx.restore();

  const spin = clamp01((p - 0.35) / 0.65);
  ctx.save();
  ctx.rotate(spin * (Math.PI / 4));
  ctx.globalAlpha = spin;
  ctx.strokeStyle = c.accent;
  ctx.lineWidth = 3;
  ctx.scale(0.56, 0.56);
  starPath(ctx);
  ctx.stroke();
  ctx.restore();
}

/** 1 — Frames: three artboards stacking into place. */
function frames(ctx: CanvasRenderingContext2D, p: number, c: Palette) {
  const cards = [
    { x: -190, y: -140, w: 300, h: 200, r: -6 },
    { x: -90, y: -40, w: 300, h: 200, r: 4 },
    { x: -160, y: 70, w: 300, h: 200, r: -2 },
  ];
  cards.forEach((card, i) => {
    const local = clamp01((p - i * 0.14) / 0.5);
    if (local <= 0) return;
    ctx.save();
    ctx.globalAlpha = local;
    ctx.translate(card.x + card.w / 2, card.y + card.h / 2 + (1 - local) * 40);
    ctx.rotate(((card.r * Math.PI) / 180) * local);
    ctx.translate(-card.w / 2, -card.h / 2);
    ctx.fillStyle = i === 1 ? c.bg2 : c.bg1;
    ctx.strokeStyle = i === 1 ? c.accent : c.line;
    ctx.lineWidth = i === 1 ? 3 : 1.5;
    roundRect(ctx, 0, 0, card.w, card.h, 10);
    ctx.fill();
    ctx.stroke();
    ctx.globalAlpha = local * 0.85;
    ctx.strokeStyle = c.muted;
    ctx.lineWidth = 1.4;
    roundRect(ctx, 22, 22, card.w - 44, 12, 6);
    ctx.stroke();
    roundRect(ctx, 22, 48, (card.w - 44) * 0.62, 10, 5);
    ctx.stroke();
    ctx.restore();
  });
}

/** 2 — Grid: nine thumbnails popping in, then one highlighted. */
function grid(ctx: CanvasRenderingContext2D, p: number, c: Palette) {
  const size = 168;
  const gap = 18;
  const start = -(size * 1.5 + gap);
  for (let row = 0; row < 3; row++) {
    for (let col = 0; col < 3; col++) {
      const i = row * 3 + col;
      const local = clamp01((p - i * 0.06) / 0.42);
      const x = start + col * (size + gap);
      const y = start + row * (size + gap);
      ctx.save();
      ctx.globalAlpha = local;
      const s = 0.82 + local * 0.18;
      ctx.translate(x + size / 2, y + size / 2);
      ctx.scale(s, s);
      ctx.translate(-size / 2, -size / 2);
      const featured = i === 4;
      ctx.fillStyle = featured ? c.accent : c.bg2;
      ctx.globalAlpha = local * (featured ? 0.9 : 0.75);
      roundRect(ctx, 0, 0, size, size, 12);
      ctx.fill();
      ctx.globalAlpha = local * 0.6;
      ctx.strokeStyle = c.line;
      ctx.lineWidth = 1.5;
      ctx.stroke();
      ctx.restore();
    }
  }
}

/** 3 — Bars: a rising chart with a drawn trend line. */
function bars(ctx: CanvasRenderingContext2D, p: number, c: Palette) {
  const base = 210;
  const heights = [120, 168, 140, 224, 286];
  const width = 62;
  const gap = 28;
  const startX = -((heights.length * width + (heights.length - 1) * gap) / 2);

  ctx.strokeStyle = c.line;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(-300, base + 6);
  ctx.lineTo(300, base + 6);
  ctx.stroke();

  const tops: Array<[number, number]> = [];
  heights.forEach((h, i) => {
    const local = clamp01((p - 0.08 - i * 0.1) / 0.45);
    const x = startX + i * (width + gap);
    const height = h * local;
    ctx.globalAlpha = 0.9;
    ctx.fillStyle = i === heights.length - 1 ? c.accent : c.ink;
    roundRect(ctx, x, base - height, width, height, 8);
    ctx.fill();
    tops.push([x + width / 2, base - h * local]);
  });

  const line = clamp01((p - 0.55) / 0.45);
  if (line > 0) {
    ctx.globalAlpha = 1;
    ctx.strokeStyle = c.accent;
    ctx.lineWidth = 4;
    ctx.beginPath();
    const count = Math.max(2, Math.ceil(tops.length * line));
    tops.slice(0, count).forEach(([x, y], i) => {
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.stroke();
  }
}

/** 4 — Burst: rays radiating from a mark. */
function burst(ctx: CanvasRenderingContext2D, p: number, c: Palette, accent = false) {
  for (let i = 0; i < 28; i++) {
    const local = clamp01((p - i * 0.014) / 0.4);
    if (local <= 0) continue;
    const a = (i / 28) * TAU;
    const inner = 150 + (1 - local) * 60;
    const outer = inner + 120 * local;
    ctx.globalAlpha = local * 0.8;
    ctx.strokeStyle = i % 4 === 0 ? (accent ? c.ink : c.accent) : c.muted;
    ctx.lineWidth = i % 4 === 0 ? 4 : 2;
    ctx.beginPath();
    ctx.moveTo(Math.cos(a) * inner, Math.sin(a) * inner);
    ctx.lineTo(Math.cos(a) * outer, Math.sin(a) * outer);
    ctx.stroke();
  }
  const grow = clamp01(p / 0.55);
  ctx.globalAlpha = grow;
  ctx.fillStyle = c.accent;
  ctx.beginPath();
  ctx.arc(0, 0, 96 * grow, 0, TAU);
  ctx.fill();
}

/** 5 — Ribbon: three flowing strokes for the sign-off. */
function ribbon(ctx: CanvasRenderingContext2D, p: number, c: Palette) {
  const lines = [
    { amp: 70, offset: -90, width: 3, color: c.accent },
    { amp: 54, offset: 0, width: 1.6, color: c.muted },
    { amp: 86, offset: 90, width: 1.6, color: c.muted },
  ];

  lines.forEach((line, i) => {
    const local = clamp01((p - i * 0.12) / 0.7);
    if (local <= 0) return;
    ctx.globalAlpha = local;
    ctx.strokeStyle = line.color;
    ctx.lineWidth = line.width;
    ctx.beginPath();
    const steps = 80;
    for (let s = 0; s <= steps * local; s++) {
      const x = -320 + (640 * s) / steps;
      const y =
        line.offset +
        Math.sin((s / steps) * Math.PI * 2 + i * 0.9 + p * 1.4) * line.amp * 0.5;
      if (s === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
  });
}

/** 6 — Type: a specimen with baseline rules. */
function type(ctx: CanvasRenderingContext2D, p: number, c: Palette) {
  const rules = [-160, -40, 120];
  rules.forEach((y, i) => {
    const local = clamp01((p - i * 0.1) / 0.5);
    ctx.globalAlpha = local * 0.45;
    ctx.strokeStyle = i === 1 ? c.accent : c.muted;
    ctx.lineWidth = i === 1 ? 2 : 1.2;
    ctx.beginPath();
    ctx.moveTo(-300, y);
    ctx.lineTo(-300 + 600 * local, y);
    ctx.stroke();
  });

  const reveal = clamp01((p - 0.15) / 0.6);
  ctx.globalAlpha = reveal;
  ctx.fillStyle = c.ink;
  ctx.textAlign = "center";
  ctx.textBaseline = "alphabetic";
  ctx.font = `400 ${220 + reveal * 30}px "Instrument Serif", Georgia, serif`;
  ctx.fillText("Aa", 0, 60);

  ctx.globalAlpha = reveal * 0.8;
  ctx.fillStyle = c.accent;
  ctx.beginPath();
  ctx.arc(150, -96, 14 * reveal, 0, TAU);
  ctx.fill();
}

export const PAINTERS: ReadonlyArray<
  (ctx: CanvasRenderingContext2D, p: number, c: Palette) => void
> = [bloom, frames, grid, bars, burst, ribbon, type];

export function paintGraphic(
  ctx: CanvasRenderingContext2D,
  id: number,
  progress: number,
  palette: Palette,
  cx: number,
  cy: number,
  radius: number,
) {
  const painter = PAINTERS[id] ?? bloom;
  ctx.save();
  ctx.translate(cx, cy);
  ctx.scale(radius / 340, radius / 340);
  painter(ctx, clamp01(progress), palette);
  ctx.restore();
}

export function clamp01(value: number): number {
  return value < 0 ? 0 : value > 1 ? 1 : value;
}

export function roundRectPath(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  roundRect(ctx, x, y, w, h, r);
}
