/**
 * The graphics library: every illustration is a function that returns SVG
 * markup for a 300x300 viewBox, built only from the motion primitives
 * (draw / fillin / pop / rise / grow / in / slide / spin / pulse / ride / cur).
 *
 * Each primitive reads --d (delay) and --t (duration) from an inline style.
 */

/** Helper: build the inline custom-property style for a primitive. */
const d = (delay: number, dur?: number) =>
  dur === undefined ? `--d:${delay}s` : `--d:${delay}s;--t:${dur}s`;

const round = (n: number) => Math.round(n * 10) / 10;

/** Four-point star, drawn then filled. */
const STAR = "M150 58Q160 134 236 150Q160 166 150 242Q140 166 64 150Q140 134 150 58";
const STAR_SMALL = "M150 104Q155 142 193 150Q155 158 150 196Q145 158 107 150Q145 142 150 104";

/** Opening + closing brand moment. */
export function bloom(): string {
  const rings = [72, 96, 120]
    .map(
      (r, i) =>
        `<circle class="draw A" cx="150" cy="150" r="${r}" pathLength="1" style="${d(
          0.1 + i * 0.15,
          1.5 + i * 0.1,
        )}"/>`,
    )
    .join("");

  let ticks = "";
  for (let i = 0; i < 24; i++) {
    const a = (i / 24) * Math.PI * 2 - Math.PI / 2;
    const x1 = round(150 + Math.cos(a) * 122);
    const y1 = round(150 + Math.sin(a) * 122);
    const x2 = round(150 + Math.cos(a) * 134);
    const y2 = round(150 + Math.sin(a) * 134);
    ticks += `<line class="in M" x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" style="${d(
      0.9 + i * 0.025,
      0.5,
    )}"/>`;
  }

  let dots = "";
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2 - Math.PI / 2;
    const cx = round(150 + Math.cos(a) * 96);
    const cy = round(150 + Math.sin(a) * 96);
    dots += `<g transform="translate(${cx} ${cy})"><circle class="pop fa" r="5" style="${d(
      1 + i * 0.08,
      0.55,
    )}"/></g>`;
  }

  return (
    rings +
    ticks +
    dots +
    `<path class="fillin A" d="${STAR}" pathLength="1" style="${d(0.6, 1.6)}"/>` +
    `<g class="spin"><path class="draw A" d="${STAR_SMALL}" transform="rotate(45 150 150)" pathLength="1" style="${d(
      1,
      1.4,
    )}"/></g>`
  );
}

/** Learning, origin: open book plus code. */
export function bookcode(): string {
  const bars = [
    { y: 62, x: 98, w: 104 },
    { y: 78, x: 98, w: 72 },
    { y: 94, x: 118, w: 86 },
    { y: 110, x: 98, w: 58 },
    { y: 126, x: 118, w: 74 },
  ]
    .map(
      (b, i) =>
        `<rect class="grow fa" x="${b.x}" y="${b.y}" width="${b.w}" height="7" rx="3.5" style="${d(
          0.55 + i * 0.11,
          0.7,
        )}"/>`,
    )
    .join("");

  const bullets = [62, 78, 110]
    .map(
      (y, i) =>
        `<rect class="pop A" x="84" y="${y + 1}" width="6" height="5" rx="1.5" style="${d(
          0.9 + i * 0.11,
          0.4,
        )}"/>`,
    )
    .join("");

  return (
    `<path class="draw F" d="M150 232C124 216 96 214 66 222V146C96 138 124 140 150 156Z" pathLength="1" style="${d(
      0.1,
      1.3,
    )}"/>` +
    `<path class="draw F" d="M150 232C176 216 204 214 234 222V146C204 138 176 140 150 156Z" pathLength="1" style="${d(
      0.25,
      1.3,
    )}"/>` +
    `<line class="draw A" x1="150" y1="156" x2="150" y2="232" pathLength="1" style="${d(0.55, 0.6)}"/>` +
    bars +
    bullets +
    `<rect class="cur A" x="198" y="126" width="2.6" height="8" rx="1.2"/>`
  );
}

