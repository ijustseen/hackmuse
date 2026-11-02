"use client";

import NumberFlow from "@number-flow/react";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useMemo, useRef, useState } from "react";
import { TankSim, type TankColors } from "@/lib/client/tank-sim";
import {
  FEED_SIZE,
  PLATFORM_LABEL,
  REACTIONS,
  REACTION_COLOR,
  REACTION_LABEL,
  countReactions,
  type FeedPerson,
  type FeedReaction,
  type FeedResult,
  type Reaction,
} from "@/lib/feed";
import { JUDGES, VOTING_JUDGES, type JudgeId, type VotingJudgeId } from "@/lib/judges";
import { gradeFor } from "@/lib/rubric";
import type { DebateLine } from "@/lib/types";
import { cn } from "@/lib/utils";

/** What the feed has produced so far; each step moves the fish. */
export interface FeedProgress {
  status: "idle" | "running" | "done" | "failed";
  people: FeedPerson[] | null;
  first: FeedReaction[] | null;
  final: FeedReaction[] | null;
  result: FeedResult | null;
  error?: string;
}

export const IDLE_FEED: FeedProgress = { status: "idle", people: null, first: null, final: null, result: null };

/** The numbers the hoisted card shows. */
export interface TankVerdict {
  title: string;
  overall: number;
  sharkScore: number;
  feedScore: number | null;
  /** False while the review or the feed is still running. */
  final: boolean;
}

const COLORS: TankColors = {
  ink: "#10201c",
  cream: "#f1ecdf",
  paper: "#faf7ef",
  coral: "#e8736a",
  blood: "#7b1a14",
  skyTop: "#f6f1e4",
  skyBottom: "#e6dfcc",
  waterTop: "#2b5047",
  waterBottom: "#10201c",
  reaction: REACTION_COLOR,
};

/** Act 1 timings (ms). */
const SHOW_PITCH = 1100;
const MORPH = 900;
/** Act 2: gaps between scripted bites, and the shortest frenzy before the catch. */
const LINE_BITE_GAP = 900;
const SHARP_GAP = 2300;
const MIN_FRENZY = 6000;
const BUBBLE_MS = 3000;
/** Act 3: how long the revealed card hangs before the page glides to the scorecard. */
const HANG_MS = 1900;

const NARROW = 560;
const GLYPHS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ#%&*+=<>";

type Act = "pitch" | "morph" | "shrink" | "frenzy" | "catch" | "reveal";

type Bubble =
  | { id: number; lane: number; side: "sharks"; x: number; judge: JudgeId; text: string }
  | { id: number; lane: number; side: "feed"; x: number; person: FeedPerson; reaction: Reaction; text: string; changed: boolean };
type BubbleInput = Bubble extends infer B ? (B extends Bubble ? Omit<B, "id" | "lane"> : never) : never;

function useReducedMotion() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const q = window.matchMedia("(prefers-reduced-motion: reduce)");
    const on = () => setReduced(q.matches);
    on();
    q.addEventListener("change", on);
    return () => q.removeEventListener("change", on);
  }, []);
  return reduced;
}

/** Bubble lanes (bottom edges) inside the water, per side, so notes never stack. */
function laneBottoms(w: number, h: number, top: number): number[] {
  if (w < NARROW) return [h - 44];
  const first = top + 78;
  const room = h - 44 - first;
  const count = Math.max(1, Math.min(3, Math.floor(room / 74) + 1));
  if (count === 1) return [first];
  const step = room / (count - 1);
  return Array.from({ length: count }, (_, i) => first + i * step);
}

