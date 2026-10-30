"use client";

import NumberFlow from "@number-flow/react";
import { motion, useAnimationControls, useInView } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { JudgeAvatar } from "@/components/judge-avatar";
import { BrutalButton, BrutalLink } from "@/components/ui/brutal-button";
import { JUDGES, VOTING_JUDGES } from "@/lib/judges";
import { RUBRIC, gradeFor } from "@/lib/rubric";
import type { GemmaReview, ReviewState } from "@/lib/review";
import type { Debate } from "@/lib/types";

function summary(d: Debate, review: GemmaReview | null) {
  const grade = gradeFor(d.overall);
  const criteria = review
    ? review.criteria.map((c) => `• ${c.label}: ${c.score ?? "—"}/100 — ${c.explanation}`)
    : RUBRIC.map((c) => `• ${c.label}: ${d.scores[c.id].score}/10 — ${d.scores[c.id].note}`);
  return [
    `HACKMUSE verdict — "${d.title}": ${d.overall}/100 (${grade.label})`,
    ...criteria,
    ...(review?.similarProjects.length
      ? [`Similar projects: ${review.similarProjects.map((p) => (p.url ? `${p.name} (${p.url})` : p.name)).join("; ")}`]
      : []),
    `Chair: ${d.verdict}`,
    d.strengths.length ? `Strengths: ${d.strengths.join("; ")}` : "",
    d.risks.length ? `Risks: ${d.risks.join("; ")}` : "",
  ]
    .filter(Boolean)
    .join("\n");
}

