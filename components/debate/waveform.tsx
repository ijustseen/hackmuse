"use client";

import { useEffect, useRef } from "react";

/**
 * Bar waveform. Reads the live AnalyserNode when ElevenLabs audio is playing;
 * otherwise (captions-only mode) it fakes a talking rhythm so the seat still
 * looks alive. Bars are written straight to the DOM each frame.
 */
export function Waveform({
  active,
  analyser,
  bars = 12,
  className = "",
}: {
  active: boolean;
  analyser: AnalyserNode | null;
  bars?: number;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const nodes = Array.from(el.children) as HTMLElement[];
    if (!active) {
      nodes.forEach((n) => (n.style.transform = "scaleY(0.12)"));
      return;
    }
    const data = analyser ? new Uint8Array(analyser.frequencyBinCount) : null;
    let raf = 0;
    const draw = (t: number) => {
      if (analyser && data) analyser.getByteFrequencyData(data);
      nodes.forEach((n, i) => {
        let v: number;
        if (analyser && data) {
          const bin = Math.min(data.length - 1, 1 + Math.floor((i / nodes.length) * (data.length * 0.6)));
          v = data[bin] / 255;
        } else {
          v = 0.25 + 0.35 * Math.abs(Math.sin(t / 140 + i * 0.9)) * (0.6 + 0.4 * Math.sin(t / 470 + i));
        }
        n.style.transform = `scaleY(${Math.max(0.12, Math.min(1, v * 1.25))})`;
      });
      raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, [active, analyser]);

  return (
    <div ref={ref} aria-hidden className={`flex h-6 items-center gap-[3px] ${className}`}>
      {Array.from({ length: bars }, (_, i) => (
        <span key={i} className="h-full w-[4px] origin-center bg-ink transition-transform duration-75" style={{ transform: "scaleY(0.12)" }} />
      ))}
    </div>
  );
}
