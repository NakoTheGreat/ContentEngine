"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { askLead, type AgentAction, type PipelineSnapshot } from "@/lib/lead/agent";
import { buildBrief, patchBrief } from "@/lib/pipeline/brief";
import { FORMAT_BY_ID } from "@/lib/pipeline/formats";
import { buildScript, redoScene } from "@/lib/pipeline/script";
import type {
  AdFormat,
  Brief,
  ChatMessage,
  ExportRecord,
  FormatId,
  Script,
  StageData,
  StageId,
  Voice,
} from "@/lib/pipeline/types";
import { AnimationTab } from "./AnimationTab";
import { BriefTab } from "./BriefTab";
import { ChatPanel } from "./ChatPanel";
import { ExportTab } from "./ExportTab";
import { FormatsTab } from "./FormatsTab";
import { ScriptTab } from "./ScriptTab";
import { VoiceTab } from "./VoiceTab";
import { Pill } from "./ui";

const STAGES: Array<{ id: StageId; label: string; short: string }> = [
  { id: "brief", label: "Brief", short: "1" },
  { id: "formats", label: "Formats", short: "2" },
  { id: "script", label: "Script", short: "3" },
  { id: "voice", label: "Voice", short: "4" },
  { id: "animation", label: "Animation", short: "5" },
  { id: "export", label: "Export", short: "6" },
];

const STORE_KEY = "ad-studio:last-project";

const id = () => Math.random().toString(36).slice(2, 10);

