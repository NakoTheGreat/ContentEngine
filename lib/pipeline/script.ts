import type { AdFormat, Brief, FormatId, Scene, Script } from "./types";

/** Average speaking rate in words per second, used to size scenes before audio exists. */
const RATE = 2.6;

/** Seconds a line takes to say, plus a beat of air. */
export function speechSeconds(line: string): number {
  const words = line.trim().split(/\s+/).filter(Boolean).length;
  return words / RATE + 0.45;
}

type Beat = Omit<Scene, "n" | "dur"> & { dur?: number };

const TITLE_CASE = (value: string) =>
  value.replace(/\b([a-z])/g, (match) => match.toUpperCase());

/** Short label for on-screen type: keeps the first clause, title-cased when short. */
function shortOffer(brief: Brief): string {
  const clause = brief.offer.split(/[,—–]| that | which /)[0].trim();
  const value = clause.length > 46 ? `${clause.slice(0, 43)}…` : clause;
  return value.length < 26 ? TITLE_CASE(value) : value;
}

function ctaFor(brief: Brief): string {
  if (/order/i.test(brief.goal)) return "Order yours this week";
  if (/awareness/i.test(brief.goal)) return "Follow for more";
  if (/announce/i.test(brief.goal)) return "See the new work";
  return "Send your brief today";
}

function ctaLine(brief: Brief): string {
  if (/order/i.test(brief.goal))
    return `Order this week and we start the same day.`;
  if (/awareness/i.test(brief.goal))
    return `Follow for the next one.`;
  if (/announce/i.test(brief.goal))
    return `The new collection is live now.`;
  return `Send your brief. First draft in three days.`;
}

