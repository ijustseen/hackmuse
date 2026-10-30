"use client";

import { motion, useScroll, useTransform } from "motion/react";
import { useRef } from "react";
import { JUDGES, JUDGE_ORDER } from "@/lib/judges";
import { IdeaForm } from "./idea-form";

function SpinningSticker() {
  const text = "★ NO MERCY ★ NO FLUFF ★ HONEST SCORES ★ OUT LOUD ";
  return (
    <div className="relative h-36 w-36">
      <svg viewBox="0 0 200 200" className="h-full w-full animate-spin-slow">
        <defs>
          <path id="sticker-circle" d="M100,100 m-78,0 a78,78 0 1,1 156,0 a78,78 0 1,1 -156,0" />
        </defs>
        <circle cx="100" cy="100" r="98" fill="var(--mustard)" stroke="var(--ink)" strokeWidth="4" />
        <text className="fill-ink font-mono text-[17px] font-bold tracking-[0.12em]">
          <textPath href="#sticker-circle">{text}</textPath>
        </text>
      </svg>
      <span className="absolute inset-0 flex items-center justify-center font-display text-5xl font-black">§</span>
    </div>
  );
}

export function Hero() {
  const ref = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end start"] });
  const y1 = useTransform(scrollYProgress, [0, 1], [0, -60]);
  const y2 = useTransform(scrollYProgress, [0, 1], [0, -130]);
  const y3 = useTransform(scrollYProgress, [0, 1], [0, -200]);
  const rotate = useTransform(scrollYProgress, [0, 1], [-3, -12]);

  const lineIn = (delay: number) => ({
    initial: { y: "110%", rotate: 4 },
    animate: { y: "0%", rotate: 0 },
    transition: { duration: 0.8, delay, ease: [0.22, 1, 0.36, 1] as const },
  });

  return (
    <section ref={ref} id="pitch" className="relative scroll-mt-16 overflow-hidden border-b-[3px] border-ink">
      <div className="bg-grid absolute inset-0" />
      <div className="relative mx-auto grid max-w-7xl gap-12 px-4 pb-20 pt-12 sm:px-6 lg:grid-cols-[1.1fr_1fr] lg:gap-10 lg:pb-28 lg:pt-20">
        <div className="relative">
          <motion.p
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="inline-flex items-center gap-2 border-2 border-ink bg-paper px-3 py-1 font-mono text-[11px] font-bold uppercase tracking-[0.25em] shadow-ink-sm"
          >
            <span className="h-2 w-2 animate-blink bg-coral" /> AI judging panel · Gemma 4 × ElevenLabs
          </motion.p>

          <h1 className="mt-6 font-display font-black uppercase leading-[0.86] tracking-tight">
            <motion.span style={{ y: y1 }} className="block overflow-hidden text-[clamp(3.4rem,9vw,7.6rem)]">
              <motion.span className="block" {...lineIn(0.05)}>Put your</motion.span>
            </motion.span>
            <motion.span style={{ y: y2 }} className="block overflow-hidden text-[clamp(3.4rem,9vw,7.6rem)]">
              <motion.span className="text-outline block" {...lineIn(0.15)}>hackathon</motion.span>
            </motion.span>
            <motion.span style={{ y: y2 }} className="block overflow-hidden pb-4 text-[clamp(3.4rem,9vw,7.6rem)]">
              <motion.span className="block" {...lineIn(0.25)}>idea</motion.span>
            </motion.span>
            <motion.span style={{ y: y3, rotate }} className="relative -mt-2 inline-block origin-left">
              <motion.span
                initial={{ scale: 2.4, opacity: 0, rotate: -14 }}
                animate={{ scale: 1, opacity: 1, rotate: 0 }}
                transition={{ delay: 0.7, type: "spring", stiffness: 260, damping: 14 }}
                className="inline-block border-[3px] border-ink bg-coral px-4 py-1 text-[clamp(3.4rem,9vw,7.6rem)] shadow-brutal"
              >
                on trial.
              </motion.span>
            </motion.span>
          </h1>

          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="mt-10 max-w-lg text-lg leading-relaxed text-ink/80"
          >
            Pitch it in a few sentences. Four AI judges sit down at the round table, argue about it{" "}
            <em className="font-semibold not-italic text-ink underline decoration-coral decoration-4 underline-offset-4">
              out loud
            </em>
            , and hand you a score you can actually use.
          </motion.p>

          <div className="mt-8 flex items-center gap-3">
            <div className="flex -space-x-2">
              {JUDGE_ORDER.map((id, i) => (
                <motion.span
                  key={id}
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.8 + i * 0.08 }}
                  className="inline-flex h-11 w-11 items-center justify-center border-2 border-ink font-display text-2xl font-black"
                  style={{ backgroundColor: JUDGES[id].color }}
                  title={JUDGES[id].name}
                >
                  {JUDGES[id].glyph}
                </motion.span>
              ))}
            </div>
            <p className="font-mono text-xs font-bold uppercase leading-tight tracking-wider">
              4 judges · 8 arguments
              <br />
              1 verdict · 0 mercy
            </p>
          </div>

          <div className="pointer-events-none absolute -right-2 top-0 hidden xl:block">
            <SpinningSticker />
          </div>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 40, rotate: 2 }}
          animate={{ opacity: 1, y: 0, rotate: 0 }}
          transition={{ delay: 0.35, duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          className="relative lg:pt-6"
        >
          <span className="absolute -left-3 -top-4 z-10 rotate-[-6deg] animate-wiggle border-2 border-ink bg-mustard px-2 py-0.5 font-mono text-[11px] font-bold uppercase tracking-widest shadow-ink-sm">
            Step 1 · pitch it
          </span>
          <IdeaForm />
        </motion.div>
      </div>
    </section>
  );
}
