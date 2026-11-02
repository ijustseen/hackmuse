"use client";

import { AnimatePresence, motion } from "motion/react";
import { useEffect, useMemo, useRef, useState } from "react";
import { ArenaSim, type ArenaColors } from "@/lib/client/arena-sim";
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
import { JUDGES, VOTING_JUDGES, type JudgeId } from "@/lib/judges";
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

const COLORS: ArenaColors = {
  ink: "#10201c",
  cream: "#f1ecdf",
  paper: "#faf7ef",
  waterTop: "#24443d",
  waterBottom: "#10201c",
  reaction: REACTION_COLOR,
};

const JOIN_EVERY = 650;
const BUBBLE_MS = 2900;
/** Bubbles sit in fixed lanes (bottom edges) per side, so they never stack on each other. */
const LANE_TOP = 132;
const LANE_FLOOR = 46;
/** Below this width each half is too narrow to float notes beside the idea. */
const NARROW = 560;
function laneBottoms(w: number, h: number, compact: boolean): number[] {
  // Phones: one lane per side, under the idea; none in the small strip (the counters say it all).
  if (w < NARROW) return compact ? [] : [h - LANE_FLOOR];
  const room = h - LANE_FLOOR - LANE_TOP;
  const count = Math.max(1, Math.min(3, Math.floor(room / 64) + 1));
  if (count === 1) return [LANE_TOP];
  const step = room / (count - 1);
  return Array.from({ length: count }, (_, i) => LANE_TOP + i * step);
}

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

/**
 * The waiting room and the live strip above the debate: sharks circle the idea on the left, the
 * feed's 30 fish school on the right and swim to wherever their reaction puts them. Only short
 * notifications surface; the feed's full chatter stays hidden until the scorecard.
 */