function beatsFor(format: FormatId, brief: Brief): Beat[] {
  const short = shortOffer(brief);
  const cta = ctaFor(brief);
  const ctaVo = ctaLine(brief);

  switch (format) {
    case "before-after":
      return [
        {
          role: "hook",
          visual: "Big headline over an empty artboard, grid fading in",
          text: "Same brief. Same week.",
          vo: "Same brief. Same week.",
          graphic: 1,
          theme: "dark",
        },
        {
          role: "body",
          visual: "Rough pencil sketch and messy reference notes",
          text: "Monday",
          vo: "This is the brief on Monday.",
          graphic: 2,
          theme: "light",
        },
        {
          role: "body",
          visual: "Finished artwork snapping into frame",
          text: "Thursday",
          vo: "This is what came back on Thursday.",
          graphic: 0,
          theme: "dark",
        },
        {
          role: "body",
          visual: "Detail crops of the artwork, type system alongside",
          text: short,
          vo: "Custom graphics, built for your brand, not a template.",
          graphic: 6,
          theme: "light",
        },
        {
          role: "cta",
          visual: "Wordmark with the offer line underneath",
          text: cta,
          vo: ctaVo,
          graphic: 5,
          theme: "dark",
        },
      ];

    case "tease-reveal":
      return [
        {
          role: "hook",
          visual: "Artwork cropped to a narrow strip, half hidden",
          text: "Wait for it.",
          vo: "Wait for the reveal.",
          graphic: 1,
          theme: "dark",
        },
        {
          role: "body",
          visual: "Cropped mark sliding behind a mask",
          text: "The old version",
          vo: "One logo file. Fourteen revisions. No system.",
          graphic: 2,
          theme: "light",
        },
        {
          role: "body",
          visual: "Full artwork centre frame with a burst behind it",
          text: "The rebuild",
          vo: "So we rebuilt it properly.",
          graphic: 4,
          theme: "dark",
        },
        {
          role: "body",
          visual: "Grid of finished assets: post, story, print",
          text: short,
          vo: "Every format you need, ready to post.",
          graphic: 3,
          theme: "light",
        },
        {
          role: "cta",
          visual: "Wordmark and the call to action",
          text: cta,
          vo: ctaVo,
          graphic: 5,
          theme: "dark",
        },
      ];

    case "problem-solution":
      return [
        {
          role: "hook",
          visual: "Crowded grid of identical template graphics",
          text: "Your graphics look like everyone else's",
          vo: "Your graphics look like everyone else's.",
          graphic: 2,
          theme: "dark",
        },
        {
          role: "body",
          visual: "Same template repeated, colliding",
          text: "Templates. Same fonts. Same icons.",
          vo: "Templates. Same fonts. Same stock icons.",
          graphic: 3,
          theme: "light",
        },
        {
          role: "body",
          visual: "Clean artboard drawing itself from scratch",
          text: "We draw yours from zero.",
          vo: "We draw yours from zero.",
          graphic: 0,
          theme: "dark",
        },
        {
          role: "body",
          visual: "A small system: mark, type, colour rules",
          text: short,
          vo: "Brand, packaging, social — one system that holds together.",
          graphic: 6,
          theme: "light",
        },
        {
          role: "cta",
          visual: "Wordmark, call to action, handle",
          text: cta,
          vo: ctaVo,
          graphic: 5,
          theme: "dark",
        },
      ];

    case "listicle":
      return [
        {
          role: "hook",
          visual: "Three numbered slots waiting to fill",
          text: "Three things your graphics are missing",
          vo: "Three things your graphics are missing.",
          graphic: 1,
          theme: "dark",
        },
        {
          role: "body",
          visual: "Numbered card 01 with a type specimen",
          text: "01 · A type system",
          vo: "One. A type system, not a font folder.",
          graphic: 6,
          theme: "light",
        },
        {
          role: "body",
          visual: "Numbered card 02 with a colour rule",
          text: "02 · A colour rule",
          vo: "Two. A colour rule you can repeat in ten seconds.",
          graphic: 4,
          theme: "dark",
        },
        {
          role: "body",
          visual: "Numbered card 03 with an alignment grid",
          text: "03 · One grid",
          vo: "Three. One grid so every asset lines up.",
          graphic: 3,
          theme: "light",
        },
        {
          role: "cta",
          visual: "Wordmark with the free teardown offer",
          text: cta,
          vo: ctaVo,
          graphic: 5,
          theme: "dark",
        },
      ];

    case "process":
    default:
      return [
        {
          role: "hook",
          visual: "Three day markers sliding into place",
          text: "Three days. Start to finish.",
          vo: "Three days, start to finish.",
          graphic: 1,
          theme: "dark",
        },
        {
          role: "body",
          visual: "Pencil sketch and thumbnails building up",
          text: "Day one · sketch",
          vo: "Day one. Sketching until the idea holds.",
          graphic: 2,
          theme: "light",
        },
        {
          role: "body",
          visual: "Vector paths drawing across the artboard",
          text: "Day two · vectors",
          vo: "Day two. Clean vectors, real curves.",
          graphic: 0,
          theme: "dark",
        },
        {
          role: "body",
          visual: "Files and formats laid out in a grid",
          text: "Day three · files",
          vo: "Day three. Every format exported, nothing missing.",
          graphic: 3,
          theme: "light",
        },
        {
          role: "cta",
          visual: "Wordmark and the call to action",
          text: cta,
          vo: ctaVo,
          graphic: 5,
          theme: "dark",
        },
      ];
  }
}

/** Fit estimated durations to the brief's target length without dropping a beat. */
function retime<T extends { vo: string }>(scenes: T[], target: number): Array<T & { dur: number }> {
  const estimate = scenes.reduce((sum, scene) => sum + speechSeconds(scene.vo), 0);
  const scale = target / estimate;
  let next = scenes.map((scene) => ({
    ...scene,
    dur: Math.max(1.5, Math.round(speechSeconds(scene.vo) * scale * 10) / 10),
  }));

  let total = next.reduce((sum, scene) => sum + scene.dur, 0);
  let guard = 0;
  while (Math.abs(total - target) > 0.2 && guard < 40) {
    const index = total > target ? next.length - 2 : next.length - 1;
    const delta = Math.min(Math.abs(total - target), 0.2);
    next[index] = {
      ...next[index],
      dur: Math.max(1.2, Math.round((next[index].dur + (total > target ? -delta : delta)) * 10) / 10),
    };
    total = next.reduce((sum, scene) => sum + scene.dur, 0);
    guard += 1;
  }

  return next;
}

export function totalOf(scenes: Scene[]): number {
  return Math.round(scenes.reduce((sum, scene) => sum + scene.dur, 0) * 10) / 10;
}

/** Stage 4: scene table for the chosen format. */
export function buildScript(brief: Brief, format: AdFormat): Script {
  const scenes = retime(beatsFor(format.id, brief), brief.length).map((scene, index) => ({
    ...scene,
    n: index + 1,
  }));

  return {
    formatId: format.id,
    hook: scenes[0]?.text ?? "",
    cta: scenes[scenes.length - 1]?.text ?? "",
    scenes,
    total: totalOf(scenes),
    revision: 1,
  };
}

