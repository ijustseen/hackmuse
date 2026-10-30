"use client";

// In the spirit of ui-layouts "shimmer-loader" (https://www.ui-layouts.com/components/shimmer-loader):
// a cycling glyph, a shimmering status line and an ASCII progress bar that eases
// toward (but never reaches) 100% until the real result arrives.
import { motion } from "motion/react";
import { useEffect, useState } from "react";

const GLYPHS = ["§", "$", "#", "*", "✦", "◆"];

export function DeliberatingLoader({ messages }: { messages: string[] }) {
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 120);
    return () => clearInterval(id);
  }, []);

  const progress = 1 - Math.exp(-tick / 140);
  const cells = 28;
  const filled = Math.round(progress * cells);
  const message = messages[Math.floor(tick / 22) % messages.length];

  return (
    <div className="font-mono text-sm">
      <div className="flex items-center gap-3">
        <span className="inline-flex h-8 w-8 items-center justify-center border-2 border-ink bg-mustard text-lg font-bold">
          {GLYPHS[tick % GLYPHS.length]}
        </span>
        <motion.span
          key={message}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-[linear-gradient(110deg,var(--ink)_35%,var(--coral-deep)_50%,var(--ink)_65%)] bg-[length:250%_100%] bg-clip-text font-bold text-transparent [animation:shimmer_1.6s_linear_infinite]"
        >
          {message}
        </motion.span>
      </div>
      <div className="mt-4 flex items-center gap-3 text-xs">
        <span aria-hidden className="tracking-[-0.05em]">
          [{"█".repeat(filled)}
          <span className="opacity-25">{"░".repeat(cells - filled)}</span>]
        </span>
        <span className="tabular-nums">{Math.round(progress * 100)}%</span>
      </div>
      <style>{`@keyframes shimmer { from { background-position: 100% 0 } to { background-position: -150% 0 } }`}</style>
    </div>
  );
}
