"use client";

import { useLenis } from "lenis/react";
import { AnimatePresence, motion } from "motion/react";
import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { Logo } from "@/components/landing/site-header";
import { BrutalButton, BrutalLink } from "@/components/ui/brutal-button";
import { RandomizedText } from "@/components/ui/randomized-text";
import { DebateEngine, IDLE_SNAPSHOT, type PlayerSnapshot } from "@/lib/client/debate-engine";
import { ensureJudgment } from "@/lib/client/judgment";
import { readNdjson } from "@/lib/client/ndjson";
import { headlineScore, type FeedEvent } from "@/lib/feed";
import {
  isDemoSession,
  loadDebate,
  loadFeed,
  loadHackathon,
  loadIdea,
  loadJudgmentId,
  loadReview,
  saveDebate,
  saveFeed,
  saveReview,
  startDemoSession,
} from "@/lib/idea";
import { DEBATE_LENGTH } from "@/lib/judges";
import { fetchReview, reviewOverall, type ReviewState } from "@/lib/review";
import type { Debate, StreamEvent } from "@/lib/types";
import dynamic from "next/dynamic";
import { Arena, IDLE_FEED, type FeedProgress } from "./arena";
import { Caption } from "./caption";
import { Roundtable } from "./roundtable";
import { Transcript } from "./transcript";

// Shown only after the debate, so it loads in its own chunk, fetched as soon as the debate starts.
const loadScorecard = () => import("./scorecard");
const Scorecard = dynamic(() => loadScorecard().then((m) => m.Scorecard), { ssr: false });

interface Session {
  idea: string;
  engine: DebateEngine;
  fromCache: boolean;
  demo: boolean;
  title: string | null;
  source: Debate["source"] | null;
  model: string | null;
  /** The finished debate with scores — arrives after the last line. */
  debate: Debate | null;
  error: string | null;
}

const noopSubscribe = () => () => {};
const idleSnapshot = () => IDLE_SNAPSHOT;


