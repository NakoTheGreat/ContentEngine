"use client";

import { useMemo, useState } from "react";
import { buildTimeline } from "@/lib/render/engine";
import type { Brief, Script, Voice } from "@/lib/pipeline/types";
import { Button, Panel, Pill, SectionTitle } from "./ui";
import { StageCanvas } from "./StageCanvas";

type Props = {
  brief: Brief;
  script: Script;
  voice: Voice;
  revision: number;
  onRedo: (scene: number) => void;
  onRerun: () => void;
  onNext: () => void;
};

const THEME_LABEL = { dark: "Ink", light: "Paper" } as const;

export function AnimationTab({ brief, script, voice, revision, onRedo, onRerun, onNext }: Props) {
  const [guides, setGuides] = useState(false);
  const timeline = useMemo(() => buildTimeline(script, voice), [script, voice]);

  return (
    <div className="space-y-6">
      <div>
        <SectionTitle hint="Stage 6">Animation</SectionTitle>
        <p className="mt-2 max-w-xl text-[13px] leading-relaxed text-white/45">
          Every scene is drawn in code on a 1080×1920 canvas with one palette, one typeface and one
          easing curve. Captions are keyed to the{" "}
          {voice.mode === "elevenlabs" ? "measured clip timestamps" : "script timings"}.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,340px)_1fr]">
        <StageCanvas key={revision} script={script} voice={voice} guides={guides} />

        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <Pill tone={voice.mode === "elevenlabs" ? "good" : "accent"}>
              {voice.mode === "elevenlabs" ? `${voice.voiceName} · ${voice.total}s` : "Captions only"}
            </Pill>
            <Pill>{script.scenes.length} scenes</Pill>
            <Pill>{timeline.total}s</Pill>
            <Button variant="quiet" onClick={() => setGuides((value) => !value)}>
              {guides ? "Hide safe area" : "Show safe area"}
            </Button>
          </div>

          <Panel className="divide-y divide-white/[0.06] px-4 py-1">
            {script.scenes.map((scene) => {
              const entry = timeline.scenes.find((item) => item.n === scene.n);
              return (
                <div key={scene.n} className="flex items-center gap-3 py-2.5">
                  <span className="w-6 font-mono text-[11px] text-white/35">{scene.n}</span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[12px] text-white/75">{scene.text || scene.vo}</p>
                    <p className="truncate text-[10px] uppercase tracking-[0.14em] text-white/25">
                      {THEME_LABEL[scene.theme]} · graphic {scene.graphic} ·{" "}
                      {entry ? `${entry.start.toFixed(1)}–${entry.end.toFixed(1)}s` : `${scene.dur}s`}
                    </p>
                  </div>
                  <Button variant="quiet" onClick={() => onRedo(scene.n)}>
                    Redo
                  </Button>
                </div>
              );
            })}
          </Panel>

          <div className="flex flex-wrap items-center gap-3">
            <Button onClick={onNext}>Run QA and export</Button>
            <Button variant="ghost" onClick={onRerun}>
              Re-run animation
            </Button>
            <span className="text-[11px] text-white/30">
              Saved to pipeline/{brief.project}/animation.json
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
