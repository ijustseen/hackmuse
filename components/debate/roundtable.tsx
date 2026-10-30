"use client";

import { AnimatePresence, motion } from "motion/react";
import { JUDGES, JUDGE_ORDER, type JudgeId } from "@/lib/judges";
import type { Debate, DebateLine } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Waveform } from "./waveform";

// Seat positions around the table, in % of the square stage, and their angle
// around the table's centre (degrees, 0 = east, clockwise).
const SEATS: Record<JudgeId, { x: number; y: number; angle: number }> = {
  chair: { x: 50, y: 11, angle: -90 },
  shark: { x: 13, y: 50, angle: 180 },
  builder: { x: 87, y: 50, angle: 0 },
  visionary: { x: 50, y: 89, angle: 90 },
};

const BEAM_RADIUS = 28.5;

function onRim(angle: number) {
  const a = (angle * Math.PI) / 180;
  return { x: 50 + Math.cos(a) * BEAM_RADIUS, y: 50 + Math.sin(a) * BEAM_RADIUS };
}

/** A reply travels along the table's rim from speaker to target, never across it. */
function beamPath(from: JudgeId, to: JudgeId) {
  const a = onRim(SEATS[from].angle);
  const b = onRim(SEATS[to].angle);
  let delta = SEATS[to].angle - SEATS[from].angle;
  delta = ((delta % 360) + 540) % 360 - 180; // shortest signed turn, -180..180
  const sweep = delta >= 0 ? 1 : 0;
  const large = Math.abs(delta) > 180 ? 1 : 0;
  return { d: `M ${a.x} ${a.y} A ${BEAM_RADIUS} ${BEAM_RADIUS} 0 ${large} ${sweep} ${b.x} ${b.y}` };
}