export type ScriptEdit = {
  punchier?: boolean;
  softer?: boolean;
  shorten?: boolean;
  lengthen?: boolean;
  cta?: string;
  hook?: string;
  retime?: number;
};

/** Copy tweaks used by the Script tab and by the Lead AI. */
export function applyEdit(script: Script, edit: ScriptEdit): Script {
  let scenes = script.scenes.map((scene) => ({ ...scene }));

  if (edit.hook) {
    scenes[0] = { ...scenes[0], text: edit.hook, vo: edit.hook };
  }

  if (edit.punchier) {
    scenes = scenes.map((scene, index) => {
      const vo = scene.vo
        .replace(/\b(very|really|just|actually|kind of|a bit|quite)\b\s*/gi, "")
        .replace(/\bwe are\b/gi, "we're")
        .replace(/\byou can\b/gi, "you")
        .replace(/\s+/g, " ")
        .trim();
      const text =
        index === 0
          ? vo.length > 26
            ? vo
            : vo.replace(/\.$/, "")
          : scene.text;
      return { ...scene, vo, text };
    });
    // A punchier hook means the first line lands sooner.
    scenes[0] = { ...scenes[0], dur: Math.min(scenes[0].dur, 2) };
  }

  if (edit.softer) {
    scenes = scenes.map((scene) => ({
      ...scene,
      vo: scene.vo.replace(/!+/g, ".").replace(/\bone\b\./gi, "one, if you like."),
    }));
  }

  if (edit.shorten) {
    const drop = scenes.findIndex((scene) => scene.role === "body");
    if (drop >= 0) scenes = scenes.filter((_, index) => index !== drop);
    scenes = scenes.map((scene) => ({ ...scene, dur: Math.max(1.2, scene.dur - 0.3) }));
  }

  if (edit.lengthen) {
    const insertAt = scenes.findIndex((scene) => scene.role === "cta");
    const extra: Scene = {
      n: 0,
      role: "body",
      visual: "Proof beat: finished pieces on a wall",
      text: "Recent work",
      vo: "Here is the same treatment on three other brands.",
      dur: 3,
      graphic: 3,
      theme: scenes[Math.max(0, insertAt - 1)]?.theme === "dark" ? "light" : "dark",
    };
    if (insertAt >= 0) scenes = [...scenes.slice(0, insertAt), extra, ...scenes.slice(insertAt)];
  }

  if (edit.cta) {
    const last = scenes.length - 1;
    scenes[last] = { ...scenes[last], text: edit.cta, vo: edit.cta };
  }

  if (typeof edit.retime === "number") {
    scenes = retime(scenes, edit.retime);
  }

  const renumbered = scenes.map((scene, index) => ({ ...scene, n: index + 1 }));

  return {
    ...script,
    hook: renumbered[0]?.text ?? "",
    cta: renumbered[renumbered.length - 1]?.text ?? "",
    scenes: renumbered,
    total: totalOf(renumbered),
    revision: script.revision + 1,
  };
}

/** Rewrite a single scene's copy (used by "redo scene 2"). */
export function redoScene(script: Script, n: number, beat?: Partial<Scene>): Script {
  const scenes = script.scenes.map((scene) => {
    if (scene.n !== n) return scene;
    const variant = beat ?? {
      text: variantFor(scene.text),
      vo: variantFor(scene.vo),
      visual: scene.visual,
    };
    return { ...scene, ...variant };
  });

  return {
    ...script,
    scenes,
    total: totalOf(scenes),
    revision: script.revision + 1,
  };
}

const VARIANTS: ReadonlyArray<[RegExp, string]> = [
  [/^Same brief\. Same week\.$/i, "Brief in. Graphics out."],
  [/^Wait for it\.$/i, "Watch this."],
  [/^Three days\. Start to finish\.$/i, "Seventy-two hours, one brief."],
  [/^Your graphics look like everyone else's$/i, "Everything you post looks the same."],
  [/^Three things your graphics are missing$/i, "Three things quietly costing you clients"],
];

function variantFor(line: string): string {
  for (const [pattern, replacement] of VARIANTS) {
    if (pattern.test(line)) return replacement;
  }
  return line;
}
