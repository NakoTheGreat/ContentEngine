"use client";

import { useMemo, useState } from "react";
import { composeScenes, slugify } from "@/lib/compose";
import { buildDocument } from "@/lib/document";
import { GRAPHIC_NAMES } from "@/lib/graphics";

const START_PROMPT = "Launch our AI podcast studio for creators";
const EXAMPLES = [
  "Launch our AI podcast studio",
  "Three tools that ship faster",
  "Announce the new analytics dashboard",
];

export default function Page() {
  const [prompt, setPrompt] = useState(START_PROMPT);
  const [scenes, setScenes] = useState(() => composeScenes(START_PROMPT));
  const [frame, setFrame] = useState(0);

  const html = useMemo(() => buildDocument(scenes, { title: prompt || "Content Engine" }), [
    scenes,
    prompt,
  ]);

  const generate = () => {
    const next = composeScenes(prompt);
    setScenes(next);
    setFrame((n) => n + 1);
  };

  const download = () => {
    const blob = new Blob([html], { type: "text/html;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${slugify(prompt)}.html`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  };

  const graphics = scenes.map((scene) => GRAPHIC_NAMES[scene.v]);

  return (
    <main className="min-h-screen bg-[#0b0a09] text-[#f4efe7]">
      <div className="mx-auto flex min-h-screen w-full max-w-6xl flex-col gap-10 px-5 py-8 lg:flex-row lg:items-center lg:gap-14 lg:py-12">
        <section className="w-full lg:max-w-md">
          <p className="text-[11px] font-medium uppercase tracking-[0.34em] text-[#c89a62]">
            Content Engine
          </p>
          <h1 className="mt-4 font-serif text-4xl leading-[1.05] tracking-[-0.02em] sm:text-5xl">
            Type a prompt.
            <br />
            <span className="italic text-[#c89a62]">Get an animation.</span>
          </h1>
          <p className="mt-4 max-w-sm text-sm leading-relaxed text-white/55">
            Your prompt is composed into four scenes, drawn with the engine&apos;s motion
            primitives, and packaged as one self-contained HTML file.
          </p>

          <label
            htmlFor="prompt"
            className="mt-8 block text-[11px] font-medium uppercase tracking-[0.24em] text-white/40"
          >
            Prompt
          </label>
          <textarea
            id="prompt"
            value={prompt}
            onChange={(event) => setPrompt(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                generate();
              }
            }}
            rows={3}
            maxLength={140}
            placeholder="A short idea, launch or announcement…"
            className="mt-2 w-full resize-none rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-[15px] leading-relaxed text-[#f4efe7] outline-none transition placeholder:text-white/25 focus:border-[#c89a62]/70 focus:bg-white/[0.05]"
          />

          <div className="mt-3 flex flex-wrap gap-2">
            {EXAMPLES.map((example) => (
              <button
                key={example}
                type="button"
                onClick={() => {
                  setPrompt(example);
                  setScenes(composeScenes(example));
                  setFrame((n) => n + 1);
                }}
                className="rounded-full border border-white/10 px-3 py-1.5 text-[11px] text-white/50 transition hover:border-[#c89a62]/50 hover:text-[#c89a62]"
              >
                {example}
              </button>
            ))}
          </div>

          <div className="mt-6 flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={generate}
              disabled={!prompt.trim()}
              className="rounded-full bg-[#c89a62] px-6 py-3 text-sm font-medium text-[#161310] transition hover:bg-[#d9ab73] disabled:cursor-not-allowed disabled:opacity-40"
            >
              Generate animation
            </button>
            <button
              type="button"
              onClick={download}
              className="rounded-full border border-white/15 px-5 py-3 text-sm text-white/70 transition hover:border-white/35 hover:text-white"
            >
              Download .html
            </button>
          </div>

          <div className="mt-8 flex flex-wrap items-center gap-2 text-[11px] uppercase tracking-[0.16em] text-white/30">
            {graphics.map((name, index) => (
              <span key={`${name}-${index}`} className="rounded-md border border-white/10 px-2 py-1">
                {name}
              </span>
            ))}
          </div>

          <p className="mt-6 text-[11px] leading-relaxed text-white/25">
            Preview controls: Space pause · ← → scenes · R restart · H hide UI
          </p>
        </section>

        <section className="flex flex-1 justify-center">
          <div className="w-full max-w-[360px] overflow-hidden rounded-[28px] border border-white/10 bg-black shadow-[0_30px_80px_-30px_rgba(0,0,0,0.9)]">
            <div className="aspect-[9/16]">
              <iframe
                key={frame}
                title="Animation preview"
                srcDoc={html}
                className="h-full w-full border-0"
              />
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
