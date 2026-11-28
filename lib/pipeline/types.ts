/** Shared types for the eight-stage ad pipeline. */

export type StageId = "brief" | "formats" | "script" | "voice" | "animation" | "export";

export type Theme = "dark" | "light";

export type Brief = {
  project: string;
  request: string;
  business: string;
  offer: string;
  audience: string;
  goal: string;
  tone: string;
  length: number;
  platform: string;
  /** Fields that were filled with defaults rather than read from the request. */
  assumptions: string[];
  createdAt: string;
};

export type FormatId =
  | "before-after"
  | "tease-reveal"
  | "problem-solution"
  | "listicle"
  | "process";

export type AdFormat = {
  id: FormatId;
  name: string;
  oneLiner: string;
  /** Why it is working right now, with the trend signal behind it. */
  why: string;
  length: string;
  source: { label: string; url: string };
};

export type SceneRole = "hook" | "body" | "cta";

export type Scene = {
  n: number;
  role: SceneRole;
  /** What is on screen, in plain English (also used by the animation stage). */
  visual: string;
  /** Voiceover line — the only text sent to ElevenLabs. */
  vo: string;
  /** Text drawn on screen. */
  text: string;
  /** Seconds. */
  dur: number;
  /** Which canvas graphic the scene uses. */
  graphic: number;
  theme: Theme;
};

export type Script = {
  formatId: FormatId;
  hook: string;
  cta: string;
  scenes: Scene[];
  total: number;
  revision: number;
};

export type VoiceSettings = {
  stability: number;
  similarity_boost: number;
  style: number;
  speed: number;
  modelId: string;
};

export type VoiceClip = {
  n: number;
  start: number;
  end: number;
  dur: number;
  /** Path served by /api/media. */
  url: string;
  file: string;
};

export type VoiceMode = "elevenlabs" | "silent";

export type Voice = {
  mode: VoiceMode;
  voiceId: string;
  voiceName: string;
  settings: VoiceSettings;
  clips: VoiceClip[];
  total: number;
  generatedAt: string;
  note?: string;
};

export type TimelineEntry = {
  n: number;
  start: number;
  end: number;
  dur: number;
  audioUrl?: string;
};

export type Timeline = {
  scenes: TimelineEntry[];
  total: number;
};

export type QaCheck = {
  label: string;
  pass: boolean;
  detail: string;
};

export type ExportRecord = {
  file: string;
  mime: string;
  bytes: number;
  width: number;
  height: number;
  duration: number;
  voiceMode: VoiceMode | "none";
  createdAt: string;
  qa: QaCheck[];
};

export type StageData = {
  brief?: Brief;
  format?: AdFormat;
  script?: Script;
  voice?: Voice;
  export?: ExportRecord;
};

export type ChatRole = "user" | "lead";

export type ChatMessage = {
  id: string;
  role: ChatRole;
  text: string;
  stage?: StageId;
  at: string;
};
