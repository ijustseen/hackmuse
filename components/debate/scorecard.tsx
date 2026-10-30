"use client";

import NumberFlow from "@number-flow/react";
import { motion, useAnimationControls, useInView } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { BrutalButton, BrutalLink } from "@/components/ui/brutal-button";
import { JUDGES, VOTING_JUDGES } from "@/lib/judges";
import { RUBRIC, gradeFor } from "@/lib/rubric";
import type { Debate } from "@/lib/types";

function summary(d: Debate) {
  const grade = gradeFor(d.overall);
  return [
    `HACKMUSE verdict — "${d.title}": ${d.overall}/100 (${grade.label})`,
    ...RUBRIC.map((c) => `• ${c.label}: ${d.scores[c.id].score}/10 — ${d.scores[c.id].note}`),
    `Chair: ${d.verdict}`,
    d.strengths.length ? `Strengths: ${d.strengths.join("; ")}` : "",
    d.risks.length ? `Risks: ${d.risks.join("; ")}` : "",
  ]
    .filter(Boolean)
    .join("\n");
}

export function Scorecard({ debate, onReplay }: { debate: Debate; onReplay: () => void }) {
  const ref = useRef<HTMLElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.25 });
  const shake = useAnimationControls();
  const [shown, setShown] = useState(false);
  const [copied, setCopied] = useState(false);
  const grade = gradeFor(debate.overall);

  useEffect(() => {
    if (!inView) return;
    const t1 = setTimeout(() => setShown(true), 150);
    // The stamp lands ~1.4s in; shake the sheet when it hits.
    const t2 = setTimeout(() => shake.start({ x: [0, -7, 6, -4, 3, 0], rotate: [0, -0.4, 0.3, 0] }), 1550);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [inView, shake]);

  return (
    <section ref={ref} id="verdict" className="scroll-mt-20">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="font-mono text-xs font-bold uppercase tracking-[0.3em]">The verdict</p>
          <h2 className="font-display text-6xl font-black uppercase leading-[0.9] sm:text-7xl">Scorecard</h2>
        </div>
        {debate.source === "demo" && (
          <span className="border-2 border-ink bg-mustard px-2 py-1 font-mono text-[11px] font-bold uppercase tracking-wider">
            Demo mode · scores are placeholders
          </span>
        )}
      </div>

      <motion.div animate={shake} className="grid gap-6 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.3fr)]">
        {/* Overall */}
        <div className="relative overflow-hidden border-[3px] border-ink bg-paper p-6 shadow-brutal-lg sm:p-8 lg:self-start">
          <div className="bg-grid absolute inset-0 opacity-60" />
          <div className="relative">
            <p className="font-mono text-xs font-bold uppercase tracking-[0.25em]">Overall · weighted</p>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="font-display text-[clamp(7rem,18vw,11rem)] font-black leading-none tabular-nums">
                <NumberFlow value={shown ? debate.overall : 0} transformTiming={{ duration: 1300, easing: "ease-out" }} />
              </span>
              <span className="font-display text-4xl font-black text-ink/40">/100</span>
            </div>

            <motion.div
              initial={{ scale: 3.2, rotate: -28, opacity: 0 }}
              animate={shown ? { scale: 1, rotate: -9, opacity: 1 } : {}}
              transition={{ delay: 1.25, type: "spring", stiffness: 420, damping: 18 }}
              className="absolute -top-2 right-0 sm:right-2"
            >
              <div className="border-[5px] border-double border-coral-deep bg-paper/70 px-4 py-2 text-center text-coral-deep [filter:url(#stamp-rough)]">
                <p className="font-display text-4xl font-black uppercase leading-none sm:text-5xl">{grade.label}</p>
                <p className="font-mono text-[10px] font-bold uppercase tracking-[0.2em]">Hackmuse panel</p>
              </div>
            </motion.div>

            <p className="mt-6 font-display text-2xl font-black uppercase">{grade.blurb}</p>
            <blockquote className="mt-4 border-l-[6px] border-mustard bg-cream p-4 text-lg font-medium leading-snug">
              &ldquo;{debate.verdict}&rdquo;
              <footer className="mt-2 font-mono text-[11px] font-bold uppercase tracking-wider text-ink/60">— The Chair</footer>
            </blockquote>

            <div className="mt-6 grid grid-cols-3 gap-3">
              {VOTING_JUDGES.map((id, i) => (
                <motion.div
                  key={id}
                  initial={{ y: 20, opacity: 0 }}
                  animate={shown ? { y: 0, opacity: 1 } : {}}
                  transition={{ delay: 1.8 + i * 0.12 }}
                  className="border-[3px] border-ink p-2 text-center"
                  style={{ backgroundColor: JUDGES[id].color }}
                >
                  <p className="font-display text-3xl font-black leading-none">{JUDGES[id].glyph}</p>
                  <p className="mt-1 font-display text-3xl font-black leading-none tabular-nums">{debate.votes[id]}</p>
                  <p className="font-mono text-[9px] font-bold uppercase tracking-wider">{JUDGES[id].name.replace("The ", "")}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </div>

        {/* Criteria */}
        <div className="flex flex-col gap-6">
          <div className="border-[3px] border-ink bg-paper shadow-brutal">
            <div className="border-b-[3px] border-ink bg-teal px-4 py-2 font-mono text-xs font-bold uppercase tracking-[0.25em] text-cream">
              Criteria breakdown
            </div>
            <ul className="divide-y-2 divide-dashed divide-ink/25">
              {RUBRIC.map((c, i) => {
                const s = debate.scores[c.id];
                const owner = VOTING_JUDGES.map((id) => JUDGES[id]).find((j) => j.owns.includes(c.id));
                return (
                  <li key={c.id} className="p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2">
                        {owner && (
                          <span className="inline-flex h-6 w-6 items-center justify-center border-2 border-ink font-display text-sm font-black" style={{ backgroundColor: owner.color }}>
                            {owner.glyph}
                          </span>
                        )}
                        <span className="font-display text-2xl font-black uppercase leading-none">{c.label}</span>
                        <span className="font-mono text-[10px] text-ink/50">×{Math.round(c.weight * 100)}%</span>
                      </div>
                      <span className="font-display text-3xl font-black tabular-nums">
                        <NumberFlow value={shown ? s.score : 0} />
                        <span className="text-lg text-ink/40">/10</span>
                      </span>
                    </div>
                    <div className="mt-2 h-4 border-2 border-ink bg-cream">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={shown ? { width: `${s.score * 10}%` } : {}}
                        transition={{ delay: 0.3 + i * 0.1, duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
                        className="bg-hatch h-full"
                        style={{ color: owner?.color ?? "var(--coral)", backgroundColor: "color-mix(in oklab, currentColor 35%, transparent)" }}
                      />
                    </div>
                    <p className="mt-2 text-sm leading-snug text-ink/75">{s.note}</p>
                  </li>
                );
              })}
            </ul>
          </div>

          <div className="grid gap-6 sm:grid-cols-2">
            <ListCard title="Lean on" tone="var(--mint)" mark="+" items={debate.strengths} />
            <ListCard title="Fix first" tone="var(--coral)" mark="!" items={debate.risks} />
          </div>
        </div>
      </motion.div>

      <div className="mt-10 flex flex-wrap gap-4">
        <BrutalLink href="/#pitch" size="lg" cursor="new">
          Grade another idea →
        </BrutalLink>
        <BrutalButton tone="paper" size="lg" cursor="replay" onClick={onReplay}>
          ↺ Replay debate
        </BrutalButton>
        <BrutalButton
          tone="sage"
          size="lg"
          cursor="copy"
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(summary(debate));
              setCopied(true);
              setTimeout(() => setCopied(false), 1800);
            } catch {
              /* clipboard blocked — nothing to do */
            }
          }}
        >
          {copied ? "Copied ✓" : "Copy verdict"}
        </BrutalButton>
      </div>

      {/* Roughens the stamp edges like real ink. */}
      <svg width="0" height="0" className="absolute" aria-hidden>
        <filter id="stamp-rough">
          <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" result="noise" />
          <feDisplacementMap in="SourceGraphic" in2="noise" scale="3" />
        </filter>
      </svg>
    </section>
  );
}

function ListCard({ title, tone, mark, items }: { title: string; tone: string; mark: string; items: string[] }) {
  return (
    <div className="border-[3px] border-ink bg-paper shadow-brutal-sm">
      <div className="border-b-[3px] border-ink px-4 py-2 font-display text-2xl font-black uppercase" style={{ backgroundColor: tone }}>
        {title}
      </div>
      <ul className="space-y-3 p-4">
        {(items.length ? items : ["Nothing flagged."]).map((it) => (
          <li key={it} className="flex gap-3 text-sm leading-snug">
            <span className="inline-flex h-6 w-6 shrink-0 items-center justify-center border-2 border-ink font-mono text-xs font-bold" style={{ backgroundColor: tone }}>
              {mark}
            </span>
            {it}
          </li>
        ))}
      </ul>
    </div>
  );
}
