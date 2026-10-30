"use client";

import { useLenis } from "lenis/react";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { JudgeAvatar } from "@/components/judge-avatar";
import type { DebateEngine, PlayerSnapshot } from "@/lib/client/debate-engine";
import { JUDGES, JUDGE_ORDER, type JudgeId } from "@/lib/judges";
import { gradeFor } from "@/lib/rubric";
import type { Debate } from "@/lib/types";
import { cn } from "@/lib/utils";
import { TypedText } from "./caption";
import { Waveform } from "./waveform";

// Each judge's seat angle around the table — the "camera" whips in from that side.
const ANGLE = Object.fromEntries(
  JUDGE_ORDER.map((id, i) => [id, -90 + (i * 360) / JUDGE_ORDER.length]),
) as Record<JudgeId, number>;

function useElapsed() {
  const [s, setS] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setS((v) => v + 1), 1000);
    return () => clearInterval(id);
  }, []);
  return `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
}

/** The user's own tile. Webcam only after they click the camera button; never leaves the browser. */
function useWebcam() {
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [error, setError] = useState("");
  const toggle = async () => {
    if (stream) {
      stream.getTracks().forEach((t) => t.stop());
      setStream(null);
      return;
    }
    try {
      setStream(await navigator.mediaDevices.getUserMedia({ video: { width: 640, height: 360 }, audio: false }));
      setError("");
    } catch {
      setError("Camera blocked");
    }
  };
  useEffect(() => () => stream?.getTracks().forEach((t) => t.stop()), [stream]);
  return { stream, error, toggle };
}

function YouTile({ stream, className }: { stream: MediaStream | null; className?: string }) {
  const video = useRef<HTMLVideoElement>(null);
  useEffect(() => {
    if (video.current) video.current.srcObject = stream;
  }, [stream]);
  return (
    <div className={cn("relative overflow-hidden border-[3px] border-cream/30 bg-teal-deep", className)}>
      {stream ? (
        <video ref={video} autoPlay muted playsInline className="h-full w-full -scale-x-100 object-cover" />
      ) : (
        <div className="flex h-full w-full items-center justify-center">
          <span className="flex aspect-square h-1/2 max-h-20 items-center justify-center border-[3px] border-cream bg-ink font-display text-2xl font-black text-cream">
            YOU
          </span>
        </div>
      )}
      <span className="absolute bottom-1 left-1 bg-ink/80 px-1.5 py-0.5 font-mono text-[9px] font-bold uppercase tracking-widest text-cream">
        You · muted
      </span>
    </div>
  );
}

function JudgeTile({
  id,
  active,
  speaking,
  calledOut,
  vote,
  analyser,
  className,
}: {
  id: JudgeId;
  active: boolean;
  speaking: boolean;
  calledOut: boolean;
  vote: number | null;
  analyser: AnalyserNode | null;
  className?: string;
}) {
  const j = JUDGES[id];
  return (
    <motion.div
      layout
      className={cn(
        "relative overflow-hidden border-[3px] transition-colors",
        active ? "border-coral shadow-[0_0_0_3px_var(--coral)]" : "border-cream/30",
        className,
      )}
      style={{ backgroundColor: j.color }}
    >
      <div className="bg-halftone absolute inset-0 opacity-15" />
      <div className="relative flex h-full w-full items-center justify-center">
        <JudgeAvatar id={id} talking={active && speaking} framed={false} className="h-[70%]" />
      </div>
      <span className="absolute bottom-1 left-1 bg-ink/85 px-1.5 py-0.5 font-mono text-[9px] font-bold uppercase tracking-widest text-cream">
        {j.short}
      </span>
      {active && (
        <span className="absolute right-1 top-1 bg-ink/85 px-1 py-0.5">
          <Waveform active={speaking} analyser={analyser} bars={5} className="h-3 [&>span]:bg-coral" />
        </span>
      )}
      {calledOut && (
        <span className="absolute left-1 top-1 border-2 border-ink bg-coral px-1 font-mono text-[8px] font-bold uppercase tracking-widest text-ink">
          Called out
        </span>
      )}
      {vote != null && (
        <span className="absolute right-1 top-1 -rotate-6 border-2 border-ink bg-paper px-1 font-display text-sm font-black text-ink">
          {vote}/10
        </span>
      )}
    </motion.div>
  );
}

export function CallView({
  engine,
  snap,
  debate,
  onLeave,
}: {
  engine: DebateEngine;
  snap: PlayerSnapshot;
  debate: Debate;
  onLeave: () => void;
}) {
  const lenis = useLenis();
  const elapsed = useElapsed();
  const cam = useWebcam();
  const [view, setView] = useState<"speaker" | "gallery">("speaker");
  const lines = snap.lines;
  const line = snap.index >= 0 && snap.index < lines.length ? lines[snap.index] : null;
  const speaking = snap.status === "playing";
  const done = snap.status === "done";
  const grade = gradeFor(debate.overall);

  // Freeze page scroll while on the call; Esc hangs up.
  useEffect(() => {
    lenis?.stop();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onLeave();
    window.addEventListener("keydown", onKey);
    return () => {
      lenis?.start();
      window.removeEventListener("keydown", onKey);
    };
  }, [lenis, onLeave]);

  const a = line ? (ANGLE[line.speaker] * Math.PI) / 180 : 0;
  const tiles = JUDGE_ORDER.map((id) => ({
    id,
    active: line?.speaker === id && !done,
    calledOut: !done && line?.replyTo === id,
    vote: done && id !== "chair" ? debate.votes[id] : null,
  }));

  return (
    <motion.div
      data-lenis-prevent
      initial={{ opacity: 0, scale: 1.04 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.98 }}
      transition={{ duration: 0.3 }}
      className="fixed inset-0 z-[85] flex flex-col bg-ink text-cream"
    >
      {/* Top bar */}
      <div className="flex items-center justify-between gap-3 border-b-[3px] border-cream/20 px-4 py-2.5">
        <div className="flex min-w-0 items-center gap-3">
          <span className="flex items-center gap-1.5 border-2 border-coral px-1.5 py-0.5 font-mono text-[10px] font-bold uppercase tracking-widest text-coral">
            <span className="h-2 w-2 animate-blink rounded-full bg-coral" /> Rec
          </span>
          <p className="truncate font-display text-xl font-black uppercase leading-none">
            Hackmuse panel · {debate.title}
          </p>
        </div>
        <div className="flex items-center gap-3 font-mono text-[11px] font-bold uppercase tracking-widest">
          <span className="tabular-nums text-cream/70">{elapsed}</span>
          <span className="hidden text-cream/70 sm:inline">{JUDGE_ORDER.length + 1} in call</span>
          <div className="flex border-2 border-cream/40">
            {(["speaker", "gallery"] as const).map((v) => (
              <button
                key={v}
                data-cursor={v}
                onClick={() => setView(v)}
                className={cn("px-2 py-1", view === v ? "bg-cream text-ink" : "text-cream/70 hover:text-cream")}
              >
                {v}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Stage */}
      <div className="relative flex min-h-0 flex-1 gap-3 p-3">
        {view === "speaker" ? (
          <>
            <div className="relative min-w-0 flex-1 overflow-hidden border-[3px] border-cream/30 bg-teal-deep">
              <AnimatePresence initial={false} mode="popLayout">
                {line && !done ? (
                  <motion.div
                    key={snap.index}
                    className="absolute inset-0"
                    style={{ backgroundColor: JUDGES[line.speaker].color }}
                    // The camera whips in from the speaker's side of the table.
                    initial={{ x: `${Math.cos(a) * 35}%`, y: `${Math.sin(a) * 25}%`, scale: 1.3, opacity: 0, filter: "blur(12px)" }}
                    animate={{ x: 0, y: 0, scale: 1, opacity: 1, filter: "blur(0px)" }}
                    exit={{ opacity: 0, scale: 1.06, filter: "blur(8px)" }}
                    transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
                  >
                    <div className="bg-halftone absolute inset-0 opacity-15" />
                    {/* slow push-in while they talk */}
                    <motion.div
                      className="absolute inset-x-0 bottom-[16%] top-[6%] flex items-end justify-center"
                      initial={{ scale: 1 }}
                      animate={{ scale: 1.08 }}
                      transition={{ duration: 9, ease: "linear" }}
                      style={{ transformOrigin: "50% 100%" }}
                    >
                      <JudgeAvatar id={line.speaker} talking={speaking} framed={false} className="h-full" />
                    </motion.div>
                    {/* desk */}
                    <div className="absolute inset-x-0 bottom-0 h-[16%] border-t-[4px] border-ink bg-teal-deep">
                      <div className="bg-hatch h-2 w-full text-ink/60" />
                    </div>
                    {/* name plate */}
                    <div className="absolute bottom-[19%] left-4 border-[3px] border-ink bg-paper px-3 py-1.5 text-ink shadow-[4px_4px_0_0_var(--blood)]">
                      <p className="font-display text-2xl font-black uppercase leading-none">{JUDGES[line.speaker].name}</p>
                      <p className="font-mono text-[10px] font-bold uppercase tracking-widest text-ink/70">
                        {JUDGES[line.speaker].role} · {line.cue}
                      </p>
                    </div>
                    {line.replyTo && (
                      <div className="absolute right-4 top-4 flex items-center gap-2 border-[3px] border-ink bg-coral px-2 py-1 text-ink">
                        <JudgeAvatar id={line.replyTo} className="w-7" />
                        <span className="font-mono text-[10px] font-bold uppercase tracking-widest">
                          Answering {JUDGES[line.replyTo].short}
                        </span>
                      </div>
                    )}
                  </motion.div>
                ) : (
                  <motion.div
                    key={done ? "verdict" : "waiting"}
                    className="absolute inset-0 flex flex-col items-center justify-center gap-4 text-center"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                  >
                    {done ? (
                      <>
                        <p className="font-mono text-xs font-bold uppercase tracking-[0.3em] text-cream/70">The panel has spoken</p>
                        <p className="font-display text-[clamp(5rem,14vw,10rem)] font-black leading-none">
                          {debate.overall}
                          <span className="text-4xl text-cream/40">/100</span>
                        </p>
                        <motion.span
                          initial={{ scale: 3, rotate: -25, opacity: 0 }}
                          animate={{ scale: 1, rotate: -8, opacity: 1 }}
                          transition={{ delay: 0.3, type: "spring", stiffness: 420, damping: 18 }}
                          className="border-[5px] border-double border-coral px-4 py-1 font-display text-5xl font-black uppercase text-coral"
                        >
                          {grade.label}
                        </motion.span>
                        <div className="mt-2 flex gap-3">
                          <button
                            data-cursor="replay"
                            onClick={() => engine.jumpTo(0)}
                            className="border-[3px] border-cream px-4 py-2 font-mono text-xs font-bold uppercase tracking-widest hover:bg-cream hover:text-ink"
                          >
                            ↺ Replay
                          </button>
                          <button
                            data-cursor="leave"
                            onClick={onLeave}
                            className="border-[3px] border-ink bg-coral px-4 py-2 font-mono text-xs font-bold uppercase tracking-widest text-ink"
                          >
                            Leave call
                          </button>
                        </div>
                      </>
                    ) : (
                      <p className="font-mono text-sm font-bold uppercase tracking-[0.3em] text-cream/60">Connecting the panel…</p>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Live captions */}
              {line && !done && (
                <div className="absolute inset-x-[8%] bottom-[3%] z-10 border-2 border-cream/30 bg-ink/90 text-cream sm:inset-x-[20%] [&_p]:p-3 [&_p]:text-center [&_p]:text-[clamp(1rem,1.8vw,1.35rem)] [&_span:last-child]:text-cream/25">
                  <TypedText key={snap.index} text={line.text} progress={engine.progress} />
                </div>
              )}
            </div>

            {/* Filmstrip */}
            <div className="hidden w-40 shrink-0 flex-col gap-2 overflow-y-auto md:flex">
              {tiles.map((t) => (
                <JudgeTile
                  key={t.id}
                  {...t}
                  speaking={speaking}
                  analyser={engine.analyser}
                  className="aspect-video w-full shrink-0"
                />
              ))}
              <YouTile stream={cam.stream} className="aspect-video w-full shrink-0" />
            </div>
          </>
        ) : (
          <div className="flex min-w-0 flex-1 flex-col gap-3">
            <div className="grid min-h-0 flex-1 auto-rows-fr grid-cols-2 gap-3 md:grid-cols-4">
              {tiles.map((t) => (
                <JudgeTile key={t.id} {...t} speaking={speaking} analyser={engine.analyser} className="min-h-0" />
              ))}
              <YouTile stream={cam.stream} className="min-h-0" />
            </div>
            <div className="h-20 shrink-0 border-2 border-cream/30 bg-ink [&_p]:p-3 [&_p]:text-center [&_p]:text-lg [&_span:last-child]:text-cream/25">
              {line && !done && (
                <TypedText key={snap.index} text={`${JUDGES[line.speaker].short}: ${line.text}`} progress={engine.progress} />
              )}
            </div>
          </div>
        )}
      </div>

      {/* Toolbar */}
      <div className="flex flex-wrap items-center justify-center gap-2 border-t-[3px] border-cream/20 px-4 py-3 font-mono text-[11px] font-bold uppercase tracking-widest">
        <span className="border-2 border-cream/30 px-3 py-2 text-cream/50" title="Listen-only seat">
          Mic off
        </span>
        <button
          data-cursor="camera"
          onClick={cam.toggle}
          className={cn("border-2 px-3 py-2", cam.stream ? "border-mint bg-mint text-ink" : "border-cream/60 hover:bg-cream hover:text-ink")}
        >
          {cam.error || (cam.stream ? "Camera on" : "Camera off")}
        </button>
        <span className="mx-1 h-6 w-px bg-cream/20" />
        <button data-cursor="back" onClick={() => engine.prev()} className="border-2 border-cream/60 px-3 py-2 hover:bg-cream hover:text-ink">
          ⏮
        </button>
        <button
          data-cursor={speaking ? "pause" : "play"}
          onClick={() => engine.toggle()}
          className="border-2 border-cream/60 px-3 py-2 hover:bg-cream hover:text-ink"
        >
          {speaking ? "❚❚ Pause" : "▶ Play"}
        </button>
        <button data-cursor="skip" onClick={() => engine.next()} className="border-2 border-cream/60 px-3 py-2 hover:bg-cream hover:text-ink">
          ⏭
        </button>
        <span className="mx-1 h-6 w-px bg-cream/20" />
        <button
          data-cursor="leave"
          onClick={onLeave}
          className="border-[3px] border-ink bg-coral px-4 py-2 text-ink shadow-[3px_3px_0_0_var(--blood)] active:translate-x-[3px] active:translate-y-[3px] active:shadow-none"
        >
          Leave call
        </button>
      </div>
    </motion.div>
  );
}
