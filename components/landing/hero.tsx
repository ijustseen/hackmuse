"use client";

import { motion, useScroll, useTransform } from "motion/react";
import Link from "next/link";
import { useRef, useSyncExternalStore } from "react";
import { JudgeAvatar } from "@/components/judge-avatar";
import { startDemoSession } from "@/lib/idea";
import { FEED_SIZE } from "@/lib/feed";
import { JUDGES, JUDGE_ORDER, VOTING_JUDGES } from "@/lib/judges";
import { IdeaForm } from "./idea-form";

// Parallax only on wide screens: on a phone the headline lines would slide into each other mid-scroll.
const WIDE = "(min-width: 1024px)";
const subscribeWide = (onChange: () => void) => {
  const query = window.matchMedia(WIDE);
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
};

export function Hero() {
  const ref = useRef<HTMLElement>(null);
  const wide = useSyncExternalStore(subscribeWide, () => window.matchMedia(WIDE).matches, () => false);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end start"] });
  const y1 = useTransform(scrollYProgress, [0, 1], [0, -60]);
  const y2 = useTransform(scrollYProgress, [0, 1], [0, -130]);
  const y3 = useTransform(scrollYProgress, [0, 1], [0, -200]);
  const rotate = useTransform(scrollYProgress, [0, 1], [-3, -12]);

  const delay = (s: number) => ({ animationDelay: `${s}s` });

  return (
    <section ref={ref} id="pitch" className="relative scroll-mt-16 overflow-hidden border-b-[3px] border-ink">
      <div className="bg-grid absolute inset-0" />
      {/* minmax(0, …) columns: without them the long no-wrap idea chips widen the column past a phone screen. */}
      <div className="relative mx-auto grid max-w-7xl grid-cols-1 gap-12 px-4 pb-20 pt-12 sm:px-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)] lg:items-center lg:gap-10 lg:pb-28 lg:pt-20">
        <div className="relative min-w-0">
          <p
            className="anim-fade-up inline-flex items-center gap-2 border-2 border-ink bg-paper px-3 py-1 font-mono text-[11px] font-bold uppercase tracking-[0.25em] shadow-ink-sm"
          >
            <span className="h-2 w-2 animate-blink bg-coral" /> AI shark tank for hackathon ideas
          </p>

          <h1 className="mt-6 font-display font-black uppercase leading-[0.86] tracking-tight">
            <motion.span style={{ y: wide ? y1 : 0 }} className="block overflow-hidden text-[clamp(3.2rem,8.4vw,7.2rem)]">
              <span className="anim-rise block" style={delay(0.05)}>
                Throw your
              </span>
            </motion.span>
            <motion.span style={{ y: wide ? y2 : 0 }} className="block overflow-hidden text-[clamp(3.2rem,8.4vw,7.2rem)]">
              <span className="anim-rise text-outline block" style={delay(0.15)}>
                hackathon
              </span>
            </motion.span>
            <motion.span style={{ y: wide ? y2 : 0 }} className="block overflow-hidden pb-4 text-[clamp(3.2rem,8.4vw,7.2rem)]">
              <span className="anim-rise block" style={delay(0.25)}>
                idea to the
              </span>
            </motion.span>
            <motion.span style={{ y: wide ? y3 : 0, rotate: wide ? rotate : -3 }} className="relative -mt-2 inline-block origin-left">
              <span
                style={delay(0.7)}
                className="anim-slam inline-block border-[3px] border-ink bg-coral px-4 py-1 text-[clamp(3.2rem,8.4vw,7.2rem)] shadow-brutal"
              >
                sharks.
              </span>
            </motion.span>
          </h1>

          {/* The largest text on a phone: it moves in but is never invisible, so it paints at once. */}
          <p style={delay(0.3)} className="anim-nudge mt-10 max-w-lg text-lg leading-relaxed text-ink/80"
          >
            Pitch it in a few sentences. Five AI sharks tear into it while 30 simulated people from social media decide whether they{" "}
            <em className="font-semibold not-italic text-ink underline decoration-coral decoration-4 underline-offset-4">
              would share it
            </em>
            . Then you see what survived and what to fix before the judges do.
          </p>

          <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-4">
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex -space-x-2">
                {JUDGE_ORDER.map((id, i) => (
                  <span key={id} className="anim-fade-up" style={delay(0.8 + i * 0.08)} title={JUDGES[id].name}>
                    <JudgeAvatar id={id} className="w-11" />
                  </span>
                ))}
              </div>
              <p className="whitespace-nowrap font-mono text-xs font-bold uppercase leading-tight tracking-wider">
                {VOTING_JUDGES.length} sharks · {FEED_SIZE} people
                <br />
                ~90 seconds · free
              </p>
            </div>
            <div className="anim-fade-up" style={delay(1.1)}>
              <Link
                href="/debate?demo=1"
                onClick={() => startDemoSession()}
                data-cursor="watch"
                className="group inline-flex items-center gap-2 border-b-[3px] border-ink pb-0.5 font-mono text-xs font-bold uppercase tracking-widest"
              >
                <span className="inline-flex h-6 w-6 items-center justify-center border-2 border-ink bg-mustard text-[10px] transition-transform group-hover:rotate-12">
                  ▶
                </span>
                Watch a demo debate
              </Link>
            </div>
          </div>
        </div>

        <div className="anim-fade-up relative min-w-0 lg:pt-6" style={delay(0.35)}>
          <span className="absolute -left-3 -top-4 z-10 rotate-[-6deg] animate-wiggle border-2 border-ink bg-mustard px-2 py-0.5 font-mono text-[11px] font-bold uppercase tracking-widest shadow-ink-sm">
            Step 1 · pitch it
          </span>
          <IdeaForm />
        </div>
      </div>
    </section>
  );
}
