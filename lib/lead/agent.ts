import { buildBrief, patchBrief } from "@/lib/pipeline/brief";
import { FORMATS, FORMAT_BY_ID } from "@/lib/pipeline/formats";
import { applyEdit, buildScript, redoScene } from "@/lib/pipeline/script";
import type { AdFormat, Brief, FormatId, Script, StageId } from "@/lib/pipeline/types";

/**
 * The Lead AI. It reads a plain-English message, decides which stages are
 * affected, and returns both the reply and the actions to run — so nothing
 * downstream is rebuilt until the user has decided.
 */

export type PipelineSnapshot = {
  brief: Brief | null;
  format: AdFormat | null;
  script: Script | null;
  voiceReady: boolean;
  exported: boolean;
  stage: StageId;
};

export type AgentAction =
  | { kind: "brief"; brief: Brief }
  | { kind: "format"; format: AdFormat }
  | { kind: "script"; script: Script }
  | { kind: "goto"; stage: StageId }
  | { kind: "voice"; regenerate: boolean }
  | { kind: "export" };

export type AgentReply = { text: string; actions: AgentAction[] };

const has = (text: string, pattern: RegExp) => pattern.test(text);

const TONES: Array<[RegExp, string]> = [
  [/\b(bold|punchy|loud|hype|energetic)\b/, "Bold, high-contrast, punchy"],
  [/\b(premium|luxury|high[- ]end|elegant)\b/, "Premium, restrained, editorial"],
  [/\b(playful|fun|cheeky)\b/, "Playful and warm"],
  [/\b(minimal|clean|calm|quiet)\b/, "Minimal, calm, typographic"],
];

const AUDIENCES: Array<[RegExp, string]> = [
  [/\b(small business|local business|shop owners?)\b/, "Small business owners"],
  [/\b(founder|startup)s?\b/, "Early-stage founders"],
  [/\b(creator|influencer|podcaster)s?\b/, "Creators and podcasters"],
  [/\b(restaurant|cafe|coffee shop)s?\b/, "Independent restaurants and cafés"],
  [/\b(agenc|designer)/, "Design agencies and freelancers"],
  [/\b(ecommerce|e-commerce|shopify|dtc)\b/, "Online store owners"],
];

function matchFormat(text: string): AdFormat | null {
  if (/\bbefore\b|\bafter\b|\breveal\b/.test(text)) {
    if (/before|after/.test(text)) return FORMAT_BY_ID["before-after"];
  }
  if (/tease|hero|snap/.test(text)) return FORMAT_BY_ID["tease-reveal"];
  if (/problem|pain|solution|objection/.test(text)) return FORMAT_BY_ID["problem-solution"];
  if (/listicle|list|three things|numbered/.test(text)) return FORMAT_BY_ID["listicle"];
  if (/process|timelapse|day in the life|behind/.test(text)) return FORMAT_BY_ID["process"];
  return null;
}

function readNumber(text: string): number | null {
  const match = /(\d{1,2})\s*(?:s\b|sec|secs|second|seconds)/.exec(text);
  if (!match) return null;
  const value = Number(match[1]);
  return value >= 8 && value <= 60 ? value : null;
}

function planFor(snapshot: PipelineSnapshot): string {
  if (!snapshot.brief) {
    return "**Stage 1 · Intake** — I need the request in plain English, then I'll write the brief.";
  }
  if (!snapshot.format) {
    return "**Stage 2 · Formats** — Brief is set. Five trend-backed formats are waiting; pick one and I'll write the scene table.";
  }
  if (!snapshot.script) {
    return "**Stage 4 · Script** — Format chosen. Next I write the scene table with the hook inside two seconds and one call to action.";
  }
  if (!snapshot.voiceReady) {
    return "**Stage 5 · Voice** — Script is ready. Either add an ElevenLabs key or run captions-only, then I animate to the timestamps.";
  }
  if (!snapshot.exported) {
    return "**Stage 6–7 · Animation + QA** — Timestamps are in. I animate each scene, then check sync, safe area and length before showing you the cut.";
  }
  return "**Stage 8 · Delivery** — The cut is rendered. Tell me what to change (\"punchier hook\", \"swap the voice\", \"shorter\") and I re-run only the affected stages.";
}

