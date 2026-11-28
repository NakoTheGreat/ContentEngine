import type { Brief } from "./types";

const DEFAULT_BUSINESS = "Custom graphics studio";
const DEFAULT_AUDIENCE = "Small businesses and creators who need custom graphics";
const DEFAULT_OFFER = "Custom graphic design, drawn for your brand";
const DEFAULT_TONE = "Clean, confident, design-led";

export function slugify(input: string): string {
  const slug = input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
  return slug || "ad";
}

const has = (haystack: string, words: string[]) =>
  words.some((word) => new RegExp(`\\b${word}`, "i").test(haystack));

function readLength(request: string): number | null {
  const match = /(\d{1,2})\s*(?:s\b|sec|secs|second|seconds)/i.exec(request);
  if (match) {
    const value = Number(match[1]);
    if (value >= 8 && value <= 60) return value;
  }
  if (/\bfifteen\b/i.test(request)) return 15;
  if (/\btwenty\b/i.test(request)) return 20;
  if (/\bthirty\b/i.test(request)) return 30;
  return null;
}

function readTone(request: string): string | null {
  const table: Array<[RegExp, string]> = [
    [/\b(bold|punchy|loud|hype|energetic)\b/i, "Bold, high-contrast, punchy"],
    [/\b(premium|luxury|high[- ]end|elegant)\b/i, "Premium, restrained, editorial"],
    [/\b(playful|fun|cheeky|quirky)\b/i, "Playful and warm"],
    [/\b(minimal|clean|calm|quiet)\b/i, "Minimal, calm, typographic"],
    [/\bfunny\b/i, "Light and funny"],
  ];
  for (const [pattern, tone] of table) if (pattern.test(request)) return tone;
  return null;
}

function readAudience(request: string): string | null {
  const table: Array<[RegExp, string]> = [
    [/\b(small business|local business|shop owners?)\b/i, "Small business owners"],
    [/\b(founder|startup|cofounder)\b/i, "Early-stage founders"],
    [/\b(creator|influencer|you ?tuber|podcaster)\b/i, "Creators and podcasters"],
    [/\b(restaurant|cafe|coffee shop|bar)\b/i, "Independent restaurants and cafés"],
    [/\b(agency|agencies|designer)\b/i, "Design agencies and freelancers"],
    [/\b(ecommerce|e-commerce|shopify|dtc)\b/i, "Online store owners"],
    [/\b(athlete|team|club|gym)\b/i, "Sports clubs and teams"],
  ];
  for (const [pattern, audience] of table) if (pattern.test(request)) return audience;
  return null;
}

function readGoal(request: string): string | null {
  if (/\b(sale|sales|buy|order|purchase|checkout|discount)\b/i.test(request))
    return "Drive orders";
  if (/\b(lead|leads|enquir|inquir|book|booking|call|consult|quote)\b/i.test(request))
    return "Drive inquiries and booked calls";
  if (/\b(follow|awareness|reach|viral|audience|traffic)\b/i.test(request))
    return "Build awareness and follows";
  if (/\b(launch|announce|announcement|new)\b/i.test(request))
    return "Announce the offer";
  return null;
}

function readOffer(request: string): string | null {
  let cleaned = request.trim().replace(/[.!?]+$/, "");
  if (!cleaned) return null;

  // Drop the "make me an ad about" wrapper.
  cleaned = cleaned
    .replace(
      /^(?:please\s+)?(?:make|create|build|generate|produce|design|shoot)\s+(?:me\s+)?(?:an?\s+)?(?:short|vertical|video)?\s*(?:ad|advert|advertisement|video|reel)\s+(?:for|about|on)\s+/i,
      "",
    )
    .replace(/^(?:an?|the|our|my)\s+(?:short|vertical|video)?\s*(?:ad|advert|advertisement|video|reel)\s+(?:for|about|on)\s+/i, "")
    .replace(/^(?:a|an|the|our|my)\s+/i, "")
    .trim();

  // Strip trailing clauses that describe length, audience or placement.
  let previous = "";
  while (previous !== cleaned) {
    previous = cleaned;
    cleaned = cleaned
      .replace(/\s*,\s*\d{1,2}\s*(?:s|sec|secs|second|seconds)\s*$/i, "")
      .replace(/\s*,\s*(?:for|aimed at|targeting|aimed towards)\s+[^,]+$/i, "")
      .replace(/\s*,\s*on\s+(?:tiktok|instagram|reels?|youtube|shorts|facebook|meta)[^,]*$/i, "")
      .replace(/\s*,\s*(?:bold|punchy|premium|minimal|playful|clean|warm)[^,]*$/i, "")
      .trim();
  }

  const match = /(?:launch(?:ing)?|announce|announcing|promote|promoting|sell|selling|advertise|advertising)\s+(.{3,80})/i.exec(
    cleaned,
  );
  const offer = match ? match[1].trim() : cleaned;
  return offer ? cleanSentence(offer) : null;
}

function cleanSentence(value: string): string {
  const trimmed = value.replace(/\s+/g, " ").trim();
  const sentence = trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
  return sentence.length > 110 ? `${sentence.slice(0, 107)}…` : sentence;
}

function capitalise(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function readBusiness(request: string): string | null {
  if (has(request, ["graphics", "graphic design", "design studio", "branding"]))
    return "Custom graphics studio";
  if (has(request, ["logo"])) return "Logo and brand identity studio";
  if (has(request, ["print", "packaging"])) return "Print and packaging studio";
  if (has(request, ["illustration", "illustrator"])) return "Illustration studio";
  if (has(request, ["app", "platform", "software", "saas"]))
    return "Software studio";
  return null;
}

function readPlatform(request: string): string | null {
  const named: string[] = [];
  if (/tiktok/i.test(request)) named.push("TikTok");
  if (/instagram|reels?\b/i.test(request)) named.push("Instagram Reels");
  if (/youtube|shorts/i.test(request)) named.push("YouTube Shorts");
  if (/facebook|meta ads?\b/i.test(request)) named.push("Facebook");
  if (named.length) return named.join(" + ");
  return null;
}

/** Stage 1: plain-English request -> structured brief, gaps filled with defaults. */
export function buildBrief(request: string): Brief {
  const assumptions: string[] = [];

  const length = readLength(request);
  if (length === null) assumptions.push("length");

  const tone = readTone(request);
  if (!tone) assumptions.push("tone");

  const audience = readAudience(request);
  if (!audience) assumptions.push("audience");

  const goal = readGoal(request);
  if (!goal) assumptions.push("goal");

  const offer = readOffer(request) ?? DEFAULT_OFFER;
  if (!readOffer(request)) assumptions.push("offer");

  const business = readBusiness(request);
  if (!business) assumptions.push("business");

  const platform = readPlatform(request);
  if (!platform) assumptions.push("platform");

  return {
    project: slugify(request || "custom-graphics-ad"),
    request,
    business: business ?? DEFAULT_BUSINESS,
    offer,
    audience: audience ?? DEFAULT_AUDIENCE,
    goal: goal ?? "Drive inquiries and booked calls",
    tone: tone ?? DEFAULT_TONE,
    length: length ?? 20,
    platform: platform ?? "Reels + TikTok + Shorts",
    assumptions,
    createdAt: new Date().toISOString(),
  };
}

/** Stage 8 revision helper: patch the brief from a plain-English change. */
export function patchBrief(brief: Brief, patch: Partial<Brief>): Brief {
  const next: Brief = { ...brief, ...patch };
  next.project = patch.project ?? brief.project;
  if (typeof patch.length === "number") {
    next.length = Math.min(60, Math.max(8, Math.round(patch.length)));
  }
  return next;
}
