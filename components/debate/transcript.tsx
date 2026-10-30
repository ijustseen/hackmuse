"use client";

// Styled after ui-layouts "terminal-ui" (https://www.ui-layouts.com/components/terminal-ui).
import { motion } from "motion/react";
import { useEffect, useRef } from "react";
import { JUDGES } from "@/lib/judges";
import type { DebateLine } from "@/lib/types";

export function Transcript({
  lines,
  index,
  complete,
  onJump,
}: {
  lines: DebateLine[];
  index: number;
  complete: boolean;
  onJump?: (i: number) => void;
}) {
  const scroller = useRef<HTMLDivElement>(null);
  const visible = lines.slice(0, Math.min(lines.length, index + 1));

  useEffect(() => {
    const el = scroller.current;
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
  }, [visible.length]);

  return (
    <div className="flex h-full min-h-[18rem] flex-col border-[3px] border-ink bg-ink text-cream shadow-brutal">
      <div className="flex items-center justify-between border-b-2 border-cream/20 px-3 py-2">
        <div className="flex gap-1.5">
          <span className="h-3 w-3 border border-ink bg-coral" />
          <span className="h-3 w-3 border border-ink bg-mustard" />
          <span className="h-3 w-3 border border-ink bg-mint" />
        </div>
        <span className="font-mono text-[10px] font-bold uppercase tracking-[0.25em] text-cream/60">court_record.log</span>
      </div>
      <div ref={scroller} data-lenis-prevent className="flex-1 space-y-3 overflow-y-auto p-3 font-mono text-[12.5px] leading-relaxed lg:max-h-[22rem]">
        <p className="text-cream/40">$ hackmuse --convene-panel</p>
        {visible.map((l, i) => (
          <motion.button
            key={i}
            type="button"
            data-cursor="replay"
            onClick={() => onJump?.(i)}
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            className={`block w-full text-left transition-colors hover:bg-cream/5 ${i === index ? "" : "opacity-70"}`}
          >
            <span className="text-cream/40">[{String(i + 1).padStart(2, "0")}]</span>{" "}
            <span className="font-bold" style={{ color: JUDGES[l.speaker].color }}>
              {JUDGES[l.speaker].name.replace("The ", "").toUpperCase()}
            </span>
            {l.replyTo && <span className="text-cream/40"> → {JUDGES[l.replyTo].name.replace("The ", "").toLowerCase()}</span>}
            <span className="text-cream/40"> ›</span> <span>{l.text}</span>
          </motion.button>
        ))}
        {lines.length > visible.length && (
          <p className="text-cream/40">… {lines.length - visible.length} more written, waiting to be heard</p>
        )}
        {!(complete && index >= lines.length) && <span className="inline-block h-4 w-2 animate-blink bg-cream align-middle" />}
      </div>
    </div>
  );
}