export function askLead(message: string, snapshot: PipelineSnapshot): AgentReply {
  const text = message.toLowerCase().trim();
  const actions: AgentAction[] = [];

  if (!text) {
    return { text: "Tell me what to change, or what the ad is for.", actions };
  }

  if (has(text, /^(help|what can you do|how does this work|what now)\b/)) {
    return {
      text:
        "**Lead AI** — I run eight stages: brief, format scouting, format pick, script, voiceover, animation, QA, delivery.\n" +
        "Tell me things like \"make the hook punchier\", \"use the listicle\", \"change the voice\", \"shorter, 15 seconds\" or \"render it\".\n" +
        planFor(snapshot),
      actions: [],
    };
  }

  // No brief yet: the message is the request.
  if (!snapshot.brief) {
    const brief = buildBrief(message);
    return {
      text:
        `**Stage 1 · Intake** — Read your request as: ${brief.offer.toLowerCase()}, for ${brief.audience.toLowerCase()}.\n` +
        `**Defaults I used:** ${brief.length}s, ${brief.tone.toLowerCase()}, ${brief.platform}.${
          brief.assumptions.length ? ` Filled in: ${brief.assumptions.join(", ")}.` : ""
        }\n` +
        "Adjust anything on the Brief tab, or tell me here.",
      actions: [{ kind: "brief", brief }, { kind: "goto", stage: "brief" }],
    };
  }

  let brief = snapshot.brief;
  let script = snapshot.script;
  let format = snapshot.format;
  let briefChanged = false;
  let scriptChanged = false;

  if (has(text, /\b(status|where are we|what's next|whats next|progress)\b/)) {
    return { text: planFor(snapshot), actions: [] };
  }

  // Length changes retime the script.
  const length = readNumber(text);
  if (length && has(text, /\b(make it|shorter|longer|length|seconds?|secs?)\b/)) {
    brief = patchBrief(brief, { length });
    briefChanged = true;
  }

  const toneMatch = TONES.find(([pattern]) => pattern.test(text));
  if (toneMatch && has(text, /\b(tone|feel|mood|style|vibe|make it)\b/)) {
    brief = patchBrief(brief, { tone: toneMatch[1] });
    briefChanged = true;
  }

  const audienceMatch = AUDIENCES.find(([pattern]) => pattern.test(text));
  if (audienceMatch && has(text, /\b(audience|for|target|speak to|aimed)\b/)) {
    brief = patchBrief(brief, { audience: audienceMatch[1] });
    briefChanged = true;
  }

  const goalMatch =
    /\b(orders?|sales?|leads?|book(?:ed)? calls?|awareness|followers?|launch|announcement)\b/.exec(text);
  if (goalMatch && has(text, /\b(goal|aim|objective|so people|to get)\b/)) {
    const goal =
      /order|sale/.test(goalMatch[1])
        ? "Drive orders"
        : /lead|book/.test(goalMatch[1])
          ? "Drive inquiries and booked calls"
          : /awareness|follower/.test(goalMatch[1])
            ? "Build awareness and follows"
            : "Announce the offer";
    brief = patchBrief(brief, { goal });
    briefChanged = true;
  }

  // Format switching rebuilds the script from the same brief.
  if (has(text, /\b(format|use|switch to|try|go with|pick|choose)\b/)) {
    const chosen = text.includes("you choose")
      ? FORMATS[0]
      : matchFormat(text);
    if (chosen) {
      format = chosen;
      script = buildScript(briefChanged ? brief : snapshot.brief, chosen);
      actions.push({ kind: "format", format: chosen }, { kind: "script", script });
      actions.push({ kind: "goto", stage: "script" });
      return {
        text:
          `**Stage 3 · Format** — Locked: ${chosen.name} (${chosen.length}).\n` +
          `**Stage 4 · Script** — ${script.scenes.length} scenes, ${script.total}s, hook at 0s, CTA last.\n` +
          "Edit any cell on the Script tab, or ask me to punch it up.",
        actions,
      };
    }
  }

  if (script) {
    if (has(text, /\bpunch|punchier|stronger|sharper|tighter hook|better hook\b/)) {
      script = applyEdit(script, { punchier: true });
      scriptChanged = true;
    } else if (has(text, /\b(shorten|shorter|trim|cut it down|less scenes)\b/)) {
      script = applyEdit(script, { shorten: true });
      scriptChanged = true;
    } else if (has(text, /\b(lengthen|longer|add a (scene|beat)|more scenes)\b/)) {
      script = applyEdit(script, { lengthen: true });
      scriptChanged = true;
    } else if (has(text, /\b(softer|calmer|less aggressive|gentler)\b/)) {
      script = applyEdit(script, { softer: true });
      scriptChanged = true;
    }

    const sceneMatch = /\bscene\s*(\d+)\b/.exec(text);
    if (sceneMatch) {
      const n = Number(sceneMatch[1]);
      if (has(text, /\b(redo|again|rewrite|change|different|swap)\b/)) {
        script = redoScene(script, n);
        scriptChanged = true;
      }
    }

    const ctaMatch = /\b(?:cta|call to action)\s*(?:to|says?|should be|:)\s*["“]?([^"”]+)["”]?/.exec(
      message,
    );
    if (ctaMatch) {
      script = applyEdit(script, { cta: ctaMatch[1].trim() });
      scriptChanged = true;
    }

    const hookMatch = /\bhook\s*(?:to|says?|should be|:)\s*["“]?([^"”]+)["”]?/.exec(message);
    if (hookMatch) {
      script = applyEdit(script, { hook: hookMatch[1].trim(), punchier: false });
      scriptChanged = true;
    }
  }

  if (briefChanged && snapshot.script) {
    // A brief change invalidates the script only when the format still fits.
    script = buildScript(brief, format ?? FORMATS[0]);
    scriptChanged = true;
  }

  if (scriptChanged && script) {
    actions.push({ kind: "script", script });
    if (briefChanged) actions.push({ kind: "brief", brief });
    actions.push({ kind: "goto", stage: "script" });
    if (snapshot.voiceReady) actions.push({ kind: "voice", regenerate: true });
    return {
      text:
        `**Stage 4 · Script** — Rebuilt: ${script.scenes.length} scenes, ${script.total}s total.${
          briefChanged ? " Brief patched, so the script was re-derived." : ""
        }\n` +
        (snapshot.voiceReady
          ? "**Stage 5 · Voice** — The old take no longer matches, so it needs a regenerate."
          : "**Next:** record the voiceover, then I animate to the timestamps."),
      actions,
    };
  }

  if (has(text, /\b(voice|narrat|speaker|read it)\b/)) {
    actions.push({ kind: "goto", stage: "voice" }, { kind: "voice", regenerate: true });
    return {
      text:
        "**Stage 5 · Voice** — Opening the voice stage. One voice for every line; the take and its settings are saved with the project.\n" +
        "Preview a voice, then generate — I'll sync the animation to the real clip durations.",
      actions,
    };
  }

  if (has(text, /\b(render|export|download|final|mp4|video|deliver)\b/)) {
    actions.push({ kind: "goto", stage: "export" }, { kind: "export" });
    return {
      text:
        "**Stage 7 · Assembly** — Rendering at 1080×1920 with the voice track and captions keyed to it.\n" +
        "QA checks run before the file is offered: hook inside two seconds, nothing in the bottom 22%, length on target.",
      actions,
    };
  }

  if (has(text, /\b(animate|animation|motion|preview)\b/)) {
    actions.push({ kind: "goto", stage: "animation" });
    return {
      text: "**Stage 6 · Animation** — Opening the scene preview. Ask me to \"redo scene 2\" and only that beat is rebuilt.",
      actions,
    };
  }

  if (has(text, /\bbrief\b|\bintake\b/)) {
    actions.push({ kind: "goto", stage: "brief" });
    return { text: "**Stage 1 · Brief** — Opening it. Change any field and I re-derive downstream.", actions };
  }

  if (has(text, /\bformats?\b/)) {
    actions.push({ kind: "goto", stage: "formats" });
    return {
      text: "**Stage 2 · Formats** — Five options that work right now and can be built in code. Pick one, or say \"you choose\".",
      actions,
    };
  }

  return {
    text:
      "I can act on: the hook, scene copy, the format, the brief (offer, audience, goal, tone, length), the voice, or rendering.\n" +
      planFor(snapshot),
    actions: [],
  };
}
