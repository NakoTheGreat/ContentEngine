"use client";

import { FORMATS } from "@/lib/pipeline/formats";
import type { FormatId } from "@/lib/pipeline/types";
import { Button, Panel, Pill, SectionTitle } from "./ui";

type Props = {
  chosen: FormatId | null;
  onChoose: (id: FormatId) => void;
  onNext: () => void;
};

export function FormatsTab({ chosen, onChoose, onNext }: Props) {
  return (
    <div className="space-y-6">
      <div>
        <SectionTitle hint="Stage 2 + 3">Formats working right now</SectionTitle>
        <p className="mt-2 max-w-xl text-[13px] leading-relaxed text-white/45">
          Five short-form structures pulled from current trend reporting, filtered to the ones that can
          be built entirely from code-generated motion graphics. Pick one — I don&apos;t move on without it.
        </p>
      </div>

      <ol className="space-y-3">
        {FORMATS.map((format, index) => {
          const active = chosen === format.id;
          return (
            <li key={format.id}>
              <Panel
                className={`p-4 transition ${
                  active ? "border-[#c89a62]/60 bg-[#c89a62]/[0.06]" : "hover:border-white/20"
                }`}
              >
                <div className="flex items-start gap-4">
                  <span
                    className={`mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-full border text-[12px] ${
                      active
                        ? "border-[#c89a62] bg-[#c89a62] text-[#161310]"
                        : "border-white/20 text-white/45"
                    }`}
                  >
                    {index + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                      <h3 className="text-[15px] font-medium text-[#f4efe7]">{format.name}</h3>
                      <span className="text-[11px] uppercase tracking-[0.16em] text-[#c89a62]/80">
                        {format.length}
                      </span>
                    </div>
                    <p className="mt-1 text-[13px] leading-relaxed text-white/60">{format.oneLiner}</p>
                    <p className="mt-2 text-[12px] leading-relaxed text-white/35">
                      <span className="text-white/50">Why now — </span>
                      {format.why}{" "}
                      <a
                        href={format.source.url}
                        target="_blank"
                        rel="noreferrer"
                        className="text-[#c89a62]/80 underline decoration-[#c89a62]/30 underline-offset-2 hover:text-[#c89a62]"
                      >
                        {format.source.label}
                      </a>
                    </p>
                  </div>
                  <Button
                    variant={active ? "quiet" : "ghost"}
                    onClick={() => onChoose(format.id)}
                    className="shrink-0"
                  >
                    {active ? "Chosen" : "Choose"}
                  </Button>
                </div>
              </Panel>
            </li>
          );
        })}
      </ol>

      <div className="flex flex-wrap items-center gap-3">
        <Button onClick={onNext} disabled={!chosen}>
          Write the script
        </Button>
        {!chosen ? <Pill>Pick a format to continue</Pill> : null}
        <span className="text-[11px] text-white/30">Saved to formats.json</span>
      </div>
    </div>
  );
}
