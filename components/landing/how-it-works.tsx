"use client";

import { StackingCards, type StackItem } from "@/components/ui/stacking-cards";
import { TextAnimation } from "@/components/ui/text-animation";
import { JudgeAvatar } from "@/components/judge-avatar";
import { JUDGE_ORDER } from "@/lib/judges";

const PitchArt = (
  <div className="w-64 border-[3px] border-ink bg-cream p-3 shadow-brutal-sm">
    <div className="h-2 w-24 bg-ink" />
    <div className="mt-3 space-y-1.5">
      <div className="h-2 w-full bg-ink/30" />
      <div className="h-2 w-5/6 bg-ink/30" />
      <div className="h-2 w-2/3 bg-ink/30" />
    </div>
    <div className="mt-4 ml-auto w-fit border-2 border-ink bg-coral px-2 py-1 font-mono text-[10px] font-bold uppercase shadow-[3px_3px_0_0_var(--blood)]">
      Throw it in →
    </div>
  </div>
);

const TableArt = (
  <div className="relative h-56 w-56">
    <div className="absolute inset-8 overflow-hidden rounded-full border-[3px] border-ink bg-teal-deep">
      <span aria-hidden className="tank-ripple absolute inset-[8%] rounded-full border-2 border-cream/40" />
    </div>
    {JUDGE_ORDER.map((id, i) => {
      const angle = (i / JUDGE_ORDER.length) * Math.PI * 2 - Math.PI / 2;
      return (
        <span
          key={id}
          className="absolute -translate-x-1/2 -translate-y-1/2"
          style={{ left: `${50 + Math.cos(angle) * 42}%`, top: `${50 + Math.sin(angle) * 42}%` }}
        >
          <JudgeAvatar id={id} className="w-12 border-[3px]" />
        </span>
      );
    })}
  </div>
);

const ScoreArt = (
  <div className="relative">
    <div className="border-[3px] border-ink bg-cream px-8 py-6 text-center shadow-brutal-sm">
      <p className="font-mono text-[10px] font-bold uppercase tracking-widest">Overall</p>
      <p className="font-display text-8xl font-black leading-none">74</p>
    </div>
    <span className="absolute -right-10 -top-6 rotate-12 border-[3px] border-coral-deep px-2 py-1 font-display text-2xl font-black uppercase text-coral-deep">
      Survivor
    </span>
  </div>
);

const LoopArt = (
  <div className="flex items-center gap-3 font-display text-5xl font-black">
    <span className="border-[3px] border-ink bg-cream px-3 py-1 shadow-brutal-sm">58</span>
    <span className="font-mono text-2xl">→</span>
    <span className="border-[3px] border-ink bg-mint px-3 py-1 shadow-brutal-sm">81</span>
  </div>
);

const STEPS: StackItem[] = [
  {
    kicker: "Step 01",
    title: "Throw it in",
    body: "Write the idea like you'd tell a teammate: what it does, who it's for, what the demo shows. Pick the kind of hackathon, or paste your event's real rules.",
    color: "var(--coral)",
    art: PitchArt,
  },
  {
    kicker: "Step 02",
    title: "Watch them circle",
    body: "Five sharks circle on one side, a school of 30 people from social media on the other. Gemma 4 writes the sharks' argument and runs the crowd. The first bite lands within seconds.",
    color: "var(--mustard)",
    art: TableArt,
  },
  {
    kicker: "Step 03",
    title: "Count the bites",
    body: "Which sharks it survived, eight criteria scored, the strength to lean on and the bite to fix first. Share the verdict with one link.",
    color: "var(--mint)",
    art: ScoreArt,
  },
  {
    kicker: "Step 04",
    title: "Sharpen & go again",
    body: "Fix the deepest bite, rewrite the pitch and throw it back in. Better to bleed here than on stage.",
    color: "var(--lilac)",
    art: LoopArt,
  },
];

export function HowItWorks() {
  return (
    <section id="how" className="relative scroll-mt-16 pt-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <p className="font-mono text-xs font-bold uppercase tracking-[0.3em]">How it works</p>
        <TextAnimation
          as="h2"
          text="From pitch to verdict in ninety seconds."
          className="mt-2 max-w-4xl font-display text-6xl font-black uppercase leading-[0.9] sm:text-8xl"
        />
      </div>
      <StackingCards items={STEPS} />
    </section>
  );
}