export function Roundtable({
  title,
  total,
  verdict,
  line,
  index,
  speaking,
  analyser,
  deliberating = false,
  done = false,
}: {
  title: string | null;
  total: number;
  /** The finished debate, once scores are in. */
  verdict: Debate | null;
  line: DebateLine | null;
  index: number;
  speaking: boolean;
  analyser: AnalyserNode | null;
  deliberating?: boolean;
  done?: boolean;
}) {
  const active = line?.speaker ?? null;

  return (
    <div className="relative mx-auto aspect-square w-full max-w-[560px] select-none">
      {/* Live-mic ring in the speaker's colour */}
      <AnimatePresence>
        {line && speaking && !done && (
          <motion.div
            key={`ring-${line.speaker}`}
            aria-hidden
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1, rotate: 360 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ rotate: { repeat: Infinity, duration: 14, ease: "linear" }, default: { duration: 0.3 } }}
            className="absolute left-1/2 top-1/2 -ml-[25%] -mt-[25%] aspect-square w-[50%] rounded-full border-[5px] border-dashed"
            style={{ borderColor: JUDGES[line.speaker].color }}
          />
        )}
      </AnimatePresence>

      {/* Table */}
      <motion.div
        className="absolute left-1/2 top-1/2 flex aspect-square w-[44%] -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-[3px] border-ink bg-mustard shadow-[10px_10px_0_0_var(--blood)]"
        animate={deliberating ? { rotate: [0, 2, -2, 0] } : { rotate: 0 }}
        transition={deliberating ? { repeat: Infinity, duration: 2.4 } : undefined}
      >
        <div className="bg-halftone absolute inset-3 rounded-full opacity-20" />
        <div className="absolute inset-[9%] rounded-full border-2 border-dashed border-ink/40" />
        <div className="relative px-[12%] text-center">
          <p className="font-mono text-[clamp(8px,1.6vw,11px)] font-bold uppercase tracking-[0.25em]">
            {deliberating ? "Deliberating" : done ? "Verdict in" : "On the table"}
          </p>
          <p className="mt-1 line-clamp-3 font-display text-[clamp(1.1rem,3.6vw,2.2rem)] font-black uppercase leading-[0.9]">
            {title ?? "· · ·"}
          </p>
          {!deliberating && (
            <p className="mt-2 font-mono text-[clamp(8px,1.6vw,11px)] font-bold uppercase tracking-wider">
              {done && verdict
                ? `${verdict.overall} / 100`
                : `Arg ${String(Math.max(1, index + 1)).padStart(2, "0")} / ${String(total).padStart(2, "0")}`}
            </p>
          )}
        </div>
      </motion.div>

      {/* Reply beam: runs along the rim from the speaker to the judge they answer */}
      <svg viewBox="0 0 100 100" className="pointer-events-none absolute inset-0 z-[5] h-full w-full overflow-visible" aria-hidden>
        <AnimatePresence>
          {line?.replyTo && !done && (() => {
            const beam = beamPath(line.speaker, line.replyTo);
            return (
              <motion.g key={`beam-${index}`} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <motion.path
                  d={beam.d}
                  fill="none"
                  stroke="var(--ink)"
                  strokeWidth={2.6}
                  initial={{ pathLength: 0 }}
                  animate={{ pathLength: 1 }}
                  transition={{ duration: 0.7, ease: "easeOut" }}
                />
                <motion.path
                  d={beam.d}
                  fill="none"
                  stroke={JUDGES[line.speaker].color}
                  strokeWidth={1.3}
                  strokeDasharray="3 3"
                  className="animate-dash"
                  initial={{ pathLength: 0 }}
                  animate={{ pathLength: 1 }}
                  transition={{ duration: 0.7, ease: "easeOut" }}
                />
              </motion.g>
            );
          })()}
        </AnimatePresence>
      </svg>

      {/* Seats */}
      {JUDGE_ORDER.map((id, i) => {
        const judge = JUDGES[id];
        const isActive = active === id && !done;
        const isTarget = !done && line?.replyTo === id;
        const vote = done && id !== "chair" ? verdict?.votes[id] : null;
        return (
          <motion.div
            key={id}
            className="absolute z-10 w-[27%] min-w-[92px] max-w-[156px]"
            style={{ left: `${SEATS[id].x}%`, top: `${SEATS[id].y}%`, x: "-50%" }}
            initial={{ opacity: 0, scale: 0.6, y: "-50%" }}
            animate={{
              opacity: deliberating ? 0.75 : active && !isActive && !isTarget && !done ? 0.55 : 1,
              scale: isActive ? 1.1 : 1,
              y: isActive ? "-58%" : "-50%",
            }}
            transition={{ type: "spring", stiffness: 260, damping: 20, delay: deliberating ? i * 0.05 : 0 }}
          >
            <div
              className={cn(
                "relative border-[3px] border-ink p-2 transition-[background-color,box-shadow] duration-300 sm:p-3",
                isActive ? "shadow-[8px_8px_0_0_var(--blood)]" : "shadow-[4px_4px_0_0_var(--ink)]",
              )}
              style={{ backgroundColor: isActive || done ? judge.color : "var(--paper)" }}
            >
              <div className="flex items-center gap-2">
                <span
                  className="inline-flex h-8 w-8 shrink-0 items-center justify-center border-2 border-ink font-display text-xl font-black sm:h-10 sm:w-10 sm:text-2xl"
                  style={{ backgroundColor: isActive || done ? "var(--paper)" : judge.color }}
                >
                  {judge.glyph}
                </span>
                <div className="min-w-0">
                  <p className="truncate font-display text-sm font-black uppercase leading-none sm:text-lg">{judge.name.replace("The ", "")}</p>
                  <p className="truncate font-mono text-[8px] font-bold uppercase tracking-wider text-ink/70 sm:text-[9px]">{judge.role}</p>
                </div>
              </div>
              <div className="mt-2 flex items-center justify-between gap-1">
                <Waveform active={isActive && speaking} analyser={analyser} bars={10} className="h-4 sm:h-5" />
                {vote != null && (
                  <motion.span
                    initial={{ scale: 2.5, rotate: -20, opacity: 0 }}
                    animate={{ scale: 1, rotate: -6, opacity: 1 }}
                    transition={{ type: "spring", stiffness: 300, damping: 14, delay: 0.3 + i * 0.12 }}
                    className="border-2 border-ink bg-paper px-1.5 font-display text-lg font-black leading-tight"
                  >
                    {vote}/10
                  </motion.span>
                )}
              </div>
              <AnimatePresence>
                {isActive && (
                  <motion.span
                    initial={{ opacity: 0, y: 6, rotate: -8 }}
                    animate={{ opacity: 1, y: 0, rotate: -4 }}
                    exit={{ opacity: 0, y: 6 }}
                    className="absolute -right-3 -top-4 border-2 border-ink bg-ink px-1.5 py-0.5 font-mono text-[9px] font-bold uppercase tracking-widest text-cream"
                  >
                    {speaking ? "● Speaking" : "…"}
                  </motion.span>
                )}
                {isTarget && (
                  <motion.span
                    initial={{ opacity: 0, scale: 0.6 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0 }}
                    className="absolute -left-3 -top-4 border-2 border-ink bg-coral px-1.5 py-0.5 font-mono text-[9px] font-bold uppercase tracking-widest"
                  >
                    Called out
                  </motion.span>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}