/** Built fast: a small platformer. */
export function platformer(): string {
  let blocks = "";
  for (let i = 0; i < 5; i++) {
    blocks += `<rect class="pop fa" x="${60 + i * 38}" y="214" width="30" height="20" rx="4" style="${d(
      0.5 + i * 0.07,
      0.55,
    )}"/>`;
  }

  return (
    `<rect class="draw F" x="46" y="46" width="208" height="200" rx="16" pathLength="1" style="${d(
      0.05,
      1.3,
    )}"/>` +
    `<line class="draw M" x1="46" y1="74" x2="254" y2="74" pathLength="1" style="${d(0.45, 0.6)}"/>` +
    `<rect class="draw A" x="74" y="166" width="54" height="10" rx="5" pathLength="1" style="${d(0.6, 0.7)}"/>` +
    `<rect class="draw A" x="172" y="136" width="56" height="10" rx="5" pathLength="1" style="${d(0.75, 0.7)}"/>` +
    `<g transform="translate(100 150)"><circle class="pop fa" r="8" style="${d(1.1, 0.5)}"/></g>` +
    `<g transform="translate(150 118)"><circle class="pop fa" r="8" style="${d(1.25, 0.5)}"/></g>` +
    `<g transform="translate(204 112)"><circle class="pop fa" r="8" style="${d(1.4, 0.5)}"/></g>` +
    blocks +
    `<g transform="translate(68 100)"><circle class="draw M" r="14" pathLength="1" style="${d(1.5, 1.5)}"/></g>` +
    `<rect class="ride fa" x="-7" y="-7" width="14" height="14" rx="3" style="offset-path:path('M66 204Q104 126 150 166Q196 206 240 116');${d(
      0.5,
      2.4,
    )}"/>`
  );
}

/** A sine path across the frame. */
function sine(amp: number, mid: number, phase: number): string {
  let p = "";
  for (let x = 18; x <= 282; x += 6) {
    const y = mid + amp * Math.sin((x / 282) * Math.PI * 2.2 + phase);
    p += `${p ? "L" : "M"}${x} ${round(y)}`;
  }
  return p;
}

/** Momentum, sound, riding a trend. */
export function wave(): string {
  const p1 = sine(30, 202, 0.2);
  const p2 = sine(26, 216, 1.1);
  return (
    `<path class="draw A" d="${p1}" pathLength="1" style="${d(0.1, 1.7)}"/>` +
    `<path class="draw M" d="${p2}" pathLength="1" style="${d(0.3, 1.7)}"/>` +
    `<circle class="ride fa" r="7" style="offset-path:path('${p1}');${d(0.55, 2.6)}"/>` +
    `<path class="draw A" d="M132 104L116 122L132 140" pathLength="1" style="${d(0.95, 0.55)}"/>` +
    `<line class="draw A" x1="156" y1="98" x2="146" y2="146" pathLength="1" style="${d(1.1, 0.55)}"/>` +
    `<path class="draw A" d="M170 104L186 122L170 140" pathLength="1" style="${d(1.25, 0.55)}"/>`
  );
}

/** Growth, results: a rising chart. */
export function chart(): string {
  const base = 238;
  const xs = [64, 102, 140, 178, 216];
  const heights = [46, 72, 58, 104, 128];
  const w = 24;

  const bars = heights
    .map(
      (h, i) =>
        `<rect class="rise fa" x="${xs[i]}" y="${base - h}" width="${w}" height="${h}" rx="4" style="${d(
          0.2 + i * 0.12,
          0.8,
        )}"/>`,
    )
    .join("");

  const tops = heights.map((h, i) => ({ x: xs[i] + w / 2, y: base - h }));
  const line = tops.map((p, i) => `${i ? "L" : "M"}${p.x} ${p.y}`).join("");
  const dots = tops
    .map(
      (p, i) =>
        `<g transform="translate(${p.x} ${p.y})"><circle class="pop A" r="4.5" style="${d(
          1.15 + i * 0.1,
          0.45,
        )}"/></g>`,
    )
    .join("");

  return (
    `<line class="draw M" x1="52" y1="${base}" x2="248" y2="${base}" pathLength="1" style="${d(0.05, 0.8)}"/>` +
    bars +
    `<path class="draw A" d="${line}" pathLength="1" style="${d(1, 1.1)}"/>` +
    dots +
    `<path class="draw A" d="M212 110L228 98L226 116" pathLength="1" style="${d(2, 0.5)}"/>`
  );
}

