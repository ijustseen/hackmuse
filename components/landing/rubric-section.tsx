"use client";

import { motion } from "motion/react";
import { TextAnimation } from "@/components/ui/text-animation";
import { JUDGES, JUDGE_ORDER } from "@/lib/judges";
import { RUBRIC } from "@/lib/rubric";

export function RubricSection() {
  return (
    <section id="rubric" className="scroll-mt-16 border-t-[3px] border-ink bg-ink py-24 text-cream">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="grid gap-10 lg:grid-cols-[1fr_1.4fr]">
          <div>
            <p className="font-mono text-xs font-bold uppercase tracking-[0.3em] text-mustard">The rubric</p>
            <TextAnimation
              as="h2"
              text="What the judges count."
              className="mt-2 font-display text-6xl font-black uppercase leading-[0.9] sm:text-7xl"
            />
            <p className="mt-6 max-w-sm text-cream/70">
              Every criterion is scored 0–10, weighted, and rolled into one number out of 100. Placeholder weights for now — the
              event&apos;s real criteria slot straight in.
            </p>
          </div>
          <ol className="space-y-4">
            {RUBRIC.map((c, i) => {
              const owner = JUDGE_ORDER.map((id) => JUDGES[id]).find((j) => j.owns.includes(c.id));
              return (
                <motion.li
                  key={c.id}
                  initial={{ opacity: 0, x: 40 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true, amount: 0.5 }}
                  transition={{ delay: i * 0.08 }}
                  className="group border-[3px] border-cream/80 bg-teal-deep p-4 transition-colors hover:bg-teal"
                >
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <span className="font-mono text-xs text-cream/50">0{i + 1}</span>
                      <h3 className="font-display text-3xl font-black uppercase leading-none">{c.label}</h3>
                    </div>
                    <div className="flex items-center gap-3">
                      {owner && (
                        <span
                          title={owner.name}
                          className="inline-flex h-8 w-8 items-center justify-center border-2 border-ink font-display text-lg font-black text-ink"
                          style={{ backgroundColor: owner.color }}
                        >
                          {owner.glyph}
                        </span>
                      )}
                      <span className="font-display text-4xl font-black tabular-nums text-mustard">
                        {Math.round(c.weight * 100)}%
                      </span>
                    </div>
                  </div>
                  <p className="mt-1 text-sm text-cream/70">{c.question}</p>
                  <div className="mt-3 h-4 border-2 border-cream/80 bg-ink">
                    <motion.div
                      initial={{ width: 0 }}
                      whileInView={{ width: `${c.weight * 400}%` }}
                      viewport={{ once: true }}
                      transition={{ delay: 0.2 + i * 0.08, duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
                      className="bg-hatch h-full text-coral"
                    />
                  </div>
                </motion.li>
              );
            })}
          </ol>
        </div>
      </div>
    </section>
  );
}
