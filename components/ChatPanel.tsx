"use client";

import { useEffect, useRef, useState } from "react";
import type { ChatMessage } from "@/lib/pipeline/types";
import { RichText } from "./ui";

const QUICK = ["Status", "Make the hook punchier", "Swap the voice", "Shorter", "Render it"];

type Props = {
  messages: ChatMessage[];
  onSend: (text: string) => void;
  disabled?: boolean;
};

export function ChatPanel({ messages, onSend, disabled }: Props) {
  const [draft, setDraft] = useState("");
  const endRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages.length]);

  const submit = () => {
    const text = draft.trim();
    if (!text) return;
    onSend(text);
    setDraft("");
  };

  return (
    <div className="flex h-full min-h-[420px] flex-col rounded-2xl border border-white/10 bg-[#100e0c]">
      <div className="flex items-center gap-2 border-b border-white/10 px-4 py-3">
        <span className="grid h-7 w-7 place-items-center rounded-full bg-[#c89a62] text-[11px] font-semibold text-[#161310]">
          L
        </span>
        <div className="min-w-0">
          <p className="text-[13px] font-medium text-[#f4efe7]">Lead AI</p>
          <p className="text-[10px] uppercase tracking-[0.18em] text-white/30">steer any stage</p>
        </div>
      </div>

      <div className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
        {messages.length === 0 ? (
          <p className="text-[12px] leading-relaxed text-white/35">
            Tell me what the ad is for — or what to change. I only move one stage at a time and I never
            skip a decision.
          </p>
        ) : null}
        {messages.map((message) => (
          <div
            key={message.id}
            className={`max-w-[95%] rounded-2xl px-3 py-2 text-[12.5px] leading-relaxed ${
              message.role === "lead"
                ? "bg-white/[0.04] text-white/75"
                : "ml-auto bg-[#c89a62] text-[#161310]"
            }`}
          >
            <RichText text={message.text} />
          </div>
        ))}
        <div ref={endRef} />
      </div>

      <div className="border-t border-white/10 p-3">
        <div className="mb-2 flex flex-wrap gap-1.5">
          {QUICK.map((action) => (
            <button
              key={action}
              type="button"
              onClick={() => onSend(action)}
              disabled={disabled}
              className="rounded-full border border-white/10 px-2.5 py-1 text-[10.5px] text-white/40 transition hover:border-[#c89a62]/40 hover:text-[#c89a62] disabled:opacity-40"
            >
              {action}
            </button>
          ))}
        </div>
        <div className="flex items-end gap-2">
          <textarea
            value={draft}
            rows={2}
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                submit();
              }
            }}
            placeholder="make the hook punchier"
            className="flex-1 resize-none rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-[12.5px] text-[#f4efe7] outline-none placeholder:text-white/25 focus:border-[#c89a62]/60"
          />
          <button
            type="button"
            onClick={submit}
            disabled={disabled}
            className="rounded-xl bg-[#c89a62] px-3 py-2 text-[12px] font-medium text-[#161310] transition hover:bg-[#d9ab73] disabled:opacity-40"
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
}
