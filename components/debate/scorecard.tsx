"use client";

import NumberFlow from "@number-flow/react";
import { motion, useAnimationControls, useInView } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { JudgeAvatar } from "@/components/judge-avatar";
import { BrutalButton, BrutalLink } from "@/components/ui/brutal-button";
import { FeedCard } from "@/components/verdict/feed-card";
import { FEED_SIZE, FEED_WEIGHT, SHARK_WEIGHT, type FeedResult } from "@/lib/feed";
import { JUDGES, JUDGE_ORDER, VOTING_JUDGES } from "@/lib/judges";
import { RUBRIC, SURVIVE_AT, gradeFor, survival } from "@/lib/rubric";
import type { GemmaReview, ReviewState } from "@/lib/review";
import type { Debate } from "@/lib/types";
import type { FeedProgress } from "./arena";

function summary(d: Debate, review: GemmaReview | null, feed: FeedResult | null) {
  const grade = gradeFor(d.overall);
  const criteria = review
    ? review.criteria.map((c) => `• ${c.label}: ${c.score ?? "—"}/100 — ${c.explanation}`)
    : RUBRIC.map((c) => `• ${c.label}: ${d.scores[c.id]?.score ?? "—"}/10 — ${d.scores[c.id]?.note ?? ""}`);
  return [
    `HACKMUSE verdict — "${d.title}": ${d.overall}/100 (${grade.label}). ${survival(d.votes).line}.`,
    ...(feed ? [`Feed: ${feed.counts.share} of ${FEED_SIZE} would share (${feed.score}/100).`] : []),
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
  sharkScore,
  feed,
  final,
  review,
  judgmentId,
  onRetryReview,
  onReplay,
}: {
  /** `overall` is already the headline: sharks 70% + feed 30%. */
  debate: Debate;
  sharkScore: number;
  feed: FeedProgress;
  /** False while the review or the feed is still running: the grade is provisional. */
  final: boolean;
  review: ReviewState | null;
  /** The saved verdict this scorecard belongs to; the Share button only shows when there is one. */
  judgmentId?: string | null;
  onRetryReview?: () => void;
  onReplay: () => void;
}) {
  const ready = review?.status === "ready" && review.review.criteria.some((c) => c.score !== null) ? review.review : null;
  const ref = useRef<HTMLElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.25 });
  const shake = useAnimationControls();
  const [shown, setShown] = useState(false);
  const [copied, setCopied] = useState(false);
  const [share, setShare] = useState<{ status: "idle" | "busy" | "failed"; url?: string }>({ status: "idle" });
  const grade = gradeFor(debate.overall);
  const survived = survival(debate.votes);
  const feedResult = feed.result;
  // If the grade is still provisional when the card appears, the stamp waits and lands when it locks.
  const [stampDelay, setStampDelay] = useState<number | null>(null);

  async function shareVerdict() {
    if (!judgmentId) return;
    setShare({ status: "busy" });
    try {
      const res = await fetch(`/api/judgments/${judgmentId}/share`, { method: "POST" });
      const data = await res.json().catch(() => null);
      if (!res.ok || typeof data?.path !== "string") throw new Error(data?.error?.message ?? "share failed");
      const url = `${window.location.origin}${data.path}`;
      await navigator.clipboard.writeText(url).catch(() => {});
      setShare({ status: "idle", url });
    } catch {
      setShare({ status: "failed" });
    }
  }

  useEffect(() => {
    if (!inView) return;
    const t = setTimeout(() => {
      setShown(true);
      setStampDelay((d) => d ?? (final ? 1.25 : 0.25));
    }, 150);
    return () => clearTimeout(t);
  }, [inView, final]);

  // Shake the sheet when the stamp hits, which is when the grade locks.
  useEffect(() => {
    if (!shown || !final || stampDelay === null) return;
    const t = setTimeout(
      () => shake.start({ x: [0, -7, 6, -4, 3, 0], rotate: [0, -0.4, 0.3, 0] }),
      (stampDelay + 0.3) * 1000,
    );
    return () => clearTimeout(t);
  }, [shown, final, shake, stampDelay]);

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

      <motion.div animate={shake} className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
        <div className="flex flex-col gap-6 lg:self-start">
        {/* Overall */}
        <div className="relative overflow-hidden border-[3px] border-ink bg-paper p-6 shadow-brutal-lg sm:p-8">
          <div className="bg-grid absolute inset-0 opacity-60" />
          <div className="relative">
            <p className="font-mono text-xs font-bold uppercase tracking-[0.25em]">
              {final ? "Overall" : "Provisional · still scoring"}
            </p>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="font-display text-[clamp(7rem,18vw,11rem)] font-black leading-none tabular-nums">
                <NumberFlow value={shown ? debate.overall : 0} transformTiming={{ duration: 1300, easing: "ease-out" }} />
              </span>
              <span className="font-display text-4xl font-black text-ink/40">/100</span>
            </div>

            {/* How the number is made: sharks 70%, feed 30%. */}
            <div className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-1 font-mono text-[11px] font-bold uppercase tracking-wider">
              <span className="border-2 border-ink bg-coral px-1.5 py-0.5">
                Sharks {sharkScore} × {Math.round(SHARK_WEIGHT * 100)}%
              </span>
              {feedResult ? (
                <>
                  <span>+</span>
                  <span className="border-2 border-ink bg-mustard px-1.5 py-0.5">
                    Feed {feedResult.score} × {Math.round(FEED_WEIGHT * 100)}%
                  </span>
                </>
              ) : (
                <span className="text-ink/60">
                  {feed.status === "failed" ? "· feed unavailable, sharks only" : "· feed still reacting"}
                </span>
              )}
            </div>
            <p className="mt-1 text-xs leading-snug text-ink/60">
              {ready
                ? "Shark score: the research-backed review of 8 criteria."
                : review?.status === "loading"
                  ? "Shark score: the panel's estimate until the research-backed review lands."
                  : "Shark score: the panel's own estimate."}
            </p>

            {!final && (
              <div className="absolute -top-2 right-0 border-[3px] border-dashed border-ink/40 px-3 py-1.5 text-center text-ink/50 sm:right-2">
                <p className="font-display text-2xl font-black uppercase leading-none">Pending</p>
                <p className="font-mono text-[9px] font-bold uppercase tracking-[0.2em]">Stamp when scored</p>
              </div>
            )}
            <motion.div
              initial={{ scale: 3.2, rotate: -28, opacity: 0 }}
              animate={shown && final ? { scale: 1, rotate: -9, opacity: 1 } : {}}
              transition={{ delay: stampDelay ?? 1.25, type: "spring", stiffness: 420, damping: 18 }}
              className="absolute -top-2 right-0 sm:right-2"
            >
              <div className="border-[5px] border-double border-coral-deep bg-paper/70 px-4 py-2 text-center text-coral-deep [filter:url(#stamp-rough)]">
                <p className="font-display text-4xl font-black uppercase leading-none sm:text-5xl">{grade.label}</p>
                <p className="font-mono text-[10px] font-bold uppercase tracking-[0.2em]">Hackmuse tank</p>
              </div>
            </motion.div>

            <p className="mt-6 font-display text-2xl font-black uppercase">{grade.blurb}</p>
            <blockquote className="mt-4 border-l-[6px] border-mustard bg-cream p-4 text-lg font-medium leading-snug">
              &ldquo;{debate.verdict}&rdquo;
              <footer className="mt-2 font-mono text-[11px] font-bold uppercase tracking-wider text-ink/70">— The Tank Master</footer>
            </blockquote>

            <p className="mt-6 font-mono text-[11px] font-bold uppercase tracking-[0.2em]">
              {survived.line} <span className="text-ink/65">· a shark lets go at {SURVIVE_AT}/10</span>
            </p>
            <div className="mt-2 grid grid-cols-3 gap-2 sm:grid-cols-5">
              {VOTING_JUDGES.map((id, i) => {
                const letGo = survived.survived.includes(id);
                return (
                  <motion.div
                    key={id}
                    initial={{ y: 20, opacity: 0 }}
                    animate={shown ? { y: 0, opacity: 1 } : {}}
                    transition={{ delay: 1.8 + i * 0.12 }}
                    className="relative flex flex-col items-center border-[3px] border-ink p-1.5 text-center"
                    style={{ backgroundColor: letGo ? JUDGES[id].color : "var(--paper)" }}
                  >
                    <JudgeAvatar id={id} className="w-10 bg-paper!" />
                    <p className="mt-1 font-display text-3xl font-black leading-none tabular-nums">{debate.votes[id]}</p>
                    <p className="font-mono text-[8px] font-bold uppercase tracking-wider">{JUDGES[id].short}</p>
                    <span
                      className={`mt-1 w-full border-t-2 border-ink pt-0.5 font-mono text-[8px] font-bold uppercase tracking-widest ${letGo ? "" : "text-coral-deep"}`}
                    >
                      {letGo ? "Let go" : "Bit"}
                    </span>
                  </motion.div>
                );
              })}
            </div>
          </div>
        </div>

        {feedResult ? (
          <FeedCard feed={feedResult} showAll />
        ) : (
          <div className="border-[3px] border-dashed border-ink/40 bg-paper p-4 text-sm leading-snug text-ink/70">
            <p className="font-mono text-[11px] font-bold uppercase tracking-[0.2em] text-ink">The feed · {FEED_SIZE} people</p>
            <p className="mt-1">
              {feed.status === "failed"
                ? `${feed.error ?? "The feed failed."} The grade uses the sharks alone.`
                : "Still reacting. The grade updates when the feed settles."}
            </p>
          </div>
        )}
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
                const s = debate.scores[c.id] ?? { score: 0, note: "" };
                const owner = JUDGE_ORDER.map((id) => JUDGES[id]).find((j) => j.owns.includes(c.id));
                return (
                  <li key={c.id} className="p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2">
                        {owner && (
                          <JudgeAvatar id={owner.id} className="w-7" />
                        )}
                        <span className="font-display text-2xl font-black uppercase leading-none">{c.label}</span>
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
              await navigator.clipboard.writeText(summary(debate, ready, feedResult));
              setCopied(true);
              setTimeout(() => setCopied(false), 1800);
            } catch {
              /* clipboard blocked — nothing to do */
            }
          }}
        >
          {copied ? "Copied ✓" : "Copy verdict"}
        </BrutalButton>
        {judgmentId && (
          <BrutalButton size="lg" cursor="share" disabled={share.status === "busy"} onClick={shareVerdict}>
            {share.status === "busy" ? "Making the link…" : "Share verdict"}
          </BrutalButton>
        )}
      </div>
      {judgmentId && (
        <p role="status" className="mt-3 max-w-2xl text-sm leading-snug text-ink/70">
          {share.url ? (
            <>
              Link copied. Anyone with it can read your idea and this verdict:{" "}
              <a href={share.url} target="_blank" rel="noreferrer" data-cursor="open" className="font-bold underline underline-offset-2">
                {share.url}
              </a>
            </>
          ) : share.status === "failed" ? (
            "Couldn't make the link. Try again in a moment."
          ) : (
            "Sharing makes your idea and this verdict readable by anyone with the link."
          )}
        </p>
      )}

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
                <summary data-cursor="open" className="cursor-pointer font-mono text-[11px] font-bold uppercase tracking-wider text-ink/70">
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
            <p className="font-mono text-[10px] font-bold uppercase tracking-wider text-ink/70">Search sources</p>
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
