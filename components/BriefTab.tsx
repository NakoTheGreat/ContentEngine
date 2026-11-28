"use client";

import { useState } from "react";
import type { Brief } from "@/lib/pipeline/types";
import { Button, Label, Panel, Pill, Row, SectionTitle } from "./ui";

const EXAMPLES = [
  "An ad for my custom graphics studio, 20 seconds, for small business owners",
  "Launch our new packaging design service, bold tone, TikTok and Reels",
  "Get more booked calls for our brand identity work, premium feel, 15s",
];

type Props = {
  brief: Brief | null;
  onCreate: (request: string) => void;
  onPatch: (patch: Partial<Brief>) => void;
  onNext: () => void;
  busy: boolean;
};

export function BriefTab({ brief, onCreate, onPatch, onNext, busy }: Props) {
  const [request, setRequest] = useState(brief?.request ?? "");

  return (
    <div className="space-y-6">
      <div>
        <SectionTitle hint="Stage 1">Intake</SectionTitle>
        <p className="mt-2 max-w-xl text-[13px] leading-relaxed text-white/45">
          Say what the ad is for in plain English. I turn it into a structured brief and fill any
          gaps with defaults you can override below.
        </p>
      </div>

      <Panel className="p-4">
        <Label>Your request</Label>
        <textarea
          value={request}
          rows={3}
          maxLength={280}
          placeholder="An ad for my custom graphics studio, 20 seconds, aimed at small business owners…"
          onChange={(event) => setRequest(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter" && !event.shiftKey) {
              event.preventDefault();
              if (request.trim()) onCreate(request.trim());
            }
          }}
          className="mt-2 w-full resize-none rounded-xl border border-white/10 bg-black/30 px-3 py-2.5 text-[14px] leading-relaxed text-[#f4efe7] outline-none transition placeholder:text-white/25 focus:border-[#c89a62]/60"
        />
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <Button onClick={() => onCreate(request.trim())} disabled={!request.trim() || busy}>
            {brief ? "Rebuild brief" : "Draft the brief"}
          </Button>
          {EXAMPLES.map((example) => (
            <button
              key={example}
              type="button"
              onClick={() => setRequest(example)}
              className="rounded-full border border-white/10 px-3 py-1.5 text-[11px] text-white/40 transition hover:border-[#c89a62]/40 hover:text-[#c89a62]"
            >
              {example.split(",")[0]}
            </button>
          ))}
        </div>
      </Panel>

      {brief ? (
        <>
          <Panel className="divide-y divide-white/[0.06] px-4 py-2">
            <Row label="Business">
              <input
                value={brief.business}
                onChange={(event) => onPatch({ business: event.target.value })}
                className="w-full bg-transparent text-right text-[13px] text-white/80 outline-none"
              />
            </Row>
            <Row label="Offer">
              <input
                value={brief.offer}
                onChange={(event) => onPatch({ offer: event.target.value })}
                className="w-full bg-transparent text-right text-[13px] text-white/80 outline-none"
              />
            </Row>
            <Row label="Audience">
              <input
                value={brief.audience}
                onChange={(event) => onPatch({ audience: event.target.value })}
                className="w-full bg-transparent text-right text-[13px] text-white/80 outline-none"
              />
            </Row>
            <Row label="Goal">
              <input
                value={brief.goal}
                onChange={(event) => onPatch({ goal: event.target.value })}
                className="w-full bg-transparent text-right text-[13px] text-white/80 outline-none"
              />
            </Row>
            <Row label="Tone">
              <input
                value={brief.tone}
                onChange={(event) => onPatch({ tone: event.target.value })}
                className="w-full bg-transparent text-right text-[13px] text-white/80 outline-none"
              />
            </Row>
            <Row label="Platform">{brief.platform}</Row>
            <Row label="Length">
              <input
                type="number"
                min={8}
                max={60}
                value={brief.length}
                onChange={(event) => onPatch({ length: Number(event.target.value) })}
                className="w-16 bg-transparent text-right text-[13px] text-white/80 outline-none"
              />
            </Row>
          </Panel>

          <div className="flex flex-wrap items-center gap-2">
            {brief.assumptions.length ? (
              <>
                <Label>Filled in for you</Label>
                {brief.assumptions.map((field) => (
                  <Pill key={field}>{field}</Pill>
                ))}
              </>
            ) : (
              <Pill tone="good">Everything came from your request</Pill>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Button onClick={onNext}>Next — scout formats</Button>
            <span className="text-[11px] text-white/30">
              Saved to pipeline/{brief.project}/brief.json
            </span>
          </div>
        </>
      ) : null}
    </div>
  );
}
