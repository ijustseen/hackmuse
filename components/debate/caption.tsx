"use client";

import { AnimatePresence, motion, useMotionValueEvent, type MotionValue } from "motion/react";
import { useState } from "react";
import { JUDGES } from "@/lib/judges";
import type { DebateLine } from "@/lib/types";

/** Subtitle card: the line types out in sync with the voice; the rest waits in ghost ink. */
export function Caption({
  line,
  index,
  progress,
  emptyText,
}: {
  line: DebateLine | null;
  index: number;
  progress: MotionValue<number>;
  emptyText: string;
}) {
  return (
    <div className="relative min-h-[11rem] border-[3px] border-ink bg-paper shadow-brutal">
      <AnimatePresence mode="wait">
        {line ? (
          <motion.div
            key={index}
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.25 }}
          >
            <div className="flex flex-wrap items-center gap-2 border-b-[3px] border-ink px-4 py-2" style={{ backgroundColor: JUDGES[line.speaker].color }}>
              <span className="font-display text-2xl font-black uppercase leading-none">{JUDGES[line.speaker].name}</span>
              <span className="font-mono text-[11px] font-bold uppercase tracking-widest text-ink/70">— {line.cue}</span>
              {line.replyTo && (
                <span className="ml-auto border-2 border-ink bg-paper px-1.5 font-mono text-[10px] font-bold uppercase tracking-wider">
                  ↳ to {JUDGES[line.replyTo].name}
                </span>
              )}
            </div>
            <TypedText text={line.text} progress={progress} />
          </motion.div>
        ) : (
          <motion.p key={`empty-${emptyText}`} className="p-5 font-mono text-sm uppercase tracking-wider text-ink/50" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            {emptyText}
          </motion.p>
        )}
      </AnimatePresence>
    </div>
  );
}

export function TypedText({ text, progress }: { text: string; progress: MotionValue<number> }) {
  const [count, setCount] = useState(() => Math.round(progress.get() * text.length));
  useMotionValueEvent(progress, "change", (p) => {
    // Lead the voice slightly so the words never lag behind what you hear.
    const next = Math.min(text.length, Math.round(Math.min(1, p * 1.08) * text.length));
    setCount((c) => (c === next ? c : next));
  });
  return (
    <p className="p-4 text-[clamp(1.15rem,2.2vw,1.6rem)] font-semibold leading-snug sm:p-5">
      <span>{text.slice(0, count)}</span>
      <span className="text-ink/20">{text.slice(count)}</span>
    </p>
  );
}