/** A shark's sharpest sentence: a question or a number beats a speech, and it has to fit a bubble. */
export function sharpestLine(lines: DebateLine[], id: VotingJudgeId): string | null {
  let best: { s: string; score: number } | null = null;
  for (const line of lines) {
    if (line.speaker !== id) continue;
    for (const raw of line.text.split(/(?<=[.!?])\s+/)) {
      const s = raw.trim();
      if (s.length < 14) continue;
      let score = -Math.abs(s.length - 62) / 28;
      if (s.endsWith("?")) score += 1.6;
      if (/\d/.test(s)) score += 0.8;
      if (/\b(no|nobody|never|won't|can't|why|who|dead|dies|kill|pay)\b/i.test(s)) score += 0.7;
      if (s.length > 120) score -= 3;
      if (!best || score > best.score) best = { s, score };
    }
  }
  if (!best) return null;
  return best.s.length > 120 ? `${best.s.slice(0, 117).trimEnd()}…` : best.s;
}

/** Scrambles `from` into `to` over `ms`. */
function useMorph(from: string, to: string, run: boolean, ms: number) {
  const [text, setText] = useState(from);
  useEffect(() => {
    if (!run) return;
    const start = performance.now();
    const id = setInterval(() => {
      const p = Math.min(1, (performance.now() - start) / ms);
      if (p >= 1) {
        setText(to);
        clearInterval(id);
        return;
      }
      const len = Math.max(to.length, Math.round(from.length * Math.pow(1 - p, 2.2)));
      const keep = Math.floor(p * p * to.length);
      let out = "";
      for (let i = 0; i < len; i++) {
        out += i < keep ? to[i] : from[i] === " " && p < 0.5 ? " " : GLYPHS[Math.floor(Math.random() * GLYPHS.length)];
      }
      setText(out);
    }, 45);
    return () => clearInterval(id);
  }, [from, to, run, ms]);
  return run ? text : from;
}

/**
 * The show: the pitch turns into IDEA and drops into the tank, five sharks toss it around while
 * the feed's fish swim and colour by reaction, then a line hooks the idea out and it flips to
 * the score. Only short notes surface; the full debate and feed wait under the scorecard.
 */