export function Scorecard({
  debate,
  review,
  onRetryReview,
  onReplay,
  onJoinCall,
}: {
  debate: Debate;
  review: ReviewState | null;
  onRetryReview?: () => void;
  onReplay: () => void;
  onJoinCall: () => void;
}) {
  const ready = review?.status === "ready" && review.review.criteria.some((c) => c.score !== null) ? review.review : null;
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
            <p className="font-mono text-xs font-bold uppercase tracking-[0.25em]">
              {ready ? "Overall · research-backed review" : review?.status === "loading" ? "Panel estimate · review pending" : "Overall · weighted"}
            </p>
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

            <div className="mt-6 grid grid-cols-3 gap-2 sm:grid-cols-5">
              {VOTING_JUDGES.map((id, i) => (
                <motion.div
                  key={id}
                  initial={{ y: 20, opacity: 0 }}
                  animate={shown ? { y: 0, opacity: 1 } : {}}
                  transition={{ delay: 1.8 + i * 0.12 }}
                  className="flex flex-col items-center border-[3px] border-ink p-1.5 text-center"
                  style={{ backgroundColor: JUDGES[id].color }}
                >
                  <JudgeAvatar id={id} className="w-10 bg-paper!" />
                  <p className="mt-1 font-display text-3xl font-black leading-none tabular-nums">{debate.votes[id]}</p>
                  <p className="font-mono text-[8px] font-bold uppercase tracking-wider">{JUDGES[id].short}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </div>

        {/* Criteria */}
        <div className="flex flex-col gap-6">
          {review && review.status !== "ready" && <ReviewNotice review={review} onRetry={onRetryReview} />}
          {ready ? (
            <ReviewCriteria review={ready} shown={shown} />
          ) : (
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
                          <JudgeAvatar id={owner.id} className="w-7" />
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
          )}

          <div className="grid gap-6 sm:grid-cols-2">
            <ListCard title="Lean on" tone="var(--mint)" mark="+" items={debate.strengths} />
            <ListCard title="Fix first" tone="var(--coral)" mark="!" items={debate.risks} />
          </div>

          {ready && <SimilarProjects review={ready} />}
        </div>
      </motion.div>

      {/* Join the call */}
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={shown ? { opacity: 1, y: 0 } : {}}
        transition={{ delay: 2.4 }}
        className="mt-10 flex flex-col items-start justify-between gap-5 border-[3px] border-ink bg-ink p-6 text-cream shadow-brutal-lg sm:flex-row sm:items-center"
      >
        <div className="flex items-center gap-4">
          <div className="flex -space-x-2">
            {VOTING_JUDGES.map((id) => (
              <JudgeAvatar key={id} id={id} className="w-10" />
            ))}
          </div>
          <div>
            <p className="font-mono text-[11px] font-bold uppercase tracking-[0.25em] text-coral">
              <span className="mr-2 inline-block h-2 w-2 animate-blink bg-coral" />
              Panel is still on the line
            </p>
            <p className="font-display text-3xl font-black uppercase leading-none">Join the call. Hear them argue.</p>
          </div>
        </div>
        <BrutalButton size="lg" cursor="join" onClick={onJoinCall}>
          ▶ Join the call
        </BrutalButton>
      </motion.div>

      <div className="mt-8 flex flex-wrap gap-4">
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
              await navigator.clipboard.writeText(summary(debate, ready));
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

function ReviewNotice({ review, onRetry }: { review: ReviewState; onRetry?: () => void }) {
  const loading = review.status === "loading";
  return (
    <div role={loading ? "status" : "alert"} className="flex flex-wrap items-center justify-between gap-3 border-[3px] border-ink bg-mustard p-4 shadow-brutal-sm">
      <div>
        <p className="font-mono text-[11px] font-bold uppercase tracking-[0.2em]">
          {loading && <span className="mr-2 inline-block h-2 w-2 animate-blink bg-ink" />}
          Research-backed review
        </p>
        <p className="mt-1 text-sm leading-snug">
          {loading
            ? "Gemma is searching past hackathons and scoring 8 criteria. The scores below are the panel's estimate until it lands."
            : `Unavailable: ${review.status === "failed" ? review.message : ""} Showing the panel's own scores.`}
        </p>
      </div>
      {!loading && onRetry && (
        <BrutalButton size="sm" tone="paper" cursor="retry" onClick={onRetry}>
          Retry review
        </BrutalButton>
      )}
    </div>
  );
}

function ReviewCriteria({ review, shown }: { review: GemmaReview; shown: boolean }) {
  return (
    <div className="border-[3px] border-ink bg-paper shadow-brutal">
      <div className="flex items-center justify-between gap-3 border-b-[3px] border-ink bg-teal px-4 py-2 font-mono text-xs font-bold uppercase tracking-[0.25em] text-cream">
        <span>Criteria breakdown</span>
        <span className="text-[10px] tracking-widest text-cream/70">
          Gemma · {review.model}
          {review.search === "returned" ? " · Google Search" : " · no search"}
        </span>
      </div>
      {review.missing && (
        <p className="border-b-2 border-dashed border-ink/25 bg-cream px-4 py-2 text-xs leading-snug text-ink/70">
          <span className="font-mono font-bold uppercase">Missing info:</span> {review.missing}
        </p>
      )}
      <ul className="divide-y-2 divide-dashed divide-ink/25">
        {review.criteria.map((c, i) => (
          <li key={c.id} className="p-4">
            <div className="flex items-center justify-between gap-3">
              <span className="font-display text-2xl font-black uppercase leading-none">{c.label}</span>
              <span className="font-display text-3xl font-black tabular-nums">
                {c.score === null ? "—" : <NumberFlow value={shown ? c.score : 0} />}
                <span className="text-lg text-ink/40">/100</span>
              </span>
            </div>
            <div className="mt-2 h-4 border-2 border-ink bg-cream">
              <motion.div
                initial={{ width: 0 }}
                animate={shown ? { width: `${c.score ?? 0}%` } : {}}
                transition={{ delay: 0.3 + i * 0.08, duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
                className="bg-hatch h-full"
                style={{ color: "var(--coral)", backgroundColor: "color-mix(in oklab, currentColor 35%, transparent)" }}
              />
            </div>
            {c.explanation && <p className="mt-2 text-sm leading-snug text-ink/75">{c.explanation}</p>}
            {(c.strengths.length > 0 || c.weaknesses.length > 0 || c.recommendations.length > 0) && (
              <details className="mt-2 text-sm">
                <summary data-cursor="open" className="cursor-pointer font-mono text-[11px] font-bold uppercase tracking-wider text-ink/60">
                  Details
                </summary>
                <dl className="mt-2 space-y-2 leading-snug">
                  {(
                    [
                      ["Strengths", c.strengths],
                      ["Weaknesses", c.weaknesses],
                      ["Do next", c.recommendations],
                    ] as const
                  )
                    .filter(([, items]) => items.length > 0)
                    .map(([label, items]) => (
                      <div key={label}>
                        <dt className="font-mono text-[10px] font-bold uppercase tracking-wider">{label}</dt>
                        {items.map((it) => (
                          <dd key={it} className="text-ink/75">
                            · {it}
                          </dd>
                        ))}
                      </div>
                    ))}
                </dl>
              </details>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

function SimilarProjects({ review }: { review: GemmaReview }) {
  if (review.similarProjects.length === 0 && review.sources.length === 0) return null;
  return (
    <div className="border-[3px] border-ink bg-paper shadow-brutal-sm">
      <div className="border-b-[3px] border-ink bg-lilac px-4 py-2 font-display text-2xl font-black uppercase">
        Been done before?
      </div>
      <div className="space-y-4 p-4">
        {review.similarProjects.length > 0 ? (
          <ul className="space-y-3">
            {review.similarProjects.map((p) => (
              <li key={`${p.name}-${p.url}`} className="text-sm leading-snug">
                {p.url ? (
                  <a href={p.url} target="_blank" rel="noreferrer" data-cursor="open" className="font-bold underline decoration-2 underline-offset-2">
                    {p.name}
                  </a>
                ) : (
                  <span className="font-bold">{p.name}</span>
                )}
                {p.note && <span className="text-ink/75"> — {p.note}</span>}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-ink/70">No similar projects found.</p>
        )}
        {review.sources.length > 0 && (
          <div>
            <p className="font-mono text-[10px] font-bold uppercase tracking-wider text-ink/60">Search sources</p>
            <ul className="mt-1 flex flex-wrap gap-2">
              {review.sources.slice(0, 8).map((s) => (
                <li key={s.uri}>
                  <a
                    href={s.uri}
                    target="_blank"
                    rel="noreferrer"
                    data-cursor="open"
                    className="inline-block max-w-[16rem] truncate border-2 border-ink bg-cream px-2 py-0.5 text-xs hover:bg-mustard"
                  >
                    {s.title}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
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