/** Spreading a message. */
export function megaphone(): string {
  return (
    `<path class="draw A" d="M170 98L104 124H88a12 12 0 0 0-12 12v24a12 12 0 0 0 12 12h16l66 26Z" pathLength="1" style="${d(
      0.1,
      1.5,
    )}"/>` +
    `<path class="draw A" d="M124 126V172" pathLength="1" style="${d(0.6, 0.6)}"/>` +
    `<path class="draw A" d="M104 172v16a12 12 0 0 0 12 12h14" pathLength="1" style="${d(0.75, 0.7)}"/>` +
    `<g class="pulse" style="${d(1.7, 2.4)}"><path class="draw A" d="M198 112A48 48 0 0 1 198 188" pathLength="1" style="${d(
      0.9,
      0.8,
    )}"/></g>` +
    `<g class="pulse" style="${d(2, 2.4)}"><path class="draw A" d="M216 94A72 72 0 0 1 216 206" pathLength="1" style="${d(
      1.05,
      0.8,
    )}"/></g>` +
    `<g class="pulse" style="${d(2.3, 2.4)}"><path class="draw A" d="M234 76A96 96 0 0 1 234 224" pathLength="1" style="${d(
      1.2,
      0.8,
    )}"/></g>`
  );
}

/** A list of three things. */
export function cards(): string {
  const card = (y: number, delay: number, labelW: number, icon: string) =>
    `<g class="slide" style="${d(delay, 0.7)}">` +
    `<rect class="fs" x="56" y="${y}" width="188" height="58" rx="14"/>` +
    `<rect class="in M" x="56" y="${y}" width="188" height="58" rx="14" style="${d(delay + 0.05, 0.6)}"/>` +
    icon +
    `<rect class="grow fa" x="104" y="${y + 25}" width="${labelW}" height="8" rx="4" style="${d(
      delay + 0.35,
      0.6,
    )}"/>` +
    `<path class="in A" d="M206 ${y + 29}h12m-5-5 5 5-5 5" style="${d(delay + 0.45, 0.4)}"/>` +
    `</g>`;

  const dotIcon =
    `<circle class="draw A" cx="82" cy="97" r="11" pathLength="1" style="${d(0.5, 0.6)}"/>` +
    `<circle class="pulse fa" cx="82" cy="97" r="4.5" style="${d(0.85, 2)}"/>`;

  const bulbIcon =
    `<circle class="draw A" cx="82" cy="164" r="9" pathLength="1" style="${d(0.65, 0.6)}"/>` +
    `<line class="in A" x1="82" y1="177" x2="82" y2="182" style="${d(1.1, 0.3)}"/>` +
    `<line class="in A" x1="70" y1="152" x2="66" y2="148" style="${d(1.2, 0.3)}"/>` +
    `<line class="in A" x1="94" y1="152" x2="98" y2="148" style="${d(1.3, 0.3)}"/>`;

  const barsIcon =
    `<rect class="pop fa" x="72" y="236" width="7" height="12" rx="2" style="${d(0.8, 0.4)}"/>` +
    `<rect class="pop fa" x="83" y="230" width="7" height="18" rx="2" style="${d(0.9, 0.4)}"/>` +
    `<rect class="pop fa" x="94" y="222" width="7" height="26" rx="2" style="${d(1, 0.4)}"/>`;

  return (
    card(68, 0.3, 84, dotIcon) + card(138, 0.45, 100, bulbIcon) + card(208, 0.6, 72, barsIcon)
  );
}

/** Index → graphic, matching the scene's `v` field. */
export const V: ReadonlyArray<() => string> = [bloom, bookcode, platformer, wave, chart, megaphone, cards, bloom];

/** Human-readable names, used by the app UI. */
export const GRAPHIC_NAMES: ReadonlyArray<string> = [
  "Bloom",
  "Book & Code",
  "Platformer",
  "Wave",
  "Chart",
  "Megaphone",
  "Cards",
  "Bloom",
];