export function Tank({
  idea,
  lines,
  complete,
  feed,
  verdict,
  settled,
  onRevealed,
}: {
  idea: string;
  /** Debate lines as they stream in. */
  lines: DebateLine[];
  /** True once the whole debate (with scores) has arrived. */
  complete: boolean;
  feed: FeedProgress;
  verdict: TankVerdict | null;
  /** Cached verdict: start at the end, hoisted, no show. */
  settled: boolean;
  onRevealed: () => void;
}) {
  const wrap = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const reduced = useReducedMotion();
  const sim = useMemo(() => {
    const font =
      typeof window === "undefined"
        ? "sans-serif"
        : getComputedStyle(document.documentElement).getPropertyValue("--font-barlow").trim() || "'Arial Narrow', sans-serif";
    return new TankSim(
      VOTING_JUDGES.map((id) => ({ color: JUDGES[id].color, label: JUDGES[id].short })),
      FEED_SIZE,
      COLORS,
      idea.length * 31 + 7,
      font,
    );
  }, [idea]);

  const [size, setSize] = useState({ w: 0, h: 0 });
  const [act, setAct] = useState<Act>(settled ? "reveal" : "pitch");
  const actRef = useRef<Act>(settled ? "reveal" : "pitch");
  const go = (a: Act) => {
    actRef.current = a;
    setAct(a);
  };
  const [bites, setBites] = useState(0);
  const [biting, setBiting] = useState<VotingJudgeId | null>(null);
  const [bubbles, setBubbles] = useState<Bubble[]>([]);
  const [animatedCounts, setCounts] = useState<Record<Reaction, number> | null>(null);
  const [sharpDone, setSharpDone] = useState(false);
  const bubbleId = useRef(0);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const busyUntil = useRef(0);
  const frenzyAt = useRef(0);
  const onRevealedRef = useRef(onRevealed);
  useEffect(() => {
    onRevealedRef.current = onRevealed;
  });

  const later = (ms: number, fn: () => void) => timers.current.push(setTimeout(fn, Math.max(0, ms)));
  useEffect(() => () => timers.current.forEach(clearTimeout), []);
  /** Books a slot on the show's clock and returns its delay from now. */
  const book = (gap: number) => {
    const now = performance.now();
    const at = Math.max(now, busyUntil.current);
    busyUntil.current = at + gap;
    return at - now;
  };

  const box = useRef({ w: 0, h: 0 });
  const narrow = size.w > 0 && size.w < NARROW;
  const reveal = narrow ? { w: 248, h: 196 } : { w: 304, h: 220 };

  const say = (b: BubbleInput) => {
    if (actRef.current !== "frenzy") return;
    const id = ++bubbleId.current;
    const lanes = laneBottoms(box.current.w, box.current.h, sim.surfaceScreen).length;
    setBubbles((all) => {
      const mine = all.filter((x) => x.side === b.side);
      const used = new Set(mine.map((x) => x.lane));
      let lane = Array.from({ length: lanes }, (_, i) => i).find((i) => !used.has(i));
      let rest = all;
      if (lane === undefined) {
        lane = mine[0].lane;
        rest = all.filter((x) => x.id !== mine[0].id);
      }
      return [...rest, { ...b, id, lane } as Bubble];
    });
    later(BUBBLE_MS, () => setBubbles((all) => all.filter((x) => x.id !== id)));
  };

  // Canvas follows its box.
  useEffect(() => {
    const el = wrap.current;
    const cv = canvas.current;
    if (!el || !cv) return;
    let first = true;
    const ro = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      if (width < 10 || height < 10) return;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      cv.width = Math.round(width * dpr);
      cv.height = Math.round(height * dpr);
      cv.getContext("2d")?.setTransform(dpr, 0, 0, dpr, 0, 0);
      sim.resize(width, height, first);
      first = false;
      box.current = { w: width, h: height };
      setSize({ w: width, h: height });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [sim]);

  // The loop: paused off-screen; reduced motion draws single frames instead.
  useEffect(() => {
    const cv = canvas.current;
    const ctx = cv?.getContext("2d");
    if (!cv || !ctx || size.w === 0 || reduced) return;
    let raf = 0;
    let last = performance.now();
    let visible = true;
    const tick = (now: number) => {
      let left = Math.min((now - last) / 1000, 0.5);
      while (left > 0) {
        const dt = Math.min(left, 1 / 30);
        sim.step(dt);
        left -= dt;
      }
      last = now;
      sim.draw(ctx);
      raf = requestAnimationFrame(tick);
    };
    const io = new IntersectionObserver(([e]) => {
      const was = visible;
      visible = e.isIntersecting;
      if (visible && !was) {
        last = performance.now();
        raf = requestAnimationFrame(tick);
      } else if (!visible) cancelAnimationFrame(raf);
    });
    io.observe(cv);
    raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
      io.disconnect();
    };
  }, [sim, size.w, size.h, reduced]);

  useEffect(() => {
    const ctx = canvas.current?.getContext("2d");
    if (!reduced || !ctx || size.w === 0) return;
    sim.step(1 / 30);
    sim.draw(ctx);
  }, [sim, reduced, size.w, size.h, act, animatedCounts, feed.final, bites]);

  // Bites land: count them and name the biter for a moment.
  useEffect(() => {
    sim.onBite = (i) => {
      setBites(sim.bites);
      setBiting(VOTING_JUDGES[i]);
    };
    return () => {
      sim.onBite = null;
    };
  }, [sim]);

  // Act 1: the pitch, the morph into IDEA, the drop. A cached verdict starts at the end.
  const hoistY = size.w ? sim.hangPoint(reveal.h / 2) : 0;
  useEffect(() => {
    if (size.w === 0) return;
    if (settled) {
      sim.settleFish((feed.final ?? feed.first ?? []).map((r) => r.reaction));
      sim.showHoisted(sim.hangPoint(reveal.h / 2), reveal.h / 2);
      return;
    }
    if (reduced) {
      sim.placeInWater();
      frenzyAt.current = performance.now();
      later(0, () => go("frenzy"));
      return;
    }
    later(SHOW_PITCH, () => go("morph"));
    later(SHOW_PITCH + MORPH + 150, () => go("shrink"));
    // Runs once per tank; size only gates the first run.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sim, size.w > 0]);

  const dropped = () => {
    if (actRef.current !== "shrink") return;
    sim.drop(sim.introPoint);
    frenzyAt.current = performance.now();
    busyUntil.current = performance.now() + 1500;
    go("frenzy");
  };

  const skipIntro = () => {
    if (actRef.current === "frenzy" || actRef.current === "catch" || actRef.current === "reveal") return;
    sim.placeInWater();
    frenzyAt.current = performance.now();
    go("frenzy");
  };

  // Act 2a: each argument as it streams in is a bite (no text: the sharpest lines come later).
  const bitten = useRef(complete ? lines.length : 0);
  useEffect(() => {
    // Lines that arrive during the intro wait for the idea to hit the water.
    if (act !== "frenzy") return;
    for (; bitten.current < lines.length; bitten.current++) {
      const speaker = lines[bitten.current].speaker;
      if (speaker === "chair") continue;
      const i = VOTING_JUDGES.indexOf(speaker);
      later(book(LINE_BITE_GAP), () => sim.bite(i));
    }
  }, [lines, act, sim]);

  // Act 2b: once the debate is in, each shark's sharpest line, one bite each.
  const sharpQueued = useRef(false);
  useEffect(() => {
    if (!complete || act !== "frenzy" || sharpQueued.current || settled) return;
    sharpQueued.current = true;
    const queue = VOTING_JUDGES.map((id) => ({ id, text: sharpestLine(lines, id) })).filter((q) => q.text);
    queue.forEach((q) => {
      later(book(SHARP_GAP) + 200, () => {
        const i = VOTING_JUDGES.indexOf(q.id);
        sim.bite(i);
        const p = sim.sharkPosition(i);
        say({ side: "sharks", x: p?.x ?? box.current.w * 0.25, judge: q.id, text: q.text! });
      });
    });
    later(busyUntil.current - performance.now() + 400, () => setSharpDone(true));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [complete, act, settled]);

  // The feed's two rounds turn the fish.
  const playedFirst = useRef(false);
  const playedFinal = useRef(false);
  useEffect(() => {
    if (feed.people) sim.castPeople();
  }, [sim, feed.people]);
  useEffect(() => {
    if (settled) return;
    const final = feed.final;
    const live = act === "frenzy" || act === "catch";
    if (reduced && (final || feed.first)) {
      sim.settleFish((final ?? feed.first!).map((r) => r.reaction));
      playedFirst.current = playedFinal.current = !!final;
      return;
    }
    if (!live) return;
    const now = performance.now();
    if (feed.first && feed.people && !playedFirst.current) {
      playedFirst.current = true;
      const people = feed.people;
      const first = feed.first;
      const n = first.length;
      const order = first.map((_, i) => i).sort((a, b) => ((a * 7919) % 101) - ((b * 7919) % 101));
      const each = Math.min(45, 3600 / n);
      const applied: FeedReaction[] = [];
      order.forEach((i, k) => {
        later(k * each, () => {
          sim.react(i, first[i].reaction);
          applied.push(first[i]);
          setCounts(countReactions(applied));
        });
      });
      const loud = order
        .filter((i) => first[i].line)
        .sort((a, b) => rank(first[b], people[b]) - rank(first[a], people[a]))
        .slice(0, 5);
      loud.forEach((i, k) => {
        later(500 + k * 900, () => {
          const p = sim.fishPosition(i);
          if (p) say({ side: "feed", x: p.x, person: people[i], reaction: first[i].reaction, text: first[i].line, changed: false });
        });
      });
      busyUntil.current = Math.max(busyUntil.current, now + Math.max(n * each, 500 + loud.length * 900) + 600);
    }
    if (final && feed.first && feed.people && playedFirst.current && !playedFinal.current) {
      playedFinal.current = true;
      const people = feed.people;
      const first = feed.first;
      const changed = final.map((_, i) => i).filter((i) => final[i].reaction !== first[i].reaction);
      const start = Math.max(0, busyUntil.current - now - 1500);
      changed.forEach((i, k) => {
        later(start + k * 160, () => {
          sim.react(i, final[i].reaction);
          setCounts(countReactions(final.map((r, j) => (changed.indexOf(j) > k ? first[j] : r))));
        });
      });
      later(start + changed.length * 160 + 50, () => setCounts(countReactions(final)));
      const turned = changed.filter((i) => final[i].line).slice(0, 3);
      turned.forEach((i, k) => {
        later(start + 300 + k * 1000, () => {
          const p = sim.fishPosition(i);
          if (p) say({ side: "feed", x: p.x, person: people[i], reaction: final[i].reaction, text: final[i].line, changed: true });
        });
      });
      busyUntil.current = Math.max(busyUntil.current, now + start + Math.max(changed.length * 160, turned.length * 1000) + 800);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sim, feed.first, feed.final, feed.people, settled, reduced, act]);

  // Act 3: the catch, once the sharks have scored, the feed has settled and the show has played out.
  const feedSettled = feed.status === "done" || feed.status === "failed";
  const ready = verdict !== null && feedSettled && sharpDone;
  const reel = () => {
    if (actRef.current !== "frenzy") return;
    setBubbles([]);
    if (reduced) {
      sim.showHoisted(hoistY, reveal.h / 2);
      go("reveal");
      return;
    }
    go("catch");
    sim.onCaught = () => {
      sim.handOff(reveal.h / 2);
      go("reveal");
    };
    sim.startCatch(hoistY, reveal.h / 2);
  };
  useEffect(() => {
    if (!ready || act !== "frenzy") return;
    const now = performance.now();
    const at = Math.max(busyUntil.current, frenzyAt.current + MIN_FRENZY) + 500;
    const t = setTimeout(reel, Math.max(0, at - now));
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, act]);

  // After the reveal, hand over to the page (which glides to the scorecard).
  useEffect(() => {
    if (act !== "reveal" || settled) return;
    const t = setTimeout(() => onRevealedRef.current(), reduced ? 300 : HANG_MS);
    return () => clearTimeout(t);
  }, [act, settled, reduced]);

  const morphText = useMorph(idea.slice(0, 220), "IDEA", act !== "pitch", MORPH);

  const endReactions = feed.final ?? feed.first;
  const counts = (settled || reduced) && endReactions ? countReactions(endReactions) : animatedCounts;
  const intro = act === "pitch" || act === "morph" || act === "shrink";
  const sharkStatus =
    act === "reveal"
      ? "Verdict in"
      : act === "catch"
        ? "Reeling it in"
        : intro
          ? narrow
            ? "Circling"
            : "Smelling blood"
          : biting && !narrow
            ? `Bite ${bites} · ${JUDGES[biting].short}`
            : `${bites} ${bites === 1 ? "bite" : "bites"}`;
  const feedStatus =
    feed.status === "failed"
      ? "Feed went quiet"
      : feed.result
        ? `${feed.result.counts.share} of ${feed.result.people.length} would share`
        : feed.final
          ? "Reading replies"
          : feed.first
            ? "Reacting"
            : feed.people
              ? "Seeing the post"
              : `Casting ${FEED_SIZE}`;
  const canSkip = intro || (act === "frenzy" && ready);
  const card = size.w ? sim.card : { w: 80, h: 50 };
  const pitch = sim.introPoint;
  const pitchWidth = Math.min(520, size.w - 40);

  return (
    <div
      className="relative h-[460px] overflow-hidden border-[3px] border-ink bg-ink shadow-brutal sm:h-[560px]"
      aria-label={`The tank. Sharks: ${sharkStatus}. Feed: ${feedStatus}.`}
      role="img"
    >
      <div ref={wrap} className="absolute inset-0">
        <canvas ref={canvas} className="block h-full w-full" />
      </div>

      <SideLabel side="left" kicker="The sharks · 70%" title={`${VOTING_JUDGES.length} investors`} />
      <SideLabel side="right" kicker="The feed · 30%" title={`${FEED_SIZE} people`} />

      {/* Act 1: the pitch, morphing into IDEA, then shrinking to the card that drops. */}
      {size.w > 0 && intro && (
        <motion.div
          className="absolute z-10 flex items-center justify-center overflow-hidden border-[3px] border-ink bg-paper text-ink shadow-[5px_5px_0_0_#7b1a14]"
          style={{ left: pitch.x, top: pitch.y, x: "-50%", y: "-50%" }}
          initial={{ opacity: 0, scale: 0.9, width: pitchWidth }}
          animate={
            act === "shrink"
              ? { opacity: 1, scale: 1, width: card.w, height: card.h, padding: 0 }
              : { opacity: 1, scale: 1, width: pitchWidth, height: "auto", padding: narrow ? 14 : 18 }
          }
          transition={act === "shrink" ? { type: "spring", stiffness: 260, damping: 24 } : { duration: 0.35 }}
          onAnimationComplete={() => act === "shrink" && dropped()}
        >
          {act === "shrink" ? (
            <span className="font-display font-black leading-none" style={{ fontSize: Math.round(card.h * 0.56) }}>
              IDEA
            </span>
          ) : (
            <p
              className={cn(
                "line-clamp-4 w-full break-words text-center font-medium leading-snug [overflow-wrap:anywhere]",
                act === "morph" ? "font-mono uppercase tracking-wider" : "",
                narrow ? "text-sm" : "text-lg",
              )}
            >
              {morphText}
            </p>
          )}
        </motion.div>
      )}

      {/* Act 3: the hoisted idea flips to the score. */}
      {size.w > 0 && act === "reveal" && verdict && (
        <RevealCard
          verdict={verdict}
          x={size.w / 2}
          y={hoistY}
          from={card}
          to={reveal}
          instant={settled || reduced}
        />
      )}

      {/* Notes from the sharks (left) and the feed (right). */}
      <div className="pointer-events-none absolute inset-0">
        <AnimatePresence>
          {bubbles.map((b) => (
            <BubbleCard key={b.id} bubble={b} w={size.w} h={size.h} top={sim.surfaceScreen} narrow={narrow} />
          ))}
        </AnimatePresence>
      </div>

      {canSkip && (
        <button
          type="button"
          onClick={() => (intro ? skipIntro() : reel())}
          data-cursor="skip"
          className="absolute left-1/2 top-[52px] z-20 -translate-x-1/2 border-2 border-ink bg-paper px-2 py-1 font-mono text-[10px] font-bold uppercase tracking-widest text-ink shadow-[2px_2px_0_0_var(--ink)] hover:bg-mustard sm:top-3"
        >
          {intro ? "Skip intro" : "Reel it in"}
        </button>
      )}

      {/* Status, mirrored. */}
      <div className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-2 p-2 sm:p-3">
        <StatusChip align="left">
          <span className="flex gap-1">
            {VOTING_JUDGES.map((id) => (
              <span
                key={id}
                className="h-2.5 w-2.5 border-2 border-ink transition-colors duration-300"
                style={{ backgroundColor: intro ? "transparent" : JUDGES[id].color }}
              />
            ))}
          </span>
          <span className="truncate">{sharkStatus}</span>
        </StatusChip>
        <StatusChip align="right">
          {!(narrow && counts) && <span className="truncate">{feedStatus}</span>}
          {counts && (
            <span className="flex gap-1.5 tabular-nums">
              {REACTIONS.map((r) => (
                <span key={r} className="flex items-center gap-0.5" title={REACTION_LABEL[r]}>
                  <span className="h-2.5 w-2.5 border-2 border-ink" style={{ backgroundColor: REACTION_COLOR[r] }} />
                  {counts[r]}
                </span>
              ))}
            </span>
          )}
        </StatusChip>
      </div>
      <span className="sr-only" aria-live="polite">
        {act === "reveal" && verdict ? `Out of the tank: ${verdict.overall} out of 100, ${gradeFor(verdict.overall).label}.` : ""}
      </span>
    </div>
  );
}

function rank(r: FeedReaction, p: FeedPerson) {
  const loud = r.reaction === "share" ? 3 : r.reaction === "object" ? 2.5 : r.reaction === "like" ? 1.5 : 0;
  return loud + (p.target ? 1 : 0) + Math.min(1, r.line.length / 60);
}

function RevealCard({
  verdict,
  x,
  y,
  from,
  to,
  instant,
}: {
  verdict: TankVerdict;
  x: number;
  y: number;
  from: { w: number; h: number };
  to: { w: number; h: number };
  instant: boolean;
}) {
  const grade = gradeFor(verdict.overall);
  const [counted, setCounted] = useState(instant);
  return (
    <motion.div
      className="absolute z-10 [perspective:900px]"
      style={{ left: x, top: y, x: "-50%", y: "-50%", transformOrigin: "50% 0%" }}
      initial={instant ? false : { width: from.w, height: from.h, rotate: 0 }}
      animate={{ width: to.w, height: to.h, rotate: instant ? 0 : [0, -3, 2.2, -1.2, 0.5, 0] }}
      transition={{ width: { type: "spring", stiffness: 200, damping: 22 }, height: { type: "spring", stiffness: 200, damping: 22 }, rotate: { duration: 2.6, ease: "easeOut" } }}
    >
      <motion.div
        className="relative h-full w-full [transform-style:preserve-3d]"
        initial={instant ? false : { rotateY: 0 }}
        animate={{ rotateY: 180 }}
        transition={{ delay: 0.35, duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
        onAnimationComplete={() => setCounted(true)}
      >
        {/* Front: the card that came out of the water. */}
        <div className="absolute inset-0 flex items-center justify-center border-[3px] border-ink bg-paper shadow-[5px_5px_0_0_#7b1a14] [backface-visibility:hidden]">
          <span className="font-display font-black leading-none" style={{ fontSize: Math.round(from.h * 0.56) }}>
            IDEA
          </span>
        </div>
        {/* Back: the score. */}
        <div className="absolute inset-0 flex flex-col border-[3px] border-ink bg-paper p-3 text-ink shadow-[6px_6px_0_0_var(--ink)] [backface-visibility:hidden] [transform:rotateY(180deg)] sm:p-4">
          <div className="flex items-center justify-between gap-2 font-mono text-[9px] font-bold uppercase tracking-[0.2em] sm:text-[10px]">
            <span>{verdict.final ? "Out of the tank" : "Provisional"}</span>
            <span className="text-ink/55">/100</span>
          </div>
          <p className="mt-1 line-clamp-2 font-display text-lg font-black uppercase leading-[0.95] sm:text-xl">{verdict.title}</p>
          <div className="mt-auto flex items-end justify-between gap-2">
            <span className="font-display text-7xl font-black leading-[0.8] tabular-nums sm:text-8xl">
              <NumberFlow value={counted ? verdict.overall : 0} transformTiming={{ duration: 1100, easing: "ease-out" }} />
            </span>
            <motion.span
              initial={instant ? false : { scale: 2.4, opacity: 0, rotate: -14 }}
              animate={counted ? { scale: 1, opacity: 1, rotate: -6 } : undefined}
              transition={{ type: "spring", stiffness: 420, damping: 18, delay: 0.5 }}
              className={cn(
                "mb-1 border-[3px] border-ink px-2 py-0.5 font-display text-xl font-black uppercase leading-none sm:text-2xl",
                verdict.overall >= 55 ? "bg-mint" : "bg-coral",
                !verdict.final && "border-dashed opacity-80",
              )}
            >
              {grade.label}
            </motion.span>
          </div>
          <p className="mt-2 font-mono text-[9px] font-bold uppercase tracking-wider text-ink/65 sm:text-[10px]">
            Sharks {verdict.sharkScore}
            {verdict.feedScore !== null ? ` · Feed ${verdict.feedScore}` : " · Feed —"}
          </p>
        </div>
      </motion.div>
    </motion.div>
  );
}

function SideLabel({ side, kicker, title }: { side: "left" | "right"; kicker: string; title: string }) {
  return (
    <div className={cn("pointer-events-none absolute top-2 z-0 sm:top-3", side === "left" ? "left-2 text-left sm:left-3" : "right-2 text-right sm:right-3")}>
      <p className="font-mono text-[9px] font-bold uppercase tracking-[0.25em] text-coral-deep sm:text-[10px]">{kicker}</p>
      <p className="font-display text-lg font-black uppercase leading-none text-ink sm:text-2xl">{title}</p>
    </div>
  );
}

function StatusChip({ align, children }: { align: "left" | "right"; children: React.ReactNode }) {
  return (
    <div
      className={cn(
        "flex min-w-0 max-w-[48%] items-center gap-2 border-2 border-ink bg-paper px-2 py-1 font-mono text-[9px] font-bold uppercase tracking-wider text-ink shadow-[3px_3px_0_0_var(--ink)] sm:text-[10px]",
        align === "right" && "flex-row-reverse",
      )}
    >
      {children}
    </div>
  );
}

function BubbleCard({ bubble, w, h, top, narrow }: { bubble: Bubble; w: number; h: number; top: number; narrow: boolean }) {
  const width = narrow ? Math.min(172, w / 2 - 12) : 230;
  const [lo, hi] = bubble.side === "sharks" ? [8 + width / 2, w / 2 - 10 - width / 2] : [w / 2 + 10 + width / 2, w - 8 - width / 2];
  const x = Math.max(lo, Math.min(hi, bubble.x));
  const lanes = laneBottoms(w, h, top);
  const y = lanes[Math.min(bubble.lane, lanes.length - 1)];
  const fish = bubble.side === "feed";
  const color = fish ? REACTION_COLOR[bubble.reaction] : JUDGES[bubble.judge].color;
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.85, y: 8 }}
      animate={{ opacity: 1, scale: 1, y: -6 }}
      exit={{ opacity: 0, y: -18, transition: { duration: 0.35 } }}
      transition={{ type: "spring", stiffness: 380, damping: 26 }}
      className="absolute"
      style={{ left: x, top: y, width, translateX: "-50%", translateY: "-100%" }}
    >
      <div className="border-2 border-ink bg-paper text-ink shadow-[3px_3px_0_0_var(--ink)]">
        <div className="flex items-center justify-between gap-2 border-b-2 border-ink px-1.5 py-0.5" style={{ backgroundColor: color }}>
          <span className="truncate font-mono text-[8px] font-bold uppercase tracking-wider">
            {fish ? `${PLATFORM_LABEL[bubble.person.platform]} · ${bubble.person.handle}` : JUDGES[bubble.judge].name}
          </span>
          <span className="shrink-0 font-mono text-[8px] font-bold uppercase tracking-wider">
            {fish ? `${bubble.changed ? "↺ " : ""}${REACTION_LABEL[bubble.reaction]}` : "Bites"}
          </span>
        </div>
        <p className={cn("px-1.5 py-1 font-medium leading-snug", narrow ? "text-[11px]" : "text-xs")}>{bubble.text}</p>
      </div>
    </motion.div>
  );
}
