import { V } from "./graphics";

/** A scene, see the engine schema. `svg` is the pre-rendered illustration. */
export type Scene = {
  t: "d" | "l";
  k: string;
  d: number;
  v: number;
  L: string[];
  svg: string;
};

/** Keyword families → graphic index. Index 0/7 are the opening/closing bloom. */
const KEYWORDS: ReadonlyArray<{ v: number; words: string[] }> = [
  {
    v: 1,
    words: [
      "learn", "learning", "book", "books", "read", "reading", "code", "coding",
      "developer", "develop", "teach", "study", "school", "course", "docs",
      "knowledge", "origin", "story", "craft", "tutorial",
    ],
  },
  {
    v: 2,
    words: [
      "game", "gaming", "play", "platform", "level", "ship", "build", "fast",
      "faster", "speed", "app", "product", "prototype", "release", "pixel",
    ],
  },
  {
    v: 3,
    words: [
      "podcast", "audio", "sound", "music", "voice", "wave", "signal", "radio",
      "stream", "episode", "ai", "broadcast", "listen", "show", "talk",
    ],
  },
  {
    v: 4,
    words: [
      "growth", "grow", "revenue", "sales", "results", "data", "metric",
      "metrics", "numbers", "scale", "roi", "analytics", "performance",
      "profit", "convert", "dashboard", "track",
    ],
  },
  {
    v: 5,
    words: [
      "announce", "announcement", "promote", "marketing", "audience", "reach",
      "spread", "message", "ads", "campaign", "share", "brand", "awareness",
      "launch", "outreach", "voice",
    ],
  },
  {
    v: 6,
    words: [
      "list", "three", "steps", "process", "feature", "features", "tool",
      "tools", "workflow", "system", "offer", "pricing", "service", "how",
      "guide", "stack",
    ],
  },
];

/** Short captions used when a prompt has too few words to fill every scene. */
const CAPTION: Record<number, string> = {
  1: "Show your working.",
  2: "Built to ship.",
  3: "Every signal, amplified.",
  4: "The numbers do the talking.",
  5: "One message, everywhere.",
  6: "Three moves, nothing wasted.",
};

const LEAD =
  /^(?:please\s+)?(?:make|create|build|generate|produce|design|render|animate|give me|i want|i need|show me)\s+/i;
const ARTICLE = /^(?:a|an|the|some|my|our|your)\s+/i;

/** Trim a short prompt down to headline words. */
function toTokens(raw: string): string[] {
  const cleaned = raw
    .trim()
    .replace(/\s+/g, " ")
    .replace(/\s+([.,;:!?])/g, "")
    .replace(/[.]+$/, "");
  const stripped = cleaned.replace(LEAD, "").replace(ARTICLE, "");
  return stripped.split(" ").filter(Boolean).slice(0, 14);
}

/** Words that should not end a line or carry the emphasis. */
const CONNECTORS = new Set([
  "for", "and", "the", "a", "an", "of", "to", "with", "in", "on", "at", "by",
  "from", "that", "your", "our", "their", "its", "is", "are", "into", "than",
]);

function chunk(tokens: string[], size: number): string[] {
  const out: string[] = [];
  for (let i = 0; i < tokens.length; i += size) out.push(tokens.slice(i, i + size).join(" "));
  // Never end a line on a connector: push it onto the next line instead.
  for (let i = 0; i < out.length - 1; i++) {
    const words = out[i].split(" ");
    if (words.length > 1 && CONNECTORS.has(words[words.length - 1].toLowerCase())) {
      const moved = words.pop() as string;
      out[i] = words.join(" ");
      out[i + 1] = `${moved} ${out[i + 1]}`;
    }
  }
  return out;
}

/** Wrap the last strong word in *asterisks* for bronze italic emphasis. */
function emphasise(line: string): string {
  const parts = line.split(" ");
  let index = parts.length - 1;
  while (index > 0 && CONNECTORS.has(parts[index].toLowerCase())) index -= 1;
  const word = parts[index] ?? "";
  if (!word) return line;
  parts[index] = `*${word.replace(/\*/g, "")}*`;
  return parts.join(" ");
}

function pickGraphics(prompt: string): [number, number] {
  const haystack = ` ${prompt.toLowerCase().replace(/[^a-z0-9\s@]/g, " ")} `;
  const scored = KEYWORDS.map((entry) => ({
    v: entry.v,
    score: entry.words.reduce((sum, word) => sum + (haystack.includes(` ${word} `) ? 1 : 0), 0),
  })).sort((a, b) => b.score - a.score || a.v - b.v);

  const first = scored[0].score > 0 ? scored[0].v : 3;
  const runnerUp = scored.find((entry) => entry.score > 0 && entry.v !== first);
  const second = runnerUp ? runnerUp.v : first === 4 ? 6 : 4;
  return [first, second];
}

/**
 * Turn a short prompt into a loopable 4-scene animation:
 * bloom opener → matched graphic → matched graphic → bloom closer.
 */
export function composeScenes(prompt: string): Scene[] {
  const tokens = toTokens(prompt);
  const [g1, g2] = pickGraphics(prompt || "the idea");
  const chunks = chunk(tokens, tokens.length > 6 ? 3 : 2);

  const opening = chunks.shift() ?? "A new *idea.*";
  const openingLines = [emphasise(opening)];
  if (chunks.length > 2 && opening.split(" ").length <= 2) {
    openingLines.push(emphasise(chunks.shift() as string));
  }

  const mid1 = chunks.shift();
  const mid2 = chunks.shift();
  const lastWord = (mid2 ?? mid1 ?? opening).split(" ").slice(-1)[0].replace(/\*/g, "");
  const handle = /@([A-Za-z0-9_.]+)/.exec(prompt)?.[0];
  const label = (tokens.slice(0, 3).join(" ") || "Content Engine").toUpperCase();

  const scenes: Omit<Scene, "svg">[] = [
    { t: "d", k: "", v: 0, d: 6200, L: openingLines },
    {
      t: "l",
      k: "The Idea",
      v: g1,
      d: 6400,
      L: mid1 ? [emphasise(mid1), `s:${CAPTION[g1]}`] : [`*${CAPTION[g1]}*`],
    },
    {
      t: "d",
      k: "How It Works",
      v: g2,
      d: 6400,
      L: mid2
        ? [emphasise(mid2), `s:${CAPTION[g2]}`]
        : [`*${CAPTION[g2]}*`, `s:Made for ${tokens.slice(-1)[0] ?? "you"}.`],
    },
    { t: "l", k: "", v: 7, d: 6600, L: [`b:*${lastWord}*`, `m:${handle ?? label}`] },
  ];

  return scenes.map((scene) => ({ ...scene, svg: V[scene.v]() }));
}

/** A stable, readable filename for the export. */
export function slugify(prompt: string): string {
  const slug = prompt
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
  return slug || "content-engine";
}