export function Studio() {
  const [brief, setBrief] = useState<Brief | null>(null);
  const [format, setFormat] = useState<AdFormat | null>(null);
  const [script, setScript] = useState<Script | null>(null);
  const [voice, setVoice] = useState<Voice | null>(null);
  const [exported, setExported] = useState<ExportRecord | null>(null);
  const [tab, setTab] = useState<StageId>("brief");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [revision, setRevision] = useState(0);
  const [renderToken, setRenderToken] = useState(0);
  const restoredRef = useRef(false);

  const project = brief?.project ?? "";

  const pushLead = useCallback((text: string) => {
    setMessages((current) => [
      ...current,
      { id: id(), role: "lead", text, at: new Date().toISOString() },
    ]);
  }, []);

  const notify = useCallback((text: string) => {
    setNotice(text);
    window.setTimeout(() => setNotice(null), 5000);
  }, []);

  const save = useCallback(async (stage: string, data: unknown, projectId: string) => {
    if (!projectId) return;
    try {
      await fetch("/api/stage", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ project: projectId, stage, data }),
      });
    } catch {
      // The pipeline still works in memory if the write fails.
    }
  }, []);

  // Persist each stage to its own file.
  useEffect(() => {
    if (brief) void save("brief", brief, brief.project);
  }, [brief, save]);

  useEffect(() => {
    if (brief && format) void save("formats", format, brief.project);
  }, [brief, format, save]);

  useEffect(() => {
    if (brief && script) void save("script", script, brief.project);
  }, [brief, script, save]);

  useEffect(() => {
    if (brief && voice) void save("voice", voice, brief.project);
  }, [brief, voice, save]);

  useEffect(() => {
    if (brief && script && voice) {
      void save(
        "animation",
        {
          timeline: script.scenes.map((scene) => ({
            n: scene.n,
            dur: scene.dur,
            graphic: scene.graphic,
            theme: scene.theme,
          })),
          total: script.total,
          voiceMode: voice.mode,
          palette: "ink/paper + bronze",
          typeface: "Instrument Serif + Inter",
          easing: "cubic-out",
          generatedAt: new Date().toISOString(),
        },
        brief.project,
      );
    }
  }, [brief, script, voice, save]);

  useEffect(() => {
    if (!brief) return;
    window.localStorage.setItem(STORE_KEY, brief.project);
    void save("chat", messages, brief.project);
  }, [brief, messages, save]);

  // Restore the last project so a stage can be re-run on its own.
  useEffect(() => {
    if (restoredRef.current) return;
    restoredRef.current = true;
    const last = window.localStorage.getItem(STORE_KEY);
    if (!last) return;
    fetch(`/api/stage?project=${encodeURIComponent(last)}`)
      .then((response) => response.json())
      .then((payload: { data?: StageData & { chat?: ChatMessage[] } }) => {
        const data = payload.data;
        if (!data?.brief) return;
        setBrief(data.brief);
        if (data.format) setFormat(data.format);
        if (data.script) setScript(data.script);
        if (data.voice) setVoice(data.voice);
        if (data.export) setExported(data.export);
        if (Array.isArray(data.chat)) setMessages(data.chat);
        setTab(data.voice ? "export" : data.script ? "script" : "formats");
      })
      .catch(() => undefined);
  }, []);

  const createBrief = (request: string) => {
    const next = buildBrief(request);
    setBrief(next);
    setFormat(null);
    setScript(null);
    setVoice(null);
    setExported(null);
    setTab("formats");
    pushLead(
      `**Stage 1 · Intake** — ${next.offer}. Audience: ${next.audience.toLowerCase()}. Goal: ${next.goal.toLowerCase()}.\n` +
        `**Defaults:** ${next.length}s on ${next.platform}, tone ${next.tone.toLowerCase()}.${
          next.assumptions.length ? ` Filled in: ${next.assumptions.join(", ")}.` : ""
        }\n**Next:** five formats that can be built in code — pick one.`,
    );
  };

  const updateBrief = (patch: Partial<Brief>) => {
    if (!brief) return;
    const next = patchBrief(brief, patch);
    setBrief(next);
    if (script && format) {
      setScript(buildScript(next, format));
      setVoice(null);
      setTab("script");
    }
  };

  const chooseFormat = (formatId: FormatId) => {
    if (!brief) return;
    const chosen = FORMAT_BY_ID[formatId];
    const nextScript = buildScript(brief, chosen);
    setFormat(chosen);
    setScript(nextScript);
    setVoice(null);
    setTab("script");
    pushLead(
      `**Stage 3 · Format** — ${chosen.name} (${chosen.length}), built for ${brief.audience.toLowerCase()}.\n` +
        `**Stage 4 · Script** — ${nextScript.scenes.length} scenes, ${nextScript.total}s, hook at 0s, CTA last. Edit any cell.`,
    );
  };

  const updateScript = (next: Script) => {
    const changed = script ? Math.abs(next.total - script.total) > 0.05 || next.scenes.length !== script.scenes.length : false;
    setScript(next);
    if (changed && voice) {
      setVoice(null);
      notify("Script timing changed, so the voiceover take no longer matches — re-record it.");
    }
  };

  const applyVoice = (next: Voice) => {
    setVoice(next);
    setTab("animation");
    pushLead(
      next.mode === "elevenlabs"
        ? `**Stage 5 · Voice** — ${next.voiceName}, ${next.clips.length} clips, ${next.total}s, timestamps measured from the audio.\n` +
            "**Stage 6 · Animation** — scene lengths now come from the real clips, so captions cannot drift."
        : `**Stage 5 · Voice** — captions-only run (${next.total}s). No audio key needed.\n` +
            "**Stage 6 · Animation** — scenes follow the script timings; the export gets a music bed.",
    );
  };

  const redo = (scene: number) => {
    if (!script) return;
    setScript(redoScene(script, scene));
    setVoice(null);
    setRevision((value) => value + 1);
    notify(`Scene ${scene} rewritten — voiceover needs a regenerate.`);
  };

  const applyActions = (actions: AgentAction[]) => {
    actions.forEach((action) => {
      switch (action.kind) {
        case "brief":
          setBrief(action.brief);
          break;
        case "format":
          setFormat(action.format);
          break;
        case "script":
          setScript(action.script);
          break;
        case "voice":
          setVoice(null);
          break;
        case "goto":
          setTab(action.stage);
          break;
        case "export":
          setTab("export");
          setRenderToken((value) => value + 1);
          break;
        default:
          break;
      }
    });
  };

  const canOpen = (stage: StageId): boolean => {
    if (stage === "brief") return true;
    if (!brief) return false;
    if (stage === "formats") return true;
    if (stage === "script") return Boolean(script);
    if (stage === "voice") return Boolean(script);
    if (stage === "animation") return Boolean(script && voice);
    return Boolean(script && voice);
  };

  const send = (text: string) => {
    if (!text.trim()) return;
    setBusy(true);
    setMessages((current) => [
      ...current,
      { id: id(), role: "user", text, at: new Date().toISOString() },
    ]);
    const snapshot: PipelineSnapshot = {
      brief,
      format,
      script,
      voiceReady: Boolean(voice),
      exported: Boolean(exported),
      stage: tab,
    };
    const reply = askLead(text, snapshot);
    window.setTimeout(() => {
      pushLead(reply.text);
      applyActions(reply.actions);
      setBusy(false);
    }, 220);
  };

  const revise = (instruction: string) => {
    send(instruction);
    setRevision((value) => value + 1);
  };

  const snapshotForChat = useMemo(() => messages, [messages]);

  return (
    <div className="min-h-screen bg-[#0b0a09] text-[#f4efe7]">
      <div className="mx-auto flex max-w-[1560px] flex-col gap-6 px-4 py-6 lg:px-6">
        <header className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-[10px] font-medium uppercase tracking-[0.32em] text-[#c89a62]">
              Ad Studio
            </p>
            <h1 className="mt-1 font-serif text-[26px] leading-tight tracking-[-0.01em]">
              {brief ? brief.offer : "One brief in. One ad out."}
            </h1>
            <p className="mt-1 text-[12px] text-white/35">
              {brief
                ? `${brief.business} · ${brief.length}s · ${brief.platform}`
                : "Short-form, 9:16, code-generated motion graphics."}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {brief ? <Pill>{brief.project}</Pill> : null}
            {exported ? <Pill tone="good">delivered</Pill> : null}
            {project ? <Pill>{project}.json files saved</Pill> : null}
          </div>
        </header>

        <div className="flex flex-col gap-6 xl:flex-row">
          <main className="min-w-0 flex-1">
            <nav className="mb-5 flex flex-wrap gap-1.5 rounded-2xl border border-white/10 bg-white/[0.02] p-1.5">
              {STAGES.map((stage, index) => {
                const available = canOpen(stage.id);
                const active = tab === stage.id;
                return (
                  <button
                    key={stage.id}
                    type="button"
                    onClick={() => available && setTab(stage.id)}
                    disabled={!available}
                    className={`flex flex-1 items-center justify-center gap-2 rounded-xl px-3 py-2 text-[12.5px] transition ${
                      active
                        ? "bg-[#c89a62] text-[#161310]"
                        : available
                          ? "text-white/55 hover:bg-white/5 hover:text-white"
                          : "cursor-not-allowed text-white/20"
                    }`}
                  >
                    <span
                      className={`grid h-5 w-5 place-items-center rounded-full border text-[10px] ${
                        active ? "border-[#161310]/30" : "border-white/15"
                      }`}
                    >
                      {index + 1}
                    </span>
                    {stage.label}
                  </button>
                );
              })}
            </nav>

            <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-5">
              {tab === "brief" ? (
                <BriefTab
                  brief={brief}
                  onCreate={createBrief}
                  onPatch={updateBrief}
                  onNext={() => setTab("formats")}
                  busy={busy}
                />
              ) : null}

              {tab === "formats" && brief ? (
                <FormatsTab
                  chosen={format?.id ?? null}
                  onChoose={chooseFormat}
                  onNext={() => script && setTab("script")}
                />
              ) : null}

              {tab === "script" && brief && script ? (
                <ScriptTab
                  brief={brief}
                  script={script}
                  onChange={updateScript}
                  onNext={() => setTab("voice")}
                />
              ) : null}

              {tab === "voice" && brief && script ? (
                <VoiceTab
                  brief={brief}
                  script={script}
                  voice={voice}
                  onVoice={applyVoice}
                  onNext={() => setTab("animation")}
                  notify={notify}
                />
              ) : null}

              {tab === "animation" && brief && script && voice ? (
                <AnimationTab
                  brief={brief}
                  script={script}
                  voice={voice}
                  revision={revision}
                  onRedo={redo}
                  onRerun={() => setRevision((value) => value + 1)}
                  onNext={() => {
                    setRevision((value) => value + 1);
                    setTab("export");
                    pushLead(
                      "**Stage 7 · QA** — Checking sync, safe area, hook timing and length, then rendering the MP4.\n" +
                        "**Stage 8 · Delivery** — Tell me \"punchier hook\" or \"swap the voice\" and only those stages re-run.",
                    );
                  }}
                />
              ) : null}

              {tab === "export" && brief && script && voice ? (
                <ExportTab
                  brief={brief}
                  script={script}
                  voice={voice}
                  renderToken={renderToken}
                  onExported={(record) => {
                    setExported(record);
                    pushLead(
                      `**Stage 7 · QA** — ${record.qa.filter((item) => item.pass).length}/${record.qa.length} checks passing · ${record.width}×${record.height} · ${record.duration}s.\n` +
                        `**Stage 8 · Delivery** — ${record.file} is ready at ${(record.bytes / 1024 / 1024).toFixed(
                          1,
                        )} MB. Tell me what to change.`,
                    );
                  }}
                  onRevise={revise}
                  notify={notify}
                />
              ) : null}

              {!brief ? (
                <div className="py-12 text-center">
                  <p className="text-[13px] text-white/40">
                    Start with the Brief tab, or just tell the Lead AI what the ad is for.
                  </p>
                </div>
              ) : null}
            </div>
          </main>

          <aside className="w-full shrink-0 xl:w-[360px]">
            <div className="xl:sticky xl:top-6 xl:h-[calc(100vh-3rem)]">
              <ChatPanel messages={snapshotForChat} onSend={send} disabled={busy} />
            </div>
          </aside>
        </div>
      </div>

      {notice ? (
        <div className="pointer-events-none fixed bottom-5 left-1/2 z-50 -translate-x-1/2 rounded-full border border-white/15 bg-black/85 px-4 py-2 text-[12px] text-white/80 backdrop-blur">
          {notice}
        </div>
      ) : null}
    </div>
  );
}
