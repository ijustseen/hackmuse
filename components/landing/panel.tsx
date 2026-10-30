"use client";

import { motion, useMotionValue, useSpring, useTransform } from "motion/react";
import { useRef, useState } from "react";
import { JudgeAvatar } from "@/components/judge-avatar";
import { SpotlightCard } from "@/components/ui/spotlight-card";
import { TextAnimation } from "@/components/ui/text-animation";
import { JUDGES, JUDGE_ORDER, type Judge } from "@/lib/judges";
import { RUBRIC } from "@/lib/rubric";

const NUMBER_WORDS: Record<number, string> = { 3: "Three", 4: "Four", 5: "Five", 6: "Six", 7: "Seven", 8: "Eight" };

function JudgeCard({ judge, index }: { judge: Judge; index: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const [hovered, setHovered] = useState(false);
  const px = useMotionValue(0.5);
  const py = useMotionValue(0.5);
  const rotateY = useSpring(useTransform(px, [0, 1], [-10, 10]), { stiffness: 200, damping: 18 });
  const rotateX = useSpring(useTransform(py, [0, 1], [8, -8]), { stiffness: 200, damping: 18 });
  const owns = judge.owns.map((id) => RUBRIC.find((c) => c.id === id)?.label).filter(Boolean);

  return (
    <motion.div
      initial={{ opacity: 0, y: 60, rotate: index % 2 ? 3 : -3 }}
      whileInView={{ opacity: 1, y: 0, rotate: 0 }}
      viewport={{ once: true, amount: 0.3 }}
      transition={{ delay: index * 0.1, type: "spring", stiffness: 120, damping: 16 }}
      style={{ perspective: 900 }}
    >
      <motion.div
        ref={ref}
        data-cursor={judge.role}
        style={{ rotateX, rotateY, transformStyle: "preserve-3d" }}
        onPointerMove={(e) => {
          const r = ref.current?.getBoundingClientRect();
          if (!r) return;
          px.set((e.clientX - r.left) / r.width);
          py.set((e.clientY - r.top) / r.height);
        }}
        onPointerEnter={() => setHovered(true)}
        onPointerLeave={() => {
          setHovered(false);
          px.set(0.5);
          py.set(0.5);
        }}
        className="group h-full"
      >
        <SpotlightCard
          glow={judge.color}
          className="flex h-full flex-col border-[3px] border-ink bg-paper shadow-brutal transition-shadow duration-300 group-hover:shadow-brutal-lg"
        >
          <div className="flex items-start justify-between border-b-[3px] border-ink p-5" style={{ backgroundColor: judge.color }}>
            <JudgeAvatar
              id={judge.id}
              talking={hovered}
              className="w-20 border-[3px] bg-paper! transition-transform duration-300 group-hover:-rotate-6"
            />
            <span className="border-2 border-ink bg-paper px-2 py-0.5 font-mono text-[10px] font-bold uppercase tracking-widest">
              Seat 0{index + 1}
            </span>
          </div>
          <div className="flex flex-1 flex-col p-5">
            <p className="font-mono text-[11px] font-bold uppercase tracking-[0.2em] text-ink/60">{judge.role}</p>
            <h3 className="font-display text-4xl font-black uppercase leading-none">{judge.name}</h3>
            <p className="mt-4 flex-1 text-lg font-medium leading-snug">&ldquo;{judge.catchphrase}&rdquo;</p>
            <div className="mt-5 flex flex-wrap gap-1.5">
              {(owns.length ? owns : [judge.focus]).map((o) => (
                <span key={o} className="border-2 border-ink bg-cream px-2 py-0.5 font-mono text-[10px] font-bold uppercase tracking-wider">
                  {o}
                </span>
              ))}
            </div>
            <p className="mt-4 border-t-2 border-dashed border-ink/30 pt-3 font-mono text-[10px] uppercase tracking-wider text-ink/60">
              Voice · {judge.voiceName} / ElevenLabs
            </p>
          </div>
        </SpotlightCard>
      </motion.div>
    </motion.div>
  );
}

export function Panel() {
  return (
    <section id="panel" className="scroll-mt-16 border-y-[3px] border-ink bg-sage/60 py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="flex flex-wrap items-end justify-between gap-6">
          <div>
            <p className="font-mono text-xs font-bold uppercase tracking-[0.3em]">The panel</p>
            <TextAnimation
              as="h2"
              text={`${NUMBER_WORDS[JUDGE_ORDER.length] ?? JUDGE_ORDER.length} seats. ${NUMBER_WORDS[JUDGE_ORDER.length] ?? JUDGE_ORDER.length} agendas.`}
              className="mt-2 font-display text-6xl font-black uppercase leading-[0.9] sm:text-8xl"
            />
          </div>
          <p className="max-w-sm text-base leading-relaxed text-ink/80">
            Each judge owns part of the rubric and has a voice of their own. They don&apos;t agree, and that&apos;s the point.
          </p>
        </div>
        <div className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {JUDGE_ORDER.map((id, i) => (
            <JudgeCard key={id} judge={JUDGES[id]} index={i} />
          ))}
        </div>
      </div>
    </section>
  );
}