export function DebateRoom() {
  const lenis = useLenis();
  const [session, setSession] = useState<Session | null>(null);
  const [assembled, setAssembled] = useState(false);
  // True when this tab has no idea to judge (a link opened in a fresh tab, say).
  const [empty, setEmpty] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const reviewAbortRef = useRef<AbortController | null>(null);
  const feedAbortRef = useRef<AbortController | null>(null);
  // Gemma research-backed review: runs in parallel and usually lands after the debate.
  const [review, setReview] = useState<ReviewState | null>(null);
  // The feed: 30 simulated people, in parallel with the debate.
  const [feed, setFeed] = useState<FeedProgress>(IDLE_FEED);

  const requestReview = useCallback(async (idea: string) => {
    reviewAbortRef.current?.abort();
    const ctrl = new AbortController();
    reviewAbortRef.current = ctrl;
    setReview({ status: "loading" });
    try {
      const judgmentId = await ensureJudgment(idea);
      const { hackathonUrl, rules } = loadHackathon();
      const result = await fetchReview({ idea, judgmentId, hackathonUrl, rules }, ctrl.signal);
      if (ctrl.signal.aborted) return;
      saveReview(idea, result);
      setReview({ status: "ready", review: result });
    } catch (err) {
      if (ctrl.signal.aborted) return;
      setReview({ status: "failed", message: err instanceof Error ? err.message : "The review failed." });
    }
  }, []);

  const requestFeed = useCallback(async (idea: string, demo: boolean) => {
    feedAbortRef.current?.abort();
    const ctrl = new AbortController();
    feedAbortRef.current = ctrl;
    setFeed({ ...IDLE_FEED, status: "running" });
    try {
      const judgmentId = demo ? null : await ensureJudgment(idea);
      const res = await fetch("/api/feed", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idea, demo, judgmentId }),
        signal: ctrl.signal,
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error ?? `Feed failed (${res.status})`);
      }
      let finished = false;
      await readNdjson<FeedEvent>(res, (e) => {
        if (e.type === "people") setFeed((f) => ({ ...f, people: e.people }));
        else if (e.type === "round") setFeed((f) => (e.round === 1 ? { ...f, first: e.reactions } : { ...f, final: e.reactions }));
        else if (e.type === "feed") {
          finished = true;
          saveFeed(idea, e.feed);
          setFeed((f) => ({ ...f, status: "done", result: e.feed, final: e.feed.people.map((p) => p.final) }));
        } else if (e.type === "error") throw new Error(e.message);
      });
      if (!finished) throw new Error("The feed stream ended early.");
    } catch (err) {
      if (ctrl.signal.aborted) return;
      setFeed((f) => ({ ...f, status: "failed", error: err instanceof Error ? err.message : "The feed failed." }));
    }
  }, []);

  const requestDebate = useCallback(async (idea: string, demo = false) => {
    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    const engine = new DebateEngine();
    setAssembled(false);
    const update = (patch: Partial<Session>) =>
      setSession((s) => (s && s.engine === engine ? { ...s, ...patch } : s));
    setSession({ idea, engine, fromCache: false, demo, title: null, source: null, model: null, debate: null, error: null });

    try {
      // Demo debates are never saved, so they need no saved verdict to fill in.
      const judgmentId = demo ? null : await ensureJudgment(idea);
      const { hackathonUrl, rules } = loadHackathon();
      const res = await fetch("/api/debate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idea, demo, judgmentId, hackathonUrl, rules }),
        signal: ctrl.signal,
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error ?? `Request failed (${res.status})`);
      }
      let finished = false;
      await readNdjson<StreamEvent>(res, (e) => {
        if (e.type === "meta") update({ source: e.source, model: e.model });
        else if (e.type === "title") update({ title: e.title });
        else if (e.type === "line") engine.push(e.line);
        else if (e.type === "debate") {
          finished = true;
          saveDebate(e.debate);
          update({ debate: e.debate, title: e.debate.title });
          engine.finish();
        } else if (e.type === "error") throw new Error(e.message);
      });
      if (!finished) throw new Error("The panel walked out mid-debate (the stream ended early). Try again.");
    } catch (err) {
      if (ctrl.signal.aborted) return;
      update({ error: err instanceof Error ? err.message : "Something went wrong." });
    }
  }, []);

  // Boot: read this tab's idea and reuse its verdict if it already has one. With no idea there is
  // nothing to judge, so we offer the demo instead of bouncing the visitor home.
  const begin = useCallback(() => {
    const demo = new URLSearchParams(window.location.search).has("demo") || isDemoSession();
    let idea = loadIdea();
    if (!idea && demo) idea = startDemoSession();
    if (!idea) {
      setEmpty(true);
      return;
    }
    setEmpty(false);
    const cached = loadDebate(idea);
    if (cached) {
      setAssembled(true);
      setSession({
        idea,
        engine: new DebateEngine(cached.lines, true),
        fromCache: true,
        demo: cached.source === "demo",
        title: cached.title,
        source: cached.source,
        model: cached.model,
        debate: cached,
        error: null,
      });
    } else {
      // The demo plays the scripted debate: no API calls, nothing saved.
      void requestDebate(idea, demo);
    }
    const cachedFeed = loadFeed(idea);
    if (cachedFeed) {
      const first = cachedFeed.people.map((p) => p.first);
      const final = cachedFeed.people.map((p) => p.final);
      setFeed({ status: "done", people: cachedFeed.people, first, final, result: cachedFeed });
    } else void requestFeed(idea, demo);
    const cachedReview = loadReview(idea);
    if (cachedReview) setReview({ status: "ready", review: cachedReview });
    else if (!demo) void requestReview(idea);
    else setReview(null);
  }, [requestDebate, requestFeed, requestReview]);

  useEffect(() => {
    // sessionStorage is only readable after mount, so state has to be set from here.
    begin();
    return () => {
      abortRef.current?.abort();
      reviewAbortRef.current?.abort();
      feedAbortRef.current?.abort();
    };
  }, [begin]);

  const engine = session?.engine ?? null;
  const fromCache = session?.fromCache ?? false;

  // Start (or jump to the verdict for a cached debate); stop when replaced.
  useEffect(() => {
    if (!engine) return;
    if (fromCache) engine.skipToEnd();
    else if (assembled) engine.start();
    else return;
    return () => engine.dispose();
  }, [engine, fromCache, assembled]);

  const snap = useSyncExternalStore(engine?.subscribe ?? noopSubscribe, engine?.getSnapshot ?? idleSnapshot, idleSnapshot);

  // The grade: sharks 70% (the research-backed review once it lands, the panel's estimate until
  // then) plus the feed 30%. It is provisional until both have finished.
  const reviewScore = review?.status === "ready" ? reviewOverall(review.review) : null;
  const rawDebate = session?.debate ?? null;
  const sharkScore = reviewScore ?? rawDebate?.overall ?? null;
  const feedResult = feed.result;
  const debate = useMemo(
    () => (rawDebate && sharkScore !== null ? { ...rawDebate, overall: headlineScore(sharkScore, feedResult) } : rawDebate),
    [rawDebate, sharkScore, feedResult],
  );
  const final = review?.status !== "loading" && feed.status !== "running";

  const lines = snap.lines;
  const done = snap.status === "done" && debate !== null;
  const line = snap.index >= 0 && snap.index < lines.length ? lines[snap.index] : null;
  const started = fromCache || (assembled && lines.length > 0);
  const total = snap.complete ? lines.length : Math.max(DEBATE_LENGTH, lines.length);

  // Warm the scorecard chunk while the sharks talk, so the verdict appears without a pause.
  useEffect(() => {
    if (started) void loadScorecard();
  }, [started]);

  // Glide down to the scorecard once it exists: it mounts from its own chunk, so wait for it
  // rather than scrolling to an element that isn't there yet.
  const glided = useRef(false);
  useEffect(() => {
    if (!done || fromCache || glided.current) return;
    let raf = 0;
    const startAt = performance.now();
    const tryScroll = () => {
      const el = document.getElementById("verdict");
      if (el) {
        glided.current = true;
        // Two frames for the new section to lay out, then refresh Lenis's cached page height: with a
        // stale height it clamps the target and the glide stops short of the scorecard.
        raf = requestAnimationFrame(() => {
          raf = requestAnimationFrame(() => {
            if (lenis) {
              lenis.resize();
              // The section's scroll-margin (scroll-mt-20) keeps it clear of the sticky header; Lenis honours it.
              lenis.scrollTo(el, { duration: 1.8, easing: easeInOutCubic, force: true });
            } else {
              el.scrollIntoView({ behavior: "smooth" });
            }
          });
        });
      } else if (performance.now() - startAt < 4000) {
        raf = requestAnimationFrame(tryScroll);
      }
    };
    const t = setTimeout(() => (raf = requestAnimationFrame(tryScroll)), 700);
    return () => {
      clearTimeout(t);
      cancelAnimationFrame(raf);
    };
  }, [done, fromCache, lenis]);

  // Keyboard: space play/pause, arrows step.
  useEffect(() => {
    if (!engine) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLElement && e.target.closest("input, textarea, button, a")) return;
      if (e.code === "Space") {
        e.preventDefault();
        engine.toggle();
      } else if (e.key === "ArrowRight") engine.next();
      else if (e.key === "ArrowLeft") engine.prev();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [engine]);

  const waitingText =
    snap.index >= lines.length && lines.length > 0 && !snap.complete
      ? "Gemma is writing the next argument…"
      : snap.index >= lines.length && snap.complete
        ? "The panel has spoken."
        : "The sharks are circling…";

  if (empty) {
    return (
      <>
        <header className="border-b-[3px] border-ink bg-teal text-cream">
          <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6">
            <Logo className="[&>span:last-child]:text-cream" />
          </div>
        </header>
        <main className="relative flex-1">
          <div className="bg-grid pointer-events-none absolute inset-0" />
          <div className="relative mx-auto max-w-2xl px-4 py-20 sm:px-6">
            <div className="border-[3px] border-ink bg-paper p-6 shadow-brutal sm:p-8">
              <p className="font-mono text-xs font-bold uppercase tracking-[0.3em]">Nothing in the tank yet</p>
              <h1 className="mt-2 font-display text-5xl font-black uppercase leading-[0.9] sm:text-6xl">No idea to judge.</h1>
              <p className="mt-4 text-base leading-relaxed text-ink/80">
                Ideas live in the tab you pitched them from, so a new tab or a reopened link starts empty. Pitch a new one, or
                watch the sharks take on a sample idea.
              </p>
              <div className="mt-6 flex flex-wrap gap-3">
                <BrutalLink href="/#pitch" cursor="pitch">
                  Pitch the sharks →
                </BrutalLink>
                <BrutalButton
                  tone="paper"
                  cursor="watch"
                  onClick={() => {
                    startDemoSession();
                    begin();
                  }}
                >
                  ▶ Watch a demo debate
                </BrutalButton>
              </div>
            </div>
          </div>
        </main>
      </>
    );
  }

  return (
    <>
      <header className="sticky top-0 z-50 border-b-[3px] border-ink bg-teal text-cream">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6">
          <Logo className="[&>span:last-child]:text-cream" />
          <div className="flex items-center gap-2">
            {session?.source && (
              <span className="hidden border-2 border-cream/40 px-2 py-1 font-mono text-[10px] font-bold uppercase tracking-widest sm:inline-block">
                {session.source === "gemma" ? `Gemma · ${session.model}` : "Demo mode"}
              </span>
            )}
            <BrutalLink href="/#pitch" size="sm" cursor="new">
              New idea
            </BrutalLink>
          </div>
        </div>
      </header>

      <main className="relative flex-1 overflow-hidden">
        <div className="bg-grid pointer-events-none absolute inset-0" />
        <div className="relative mx-auto max-w-7xl px-4 pb-24 pt-8 sm:px-6">
          {/* The idea in the tank */}
          <div className="mb-6 flex flex-col gap-3 border-[3px] border-ink bg-paper p-4 shadow-brutal-sm sm:flex-row sm:items-center">
            <span className="shrink-0 self-start border-2 border-ink bg-ink px-2 py-1 font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-cream sm:self-auto">
              The idea
            </span>
            <p className="line-clamp-2 text-base font-medium leading-snug">
              {session ? <RandomizedText text={session.idea} revealMs={8} /> : "…"}
            </p>
          </div>

          {session && (
            <Arena
              title={session.title}
              idea={session.idea}
              feed={feed}
              speaker={line?.speaker ?? null}
              lineIndex={snap.index}
              assembled={assembled}
              done={done}
              settled={fromCache}
              compact={started}
              onAssembled={() => setAssembled(true)}
            />
          )}

          {session && assembled && !started && !session.error && (
            <p role="status" className="mt-4 text-center font-mono text-[11px] font-bold uppercase tracking-[0.2em] text-ink/70">
              <span className="mr-2 inline-block h-2 w-2 animate-blink bg-coral" />
              Gemma 4 is writing the sharks&apos; first bites…
            </p>
          )}

          {session?.error && (
            <div role="alert" className="mx-auto mt-8 max-w-2xl border-[3px] border-ink bg-coral p-5 shadow-brutal">
              <p className="font-mono text-xs font-bold uppercase tracking-[0.25em]">The sharks swam off</p>
              <h1 className="mt-1 font-display text-5xl font-black uppercase leading-[0.9]">No verdict</h1>
              <p className="mt-3 text-base">{session.error}</p>
              <div className="mt-5 flex flex-wrap gap-3">
                <BrutalButton tone="paper" cursor="retry" onClick={() => requestDebate(session.idea)}>
                  Try again
                </BrutalButton>
                <BrutalButton tone="sage" cursor="demo" onClick={() => requestDebate(session.idea, true)}>
                  Run demo debate
                </BrutalButton>
                <BrutalLink href="/#pitch" tone="ink" cursor="edit">
                  Edit idea
                </BrutalLink>
              </div>
            </div>
          )}

          <AnimatePresence>
            {engine && started && (
              <motion.div
                initial={{ opacity: 0, y: 40 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1], delay: fromCache ? 0 : 0.25 }}
                className="mt-10 grid gap-8 lg:grid-cols-2"
              >
                {/* Stage */}
                <div className="lg:sticky lg:top-24 lg:self-start">
                  <Roundtable
                    title={session?.title ?? null}
                    total={total}
                    verdict={debate}
                    line={line}
                    index={snap.index}
                    speaking={snap.status === "playing"}
                    progress={engine.progress}
                    done={done}
                  />
                </div>

                {/* Side */}
                <div className="flex flex-col gap-6 [&>*]:shrink-0">
                  {!done && <Caption line={line} index={snap.index} progress={engine.progress} emptyText={waitingText} />}
                  <Controls engine={engine} snap={snap} total={total} />
                  <Transcript lines={lines} index={snap.index} complete={snap.complete} onJump={(i) => engine.jumpTo(i)} />
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {debate && done && sharkScore !== null && (
            <div className="mt-20">
              <Scorecard
                debate={debate}
                sharkScore={sharkScore}
                feed={feed}
                final={final}
                review={review}
                judgmentId={session?.source === "gemma" ? loadJudgmentId() : null}
                onRetryReview={session && !session.demo ? () => requestReview(session.idea) : undefined}
                onReplay={() => {
                  engine?.jumpTo(0);
                  if (lenis) lenis.scrollTo(0, { duration: 1.4, easing: easeInOutCubic });
                  else window.scrollTo({ top: 0, behavior: "smooth" });
                }}
              />
            </div>
          )}
        </div>
      </main>
    </>
  );
}

