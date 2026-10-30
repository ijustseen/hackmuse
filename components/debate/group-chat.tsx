"use client";

import { AnimatePresence, motion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { JudgeAvatar } from "@/components/judge-avatar";
import { JUDGES, JUDGE_ORDER, VOTING_JUDGES, type JudgeId } from "@/lib/judges";

type Message =
  | { kind: "system"; id: number; text: string }
  | { kind: "typing"; id: number; who: JudgeId }
  | { kind: "message"; id: number; who: JudgeId; text: string };

const STEP = { join: 0, typing: 260, post: 900, next: 1150 };

/**
 * The waiting room: while Gemma writes, the panel assembles in a group chat —
 * each judge joins, types, and posts a one-liner. Calls onJoin as each arrives
 * (their seat fills at the table) and onAssembled when everyone is in. If the
 * debate still isn't ready after that, judges keep "drafting" in the chat.
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
  const [messages, setMessages] = useState<Message[]>([]);
  const [members, setMembers] = useState<JudgeId[]>([]);
  const [assembled, setAssembled] = useState(false);
  const scroller = useRef<HTMLDivElement>(null);
  const callbacks = useRef({ onJoin, onAssembled });

  useEffect(() => {
    callbacks.current = { onJoin, onAssembled };
  });

  // The join sequence.
  useEffect(() => {
    let nextId = 0;
    const timers: ReturnType<typeof setTimeout>[] = [];
    const at = (ms: number, fn: () => void) => timers.push(setTimeout(fn, ms));
    const push = (m: Message) => setMessages((ms) => [...ms.filter((x) => x.kind !== "typing"), m]);

    JUDGE_ORDER.forEach((who, i) => {
      const t = i * STEP.next;
      const j = JUDGES[who];
      at(t + STEP.join, () => {
        push({ kind: "system", id: nextId++, text: i === 0 ? `${j.name} opened case #${caseNo}` : `${j.name} joined` });
        setMembers((m) => [...m, who]);
        callbacks.current.onJoin(who);
      });
      at(t + STEP.typing, () => push({ kind: "typing", id: nextId++, who }));
      at(t + STEP.post, () => push({ kind: "message", id: nextId++, who, text: j.joinLine }));
    });

    const end = JUDGE_ORDER.length * STEP.next;
    at(end, () => push({ kind: "typing", id: nextId++, who: "chair" }));
    at(end + 600, () => {
      push({ kind: "message", id: nextId++, who: "chair", text: "Everyone's here. The floor is open." });
      setAssembled(true);
      callbacks.current.onAssembled();
    });

    return () => timers.forEach(clearTimeout);
  }, [caseNo]);

  // Still waiting on Gemma after the intro: someone is always drafting.
  useEffect(() => {
    if (!assembled || !waiting) return;
    let i = 0;
    const id = setInterval(() => {
      const who = VOTING_JUDGES[i++ % VOTING_JUDGES.length];
      setMessages((ms) => [...ms.filter((x) => x.kind !== "typing"), { kind: "typing", id: 10_000 + i, who }]);
    }, 1400);
    return () => clearInterval(id);
  }, [assembled, waiting]);

  useEffect(() => {
    const el = scroller.current;
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
  }, [messages]);

  return (
    <div className="flex h-[30rem] flex-col border-[3px] border-ink bg-paper shadow-brutal">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 border-b-[3px] border-ink bg-teal px-3 py-2 text-cream">
        <div className="min-w-0">
          <p className="truncate font-display text-xl font-black uppercase leading-none">#case-{caseNo}</p>
          <p className="font-mono text-[10px] font-bold uppercase tracking-widest text-cream/70">
            {members.length}/{JUDGE_ORDER.length} online · private panel
          </p>
        </div>
        <div className="flex -space-x-1.5">
          <AnimatePresence>
            {members.map((id) => (
              <motion.span
                key={id}
                initial={{ scale: 0, y: -10 }}
                animate={{ scale: 1, y: 0 }}
                transition={{ type: "spring", stiffness: 500, damping: 20 }}
              >
                <JudgeAvatar id={id} className="w-7" />
              </motion.span>
            ))}
          </AnimatePresence>
        </div>
      </div>

      {/* Messages */}
      <div ref={scroller} data-lenis-prevent className="bg-grid flex-1 space-y-2.5 overflow-y-auto p-3">
        <AnimatePresence initial={false}>
          {messages.map((m) =>
            m.kind === "system" ? (
              <motion.p
                key={m.id}
                layout
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="mx-auto w-fit border-2 border-ink/30 bg-cream px-2 py-0.5 text-center font-mono text-[10px] font-bold uppercase tracking-wider text-ink/60"
              >
                {m.text}
              </motion.p>
            ) : (
              <motion.div
                key={m.id}
                layout
                initial={{ opacity: 0, x: -16, scale: 0.95 }}
                animate={{ opacity: 1, x: 0, scale: 1 }}
                exit={{ opacity: 0, transition: { duration: 0.1 } }}
                transition={{ type: "spring", stiffness: 420, damping: 30 }}
                className="flex items-end gap-2"
              >
                <JudgeAvatar id={m.who} talking={m.kind === "typing"} className="w-8 shrink-0" />
                <div className="min-w-0">
                  <p className="font-mono text-[9px] font-bold uppercase tracking-widest text-ink/60">{JUDGES[m.who].name}</p>
                  <div
                    className="border-2 border-ink px-2.5 py-1.5 text-sm leading-snug shadow-[3px_3px_0_0_var(--ink)]"
                    style={{ backgroundColor: m.kind === "typing" ? "var(--paper)" : JUDGES[m.who].color }}
                  >
                    {m.kind === "typing" ? (
                      <span className="flex h-4 items-center gap-1" aria-label="typing">
                        {[0, 1, 2].map((d) => (
                          <motion.span
                            key={d}
                            className="h-1.5 w-1.5 bg-ink"
                            animate={{ y: [0, -4, 0] }}
                            transition={{ repeat: Infinity, duration: 0.6, delay: d * 0.12 }}
                          />
                        ))}
                      </span>
                    ) : (
                      m.text
                    )}
                  </div>
                </div>
              </motion.div>
            ),
          )}
        </AnimatePresence>
      </div>

      {/* Fake composer */}
      <div className="flex items-center gap-2 border-t-[3px] border-ink bg-cream px-3 py-2 font-mono text-[11px] uppercase tracking-wider text-ink/50">
        <span className="h-3 w-3 animate-blink bg-coral" />
        {waiting ? "Gemma 4 is drafting the debate…" : "Debate ready — taking seats"}
      </div>
    </div>
  );
}
