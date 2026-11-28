"use client";

import { applyEdit, redoScene, totalOf } from "@/lib/pipeline/script";
import type { Brief, Scene, Script } from "@/lib/pipeline/types";
import { Button, Panel, Pill, SectionTitle } from "./ui";

type Props = {
  brief: Brief;
  script: Script;
  onChange: (script: Script) => void;
  onNext: () => void;
};

export function ScriptTab({ brief, script, onChange, onNext }: Props) {
  const update = (scene: Scene, patch: Partial<Scene>) => {
    const scenes = script.scenes.map((entry) =>
      entry.n === scene.n ? { ...entry, ...patch, dur: Math.max(1, Number(patch.dur ?? entry.dur)) } : entry,
    );
    onChange({ ...script, scenes, total: totalOf(scenes), revision: script.revision + 1 });
  };

  const drift = Math.round((script.total - brief.length) * 10) / 10;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <SectionTitle hint="Stage 4">Scene table</SectionTitle>
          <p className="mt-2 max-w-lg text-[13px] leading-relaxed text-white/45">
            Hook at 0s, one call to action at the end. Every cell is editable; the animation and voice
            stages read this table.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Pill tone={Math.abs(drift) <= 1.5 ? "good" : "accent"}>
            {script.total}s / {brief.length}s target
          </Pill>
          <Pill>rev {script.revision}</Pill>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button variant="ghost" onClick={() => onChange(applyEdit(script, { punchier: true }))}>
          Punch up the hook
        </Button>
        <Button variant="ghost" onClick={() => onChange(applyEdit(script, { shorten: true }))}>
          Shorten
        </Button>
        <Button variant="ghost" onClick={() => onChange(applyEdit(script, { lengthen: true }))}>
          Add a beat
        </Button>
        <Button variant="ghost" onClick={() => onChange(applyEdit(script, { retime: brief.length }))}>
          Fit {brief.length}s
        </Button>
      </div>

      <Panel className="overflow-hidden">
        <div className="min-w-full overflow-x-auto">
          <table className="w-full min-w-[820px] border-collapse text-left">
            <thead>
              <tr className="border-b border-white/10 text-[10px] uppercase tracking-[0.16em] text-white/35">
                <th className="w-10 px-3 py-2 font-medium">#</th>
                <th className="px-3 py-2 font-medium">On-screen visual</th>
                <th className="px-3 py-2 font-medium">Voiceover</th>
                <th className="px-3 py-2 font-medium">On-screen text</th>
                <th className="w-20 px-3 py-2 font-medium">Hold</th>
                <th className="w-16 px-3 py-2 font-medium" />
              </tr>
            </thead>
            <tbody>
              {script.scenes.map((scene) => (
                <tr key={scene.n} className="border-b border-white/[0.06] align-top last:border-0">
                  <td className="px-3 py-3">
                    <span className="font-mono text-[12px] text-white/40">{scene.n}</span>
                  </td>
                  <td className="px-3 py-3">
                    <p className="max-w-[190px] text-[12px] leading-snug text-white/55">{scene.visual}</p>
                    <span className="mt-1 inline-block text-[10px] uppercase tracking-[0.14em] text-white/25">
                      {scene.role} · {scene.theme}
                    </span>
                  </td>
                  <td className="px-3 py-3">
                    <textarea
                      value={scene.vo}
                      rows={2}
                      onChange={(event) => update(scene, { vo: event.target.value })}
                      className="w-full resize-none rounded-lg border border-white/10 bg-black/25 px-2 py-1.5 text-[12px] leading-snug text-white/85 outline-none focus:border-[#c89a62]/60"
                    />
                  </td>
                  <td className="px-3 py-3">
                    <textarea
                      value={scene.text}
                      rows={2}
                      onChange={(event) => update(scene, { text: event.target.value })}
                      className="w-full resize-none rounded-lg border border-white/10 bg-black/25 px-2 py-1.5 text-[12px] leading-snug text-white/85 outline-none focus:border-[#c89a62]/60"
                    />
                  </td>
                  <td className="px-3 py-3">
                    <input
                      type="number"
                      min={1}
                      max={12}
                      step={0.1}
                      value={scene.dur}
                      onChange={(event) => update(scene, { dur: Number(event.target.value) })}
                      className="w-14 rounded-lg border border-white/10 bg-black/25 px-2 py-1.5 text-[12px] text-white/85 outline-none focus:border-[#c89a62]/60"
                    />
                  </td>
                  <td className="px-3 py-3">
                    <Button
                      variant="quiet"
                      onClick={() => onChange(redoScene(script, scene.n))}
                      title="Rewrite this scene"
                    >
                      Redo
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>

      <div className="flex flex-wrap items-center gap-3">
        <Button onClick={onNext}>Record the voiceover</Button>
        <span className="text-[11px] text-white/30">
          {Math.abs(drift) > 1.5
            ? `Off target by ${drift > 0 ? "+" : ""}${drift}s — "Fit ${brief.length}s" corrects it.`
            : "Length is on target."}
        </span>
      </div>
    </div>
  );
}
