"use client";

import { motion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { JudgeAvatar } from "@/components/judge-avatar";
import { JUDGES, JUDGE_ORDER, type JudgeId } from "@/lib/judges";

type Entry = { who: JudgeId; text: string | null };

// ~600 ms per judge: the bubble appears as typing dots, then becomes the line.
const STEP = { each: 600, post: 400, settle: 200 };

/**
 * The waiting room: while Gemma writes, the panel assembles in a group chat.
 * Each judge gets exactly one bubble (keyed by judge) that shows typing dots and
 * then turns into their line in place. Calls onJoin as each arrives (their seat
 * fills at the table) and onAssembled once everyone is in. Nothing loops after.
 */
export function GroupChat({
  caseNo,
  waiting,
  onJoin,
  onAssembled,
}: {
  caseNo: string;
  /** True while there's still nothing to play. */
  waiting: boolean;
  onJoin: (id: JudgeId) => void;
  onAssembled: () => void;
}) {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [assembled, setAssembled] = useState(false);
  const scroller = useRef<HTMLDivElement>(null);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const callbacks = useRef({ onJoin, onAssembled });

  useEffect(() => {
    callbacks.current = { onJoin, onAssembled };
  });

  // The join sequence.
  useEffect(() => {
    const list = timers.current;
    const at = (ms: number, fn: () => void) => list.push(setTimeout(fn, ms));

    JUDGE_ORDER.forEach((who, i) => {
      const t = i * STEP.each;
      at(t, () => {
        setEntries((es) => [...es, { who, text: null }]);
        callbacks.current.onJoin(who);
      });
      at(t + STEP.post, () =>
        setEntries((es) => es.map((e) => (e.who === who ? { ...e, text: JUDGES[who].joinLine } : e))),
      );
    });

    at((JUDGE_ORDER.length - 1) * STEP.each + STEP.post + STEP.settle, () => {
      setAssembled(true);
      callbacks.current.onAssembled();
    });

    return () => list.forEach(clearTimeout);
  }, [caseNo]);

  const skip = () => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
    setEntries(JUDGE_ORDER.map((who) => ({ who, text: JUDGES[who].joinLine })));
    JUDGE_ORDER.forEach((who) => callbacks.current.onJoin(who));
    setAssembled(true);
    callbacks.current.onAssembled();
  };

  useEffect(() => {
    const el = scroller.current;
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
  }, [entries]);

  return (
    <div className="flex h-[30rem] flex-col border-[3px] border-ink bg-paper shadow-brutal">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 border-b-[3px] border-ink bg-teal px-3 py-2 text-cream">
        <div className="min-w-0">
          <p className="truncate font-display text-xl font-black uppercase leading-none">#case-{caseNo}</p>
          <p className="font-mono text-[10px] font-bold uppercase tracking-widest text-cream/70">
            {entries.length}/{JUDGE_ORDER.length} online · private panel
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex -space-x-1.5">
            {entries.map((e) => (
              <JudgeAvatar key={e.who} id={e.who} className="w-7" />
            ))}
          </div>
          {!assembled && (
            <button
              type="button"
              onClick={skip}
              className="border-2 border-ink bg-paper px-2 py-1 font-mono text-[10px] font-bold uppercase tracking-widest text-ink hover:bg-mustard"
            >
              Skip
            </button>
          )}
        </div>
      </div>

      {/* Messages: one bubble per judge, typing dots become the line in place */}
      <div ref={scroller} data-lenis-prevent className="bg-grid flex-1 space-y-2.5 overflow-y-auto p-3">
        {entries.map((e) => (
          <motion.div
            key={e.who}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.18, ease: "easeOut" }}
            className="flex items-end gap-2"
          >
            <JudgeAvatar id={e.who} className="w-8 shrink-0" />
            <div className="min-w-0">
              <p className="font-mono text-[9px] font-bold uppercase tracking-widest text-ink/60">{JUDGES[e.who].name}</p>
              <div
                className="min-h-[2.1rem] border-2 border-ink px-2.5 py-1.5 text-sm leading-snug shadow-[3px_3px_0_0_var(--ink)]"
                style={{ backgroundColor: e.text === null ? "var(--paper)" : JUDGES[e.who].color }}
              >
                {e.text === null ? (
                  <span className="flex h-4 items-center gap-1" aria-label="typing">
                    {[0, 1, 2].map((d) => (
                      <motion.span
                        key={d}
                        className="h-1.5 w-1.5 bg-ink"
                        animate={{ opacity: [0.25, 1, 0.25] }}
                        transition={{ repeat: Infinity, duration: 0.9, delay: d * 0.15 }}
                      />
                    ))}
                  </span>
                ) : (
                  e.text
                )}
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Static status */}
      <div className="border-t-[3px] border-ink bg-cream px-3 py-2 font-mono text-[11px] uppercase tracking-wider text-ink/50">
        {waiting ? "Gemma 4 is writing the debate…" : "Panel ready"}
      </div>
    </div>
  );
}
