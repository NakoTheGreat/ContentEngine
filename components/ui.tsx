"use client";

import type { ReactNode } from "react";

export function Panel({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div className={`rounded-2xl border border-white/10 bg-white/[0.025] ${className}`}>{children}</div>
  );
}

export function SectionTitle({ children, hint }: { children: ReactNode; hint?: string }) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <h2 className="font-serif text-2xl leading-tight tracking-[-0.01em] text-[#f4efe7]">{children}</h2>
      {hint ? <span className="text-[11px] uppercase tracking-[0.2em] text-white/30">{hint}</span> : null}
    </div>
  );
}

export function Label({ children }: { children: ReactNode }) {
  return (
    <span className="text-[10px] font-medium uppercase tracking-[0.22em] text-white/35">{children}</span>
  );
}

export function Button({
  children,
  onClick,
  variant = "primary",
  disabled,
  className = "",
  title,
}: {
  children: ReactNode;
  onClick?: () => void;
  variant?: "primary" | "ghost" | "quiet";
  disabled?: boolean;
  className?: string;
  title?: string;
}) {
  const styles =
    variant === "primary"
      ? "bg-[#c89a62] text-[#161310] hover:bg-[#d9ab73]"
      : variant === "ghost"
        ? "border border-white/15 text-white/75 hover:border-white/35 hover:text-white"
        : "text-white/45 hover:text-white/80";
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={`rounded-full px-4 py-2 text-[13px] font-medium transition disabled:cursor-not-allowed disabled:opacity-35 ${styles} ${className}`}
    >
      {children}
    </button>
  );
}

export function Pill({ children, tone = "muted" }: { children: ReactNode; tone?: "muted" | "accent" | "good" }) {
  const styles =
    tone === "accent"
      ? "border-[#c89a62]/50 text-[#c89a62]"
      : tone === "good"
        ? "border-emerald-400/40 text-emerald-300/90"
        : "border-white/12 text-white/40";
  return (
    <span
      className={`rounded-md border px-2 py-[3px] text-[10px] uppercase tracking-[0.16em] ${styles}`}
    >
      {children}
    </span>
  );
}

export function Field({
  label,
  value,
  onChange,
  rows,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  rows?: number;
  placeholder?: string;
}) {
  const shared =
    "mt-1 w-full rounded-xl border border-white/10 bg-black/25 px-3 py-2 text-[13px] text-[#f4efe7] outline-none transition placeholder:text-white/25 focus:border-[#c89a62]/60";
  return (
    <label className="block">
      <Label>{label}</Label>
      {rows ? (
        <textarea
          value={value}
          rows={rows}
          placeholder={placeholder}
          onChange={(event) => onChange(event.target.value)}
          className={`${shared} resize-none leading-relaxed`}
        />
      ) : (
        <input
          value={value}
          placeholder={placeholder}
          onChange={(event) => onChange(event.target.value)}
          className={shared}
        />
      )}
    </label>
  );
}

export function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-6 border-b border-white/[0.06] py-2 last:border-0">
      <span className="shrink-0 text-[11px] uppercase tracking-[0.18em] text-white/35">{label}</span>
      <span className="text-right text-[13px] leading-snug text-white/80">{children}</span>
    </div>
  );
}

/** Renders **bold** spans inside a chat message. */
export function RichText({ text }: { text: string }) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return (
    <span>
      {parts.map((part, index) =>
        part.startsWith("**") && part.endsWith("**") ? (
          <strong key={index} className="font-semibold text-[#c89a62]">
            {part.slice(2, -2)}
          </strong>
        ) : (
          <span key={index}>{part}</span>
        ),
      )}
    </span>
  );
}
