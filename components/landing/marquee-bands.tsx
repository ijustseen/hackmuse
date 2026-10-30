"use client";

import { ScrollTextMarquee } from "@/components/ui/scroll-text-marquee";
import { SAMPLE_IDEAS } from "@/lib/idea";
import { RUBRIC } from "@/lib/rubric";

export function MarqueeBands() {
  return (
    <section aria-hidden className="relative overflow-hidden py-16">
      <div className="-mx-4 rotate-[-2.5deg] border-y-[3px] border-ink bg-teal py-3 text-cream shadow-brutal">
        <ScrollTextMarquee baseVelocity={-1.4} className="font-display text-4xl font-black uppercase sm:text-5xl">
          {SAMPLE_IDEAS.map((s) => (
            <span key={s} className="mr-8 inline-flex items-center gap-8">
              {s}
              <span className="text-mustard">✦</span>
            </span>
          ))}
        </ScrollTextMarquee>
      </div>
      <div className="-mx-4 mt-6 rotate-[1.5deg] border-y-[3px] border-ink bg-coral py-2">
        <ScrollTextMarquee baseVelocity={2.2} className="font-mono text-xl font-bold uppercase tracking-[0.2em] sm:text-2xl">
          {RUBRIC.map((c) => (
            <span key={c.id} className="mr-8 inline-flex items-center gap-8">
              {c.label} · {Math.round(c.weight * 100)}%
              <span>◆</span>
            </span>
          ))}
        </ScrollTextMarquee>
      </div>
    </section>
  );
}