function easeInOutCubic(t: number) {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

function Controls({ engine, snap, total }: { engine: DebateEngine; snap: PlayerSnapshot; total: number }) {
  const playing = snap.status === "playing";
  const read = snap.status === "done" ? total : Math.max(0, Math.min(total, snap.index));
  const pct = Math.round((read / total) * 100);
  const label =
    snap.status === "done"
      ? "Debate closed"
      : snap.status === "buffering"
        ? snap.complete
          ? "Tallying the scores…"
          : "Waiting on Gemma…"
        : snap.status === "paused"
          ? "Paused"
          : "Live from the table";
  return (
    <div className="border-[3px] border-ink bg-paper p-4 shadow-brutal">
      <div className="flex items-center justify-between font-mono text-[11px] font-bold uppercase tracking-[0.2em]">
        <span>{label}</span>
        <span className="tabular-nums">{pct}%</span>
      </div>
      <div className="mt-2 flex h-3 border-2 border-ink bg-cream">
        {Array.from({ length: total }, (_, i) => (
          <span
            key={i}
            className={`h-full flex-1 border-r-2 border-ink transition-colors last:border-r-0 ${
              i < snap.index || snap.status === "done"
                ? "bg-ink"
                : i === snap.index
                  ? "bg-coral"
                  : i < snap.lines.length
                    ? "bg-sage"
                    : ""
            }`}
          />
        ))}
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        <BrutalButton size="sm" tone="paper" cursor="back" aria-label="Previous argument" onClick={() => engine.prev()}>
          ⏮
        </BrutalButton>
        <BrutalButton size="sm" tone={playing ? "paper" : "coral"} cursor={playing ? "pause" : "play"} onClick={() => engine.toggle()}>
          {playing ? "❚❚ Pause" : snap.status === "done" ? "↺ Replay" : "▶ Play"}
        </BrutalButton>
        <BrutalButton size="sm" tone="paper" cursor="skip" aria-label="Next argument" onClick={() => engine.next()}>
          ⏭
        </BrutalButton>
        {snap.status !== "done" && snap.complete && (
          <BrutalButton size="sm" tone="ink" cursor="verdict" onClick={() => engine.skipToEnd()} className="ml-auto">
            Skip to verdict
          </BrutalButton>
        )}
      </div>
      <p className="mt-3 font-mono text-[10px] uppercase tracking-wider text-ink/65">Space · ← →</p>
    </div>
  );
}
