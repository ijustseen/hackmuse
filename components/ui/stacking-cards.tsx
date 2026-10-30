"use client";

// Adapted from ui-layouts "stacking-card" (https://www.ui-layouts.com/components/stacking-card),
// itself after Olivier Larose. Changes: generic content slots instead of photo cards,
// brutalist frame, a big step numeral that scales with scroll, Lenis provided globally.
import { motion, useScroll, useTransform, type MotionValue } from "motion/react";
import { useRef, type ReactNode } from "react";

export interface StackItem {
  kicker: string;
  title: string;
  body: string;
  color: string;
  art: ReactNode;
}

export function StackingCards({ items }: { items: StackItem[] }) {
  const container = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: container, offset: ["start start", "end end"] });

  return (
    <div ref={container} className="relative">
      {items.map((item, i) => (
        <StackCard
          key={item.title}
          i={i}
          item={item}
          progress={scrollYProgress}
          range={[i / items.length, 1]}
          targetScale={1 - (items.length - i) * 0.045}
        />
      ))}
    </div>
  );
}

function StackCard({
  i,
  item,
  progress,
  range,
  targetScale,
}: {
  i: number;
  item: StackItem;
  progress: MotionValue<number>;
  range: [number, number];
  targetScale: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "start start"] });
  const numeralScale = useTransform(scrollYProgress, [0, 1], [1.8, 1]);
  const scale = useTransform(progress, range, [1, targetScale]);

  return (
    <div ref={ref} className="sticky top-0 flex h-screen items-center justify-center px-4">
      <motion.article
        style={{ scale, top: `calc(-6vh + ${i * 28}px)`, backgroundColor: item.color }}
        className="relative flex h-[min(480px,72vh)] w-full max-w-5xl origin-top flex-col overflow-hidden border-[3px] border-ink shadow-brutal-lg md:flex-row"
      >
        <div className="flex flex-1 flex-col justify-between gap-6 p-6 sm:p-10">
          <div>
            <p className="font-mono text-xs font-bold uppercase tracking-[0.3em]">{item.kicker}</p>
            <h3 className="mt-3 font-display text-5xl font-black uppercase leading-[0.9] sm:text-7xl">
              {item.title}
            </h3>
          </div>
          <p className="max-w-md text-base leading-relaxed sm:text-lg">{item.body}</p>
        </div>
        <div className="relative flex min-h-40 flex-1 items-center justify-center overflow-hidden border-t-[3px] border-ink bg-paper md:border-l-[3px] md:border-t-0">
          <div className="bg-grid absolute inset-0" />
          <motion.span
            aria-hidden
            style={{ scale: numeralScale }}
            className="text-outline pointer-events-none absolute -right-4 -top-10 font-display text-[11rem] font-black leading-none opacity-30"
          >
            0{i + 1}
          </motion.span>
          <div className="relative">{item.art}</div>
        </div>
      </motion.article>
    </div>
  );
}