export function Arena({
  title,
  idea,
  feed,
  speaker,
  lineIndex,
  assembled,
  done,
  settled,
  compact,
  onAssembled,
}: {
  title: string | null;
  idea: string;
  feed: FeedProgress;
  /** Who is talking at the table right now. */
  speaker: JudgeId | null;
  lineIndex: number;
  assembled: boolean;
  done: boolean;
  /** Cached verdict: show the end state without replaying the intro. */
  settled: boolean;
  compact: boolean;
  onAssembled: () => void;
}) {
  const wrap = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const reduced = useReducedMotion();
  const sim = useMemo(
    () =>
      new ArenaSim(
        VOTING_JUDGES.map((id) => ({ color: JUDGES[id].color, label: JUDGES[id].short })),
        FEED_SIZE,
        COLORS,
        idea.length * 31 + 7,
      ),
    [idea],
  );
  const [size, setSize] = useState({ w: 0, h: 0 });
  const [joinedCount, setJoined] = useState(0);
  const [bubbles, setBubbles] = useState<Bubble[]>([]);
  const [animatedCounts, setCounts] = useState<Record<Reaction, number> | null>(null);
  const bubbleId = useRef(0);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const onAssembledRef = useRef(onAssembled);
  useEffect(() => {
    onAssembledRef.current = onAssembled;
  });

  const later = (ms: number, fn: () => void) => timers.current.push(setTimeout(fn, ms));
  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  const boxRef = useRef({ w: 0, h: 0, compact });
  useEffect(() => {
    boxRef.current.compact = compact;
  }, [compact]);
  const say = (b: BubbleInput) => {
    const id = ++bubbleId.current;
    const lanes = laneBottoms(boxRef.current.w, boxRef.current.h, boxRef.current.compact).length;
    if (lanes === 0) return;
    setBubbles((all) => {
      const mine = all.filter((x) => x.side === b.side);
      const used = new Set(mine.map((x) => x.lane));
      let lane = Array.from({ length: lanes }, (_, i) => i).find((i) => !used.has(i));
      let rest = all;
      if (lane === undefined) {
        // Every lane is taken: the oldest note on this side makes room.
        lane = mine[0].lane;
        rest = all.filter((x) => x.id !== mine[0].id);
      }
      return [...rest, { ...b, id, lane } as Bubble];
    });
    later(BUBBLE_MS, () => setBubbles((all) => all.filter((x) => x.id !== id)));
  };

  // Canvas size follows the box (including the compact transition).
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
      boxRef.current.w = width;
      boxRef.current.h = height;
      setSize({ w: width, h: height });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [sim]);

  // The loop. Paused off-screen; with reduced motion it draws single frames on change instead.
  useEffect(() => {
    const cv = canvas.current;
    const ctx = cv?.getContext("2d");
    if (!cv || !ctx || size.w === 0 || reduced) return;
    let raf = 0;
    let last = performance.now();
    let visible = true;
    const tick = (now: number) => {
      // Catch up in small steps when frames come late (a busy phone, a throttled tab), so the scene
      // keeps real time instead of slowing down; beyond half a second it just skips ahead.
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

  // Reduced motion: one still frame whenever something changes.
  useEffect(() => {
    const ctx = canvas.current?.getContext("2d");
    if (!reduced || !ctx || size.w === 0) return;
    sim.step(0);
    sim.draw(ctx);
  }, [sim, reduced, size.w, size.h, animatedCounts, joinedCount, assembled, feed.final, speaker, done]);

  // Intro: the sharks join one by one, each with its opening line, then the debate may start.
  useEffect(() => {
    if (settled || assembled) {
      sim.joinAll();
      return;
    }
    if (size.w === 0) return;
    VOTING_JUDGES.forEach((id, i) => {
      later(300 + i * JOIN_EVERY, () => {
        sim.joinShark(i);
        setJoined(i + 1);
        const p = sim.sharkPosition(i);
        say({ side: "sharks", x: p?.x ?? size.w * 0.25, judge: id, text: JUDGES[id].joinLine });
      });
    });
    later(300 + VOTING_JUDGES.length * JOIN_EVERY + 500, () => onAssembledRef.current());
    // Runs once per arena; size only gates the first run.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sim, settled, size.w > 0]);

  useEffect(() => {
    sim.setHunting(!assembled && !settled);
  }, [sim, assembled, settled]);

  // A shark darts at the idea when it argues.
  useEffect(() => {
    if (!speaker || speaker === "chair" || settled) return;
    sim.lunge(VOTING_JUDGES.indexOf(speaker));
  }, [sim, speaker, lineIndex, settled]);

  // Feed steps.
  useEffect(() => {
    if (feed.people) sim.castPeople();
  }, [sim, feed.people]);

  const playedFirst = useRef(false);
  const playedFinal = useRef(false);
  useEffect(() => {
    const final = feed.final;
    if ((settled || reduced) && (final || feed.first)) {
      const end = final ?? feed.first!;
      sim.settle(end.map((r) => r.reaction));
      playedFirst.current = playedFinal.current = true;
      return;
    }
    if (feed.first && feed.people && !playedFirst.current && size.w > 0) {
      playedFirst.current = true;
      const people = feed.people;
      const first = feed.first;
      const order = first.map((_, i) => i).sort((a, b) => ((a * 7919) % 31) - ((b * 7919) % 31));
      const applied: FeedReaction[] = [];
      order.forEach((i, k) => {
        later(k * 110, () => {
          sim.react(i, first[i].reaction);
          applied.push(first[i]);
          setCounts(countReactions(applied));
        });
      });
      // A handful of notifications: the people it's for and the loud reactions first.
      const loud = order
        .filter((i) => first[i].line)
        .sort((a, b) => rank(first[b], people[b]) - rank(first[a], people[a]))
        .slice(0, 8);
      loud.forEach((i, k) => {
        later(450 + k * 620, () => {
          const p = sim.fishPosition(i);
          if (p) say({ side: "feed", x: p.x, person: people[i], reaction: first[i].reaction, text: first[i].line, changed: false });
        });
      });
    }
    if (final && feed.first && feed.people && playedFirst.current && !playedFinal.current) {
      playedFinal.current = true;
      const people = feed.people;
      const first = feed.first;
      const changed = final.map((r, i) => i).filter((i) => final[i].reaction !== first[i].reaction);
      // Let round 1 finish moving before round 2 starts.
      const start = 30 * 110 + 1200;
      changed.forEach((i, k) => {
        later(start + k * 260, () => {
          sim.react(i, final[i].reaction);
          setCounts(countReactions(final.map((r, j) => (changed.indexOf(j) > k ? first[j] : r))));
        });
      });
      later(start + changed.length * 260 + 50, () => setCounts(countReactions(final)));
      changed
        .filter((i) => final[i].line)
        .slice(0, 3)
        .forEach((i, k) => {
          later(start + 300 + k * 900, () => {
            const p = sim.fishPosition(i);
            if (p) say({ side: "feed", x: p.x, person: people[i], reaction: final[i].reaction, text: final[i].line, changed: true });
          });
        });
    }
    // `later`/`say` are stable enough for this: they only touch refs and setters.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sim, feed.first, feed.final, feed.people, settled, reduced, size.w > 0]);

  const orb = size.w ? sim.orb : null;
  // A settled arena (cached verdict, reduced motion) shows the end state directly.
  const jumpToEnd = settled || reduced;
  const endReactions = feed.final ?? feed.first;
  const counts = jumpToEnd && endReactions ? countReactions(endReactions) : animatedCounts;
  const joined = settled || assembled ? VOTING_JUDGES.length : joinedCount;
  const share = counts?.share ?? 0;
  const narrow = size.w > 0 && size.w < NARROW;

  const sharkStatus = done
    ? "Verdict in"
    : assembled
      ? speaker && speaker !== "chair"
        ? narrow
          ? JUDGES[speaker].short
          : `Biting · ${JUDGES[speaker].short}`
        : speaker === "chair"
          ? narrow
            ? "Master"
            : "The Tank Master speaks"
          : "Circling"
      : `${narrow ? "" : "Joining · "}${joined}/${VOTING_JUDGES.length}`;
  const feedStatus =
    feed.status === "failed"
      ? "Feed went quiet"
      : feed.result
        ? `${feed.result.counts.share} of ${FEED_SIZE} would share`
        : feed.final
          ? "Reading the replies"
          : feed.first
            ? "Round 1 · reacting"
            : feed.people
              ? "Showing them the post"
              : `Casting ${FEED_SIZE} people`;

  return (
    <div
      className={cn(
        "relative overflow-hidden border-[3px] border-ink bg-ink shadow-brutal transition-[height] duration-700 ease-[cubic-bezier(0.22,1,0.36,1)]",
        compact ? "h-[210px] sm:h-[250px]" : "h-[400px] sm:h-[480px]",
      )}
      aria-label={`The sharks and the feed. Sharks: ${sharkStatus}. Feed: ${feedStatus}.`}
      role="img"
    >
      <div ref={wrap} className="absolute inset-0">
        <canvas ref={canvas} className="block h-full w-full" />
      </div>

      {/* Side labels, mirrored. */}
      <SideLabel side="left" kicker="The sharks" title={`${VOTING_JUDGES.length} investors`} weight="70%" compact={compact} />
      <SideLabel side="right" kicker="The feed" title={`${FEED_SIZE} people · social`} weight="30%" compact={compact} />

      {/* The idea in the middle of the water. */}
      {orb && (
        <div
          className="pointer-events-none absolute flex -translate-x-1/2 -translate-y-1/2 flex-col items-center justify-center text-center text-ink"
          style={{ left: orb.x, top: orb.y, width: orb.r * 1.7, height: orb.r * 1.7 }}
        >
          {orb.r >= 46 && (
            <span className="font-mono text-[8px] font-bold uppercase tracking-[0.25em] text-coral-deep sm:text-[9px]">
              {done ? "Judged" : "The idea"}
            </span>
          )}
          <span
            className="line-clamp-3 break-words font-display font-black uppercase leading-[0.88] [overflow-wrap:anywhere]"
            style={{ fontSize: Math.max(9, Math.min(20, orb.r * 0.25)) }}
          >
            {title ?? "· · ·"}
          </span>
        </div>
      )}

      {/* Notifications. */}
      <div className="pointer-events-none absolute inset-0">
        <AnimatePresence>
          {bubbles.map((b) => (
            <BubbleCard key={b.id} bubble={b} w={size.w} h={size.h} narrow={narrow} compact={compact} />
          ))}
        </AnimatePresence>
      </div>

      {/* Status bars, mirrored. */}
      <div className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-2 p-2 sm:p-3">
        <StatusChip align="left">
          <span className="flex gap-1">
            {VOTING_JUDGES.map((id, i) => (
              <span
                key={id}
                className="h-2.5 w-2.5 border-2 border-ink transition-colors duration-300"
                style={{ backgroundColor: i < joined ? JUDGES[id].color : "transparent" }}
              />
            ))}
          </span>
          <span className="truncate">{sharkStatus}</span>
        </StatusChip>
        {!assembled && !settled && (
          <button
            type="button"
            onClick={() => onAssembledRef.current()}
            data-cursor="skip"
            className="pointer-events-auto absolute bottom-2 left-1/2 hidden -translate-x-1/2 border-2 border-ink bg-paper px-2 py-1 font-mono text-[10px] font-bold uppercase tracking-widest text-ink hover:bg-mustard sm:bottom-3 sm:block"
          >
            Skip intro
          </button>
        )}
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
        {feed.result ? `${share} of ${FEED_SIZE} people in the feed would share it.` : ""}
      </span>
    </div>
  );
}

function rank(r: FeedReaction, p: FeedPerson) {
  const loud = r.reaction === "share" ? 3 : r.reaction === "object" ? 2.5 : r.reaction === "like" ? 1.5 : 0;
  return loud + (p.target ? 1 : 0) + Math.min(1, r.line.length / 60);
}

function SideLabel({
  side,
  kicker,
  title,
  weight,
  compact,
}: {
  side: "left" | "right";
  kicker: string;
  title: string;
  weight: string;
  compact: boolean;
}) {
  return (
    <div className={cn("pointer-events-none absolute top-2 sm:top-3", side === "left" ? "left-2 text-left sm:left-3" : "right-2 text-right sm:right-3")}>
      <p className="font-mono text-[9px] font-bold uppercase tracking-[0.25em] text-mustard sm:text-[10px]">
        {kicker} · {weight}
      </p>
      <p
        className={cn(
          "font-display font-black uppercase leading-none text-cream transition-[font-size] duration-700",
          compact ? "text-lg sm:text-xl" : "text-xl sm:text-3xl",
        )}
      >
        {title}
      </p>
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

function BubbleCard({
  bubble,
  w,
  h,
  narrow,
  compact,
}: {
  bubble: Bubble;
  w: number;
  h: number;
  narrow: boolean;
  compact: boolean;
}) {
  const width = narrow ? Math.min(170, w / 2 - 14) : 210;
  // Keep each side's notes on its own side of the water, clear of the labels and status bars.
  const [lo, hi] = bubble.side === "sharks" ? [8 + width / 2, w / 2 - 12 - width / 2] : [w / 2 + 12 + width / 2, w - 8 - width / 2];
  const x = Math.max(lo, Math.min(hi, bubble.x));
  const lanes = laneBottoms(w, h, compact);
  if (lanes.length === 0) return null;
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
          {fish && (
            <span className="shrink-0 font-mono text-[8px] font-bold uppercase tracking-wider">
              {bubble.changed ? "↺ " : ""}
              {REACTION_LABEL[bubble.reaction]}
            </span>
          )}
        </div>
        <p className={cn("px-1.5 py-1 font-medium leading-snug", narrow ? "text-[11px]" : "text-xs")}>{bubble.text}</p>
      </div>
    </motion.div>
  );
}
