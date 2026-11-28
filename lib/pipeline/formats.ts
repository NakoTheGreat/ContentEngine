import type { AdFormat, FormatId } from "./types";

/**
 * Stage 2 output: five short-form formats that are working right now and can be
 * built entirely from code-generated motion graphics (no footage, no actors).
 *
 * The trend reads below come from research done on 2026-11-28; each entry keeps
 * the source it was read from so the claim can be re-checked.
 */
export const FORMATS: ReadonlyArray<AdFormat> = [
  {
    id: "before-after",
    name: "Before → After reveal",
    oneLiner:
      "Open on the rough input, flip to the finished artwork, then hold on the detail.",
    why: "Reveal structures are the strongest share driver in short-form right now: one visible transformation in under ten seconds, with the 'after' teased in the first frame.",
    length: "12–18s",
    source: {
      label: "Revid — Short Form Video Trends 2026",
      url: "https://www.revid.ai/blog/short-form-video-trends",
    },
  },
  {
    id: "tease-reveal",
    name: "Tease → Reveal → CTA",
    oneLiner:
      "A partial view or open question, the full artwork snapping into place, then one call to action.",
    why: "TikTok's own ad guidance recommends this structure for launches and transformations, and suggests 21–34s for most ads with the payoff on a beat.",
    length: "15–25s",
    source: {
      label: "TikTok for Business — Video Advertising Guide",
      url: "https://ads.tiktok.com/business/en/guides/video-advertising-guide",
    },
  },
  {
    id: "problem-solution",
    name: "Problem → Solution",
    oneLiner:
      "Name the frustration the viewer has in the first two seconds, then show the fix.",
    why: "Direct-response guidance favours opening on a problem the viewer recognises, then resolving it visibly — typically under 20s with one clear CTA.",
    length: "15–20s",
    source: {
      label: "Moonb — Short Video Ads: Lengths & Formats for 2026",
      url: "https://www.moonb.io/blog/short-video-ads",
    },
  },
  {
    id: "listicle",
    name: "Text-on-screen listicle",
    oneLiner:
      "Three numbered points, each one re-hooking the viewer, delivered as type-only beats.",
    why: "Faceless listicles win completion and saves because every item resets attention — ideal when there is no footage to shoot.",
    length: "18–25s",
    source: {
      label: "AdAnt — Viral Content Formats",
      url: "https://adant.ai/guides/viral-content-formats",
    },
  },
  {
    id: "process",
    name: "Process timelapse",
    oneLiner:
      "Day one to day three as fast beats: sketch, vectors, delivery.",
    why: "Process and 'day in the life' formats earn follows by showing access to the work; the compressed timeline reads as proof of speed.",
    length: "20–30s",
    source: {
      label: "AdAnt — Viral Content Formats",
      url: "https://adant.ai/guides/viral-content-formats",
    },
  },
] as const;

export const FORMAT_BY_ID: Record<FormatId, AdFormat> = FORMATS.reduce(
  (acc, format) => {
    acc[format.id] = format;
    return acc;
  },
  {} as Record<FormatId, AdFormat>,
);
