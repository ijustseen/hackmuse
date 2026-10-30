"use client";

// Adapted from ui-layouts "spotlight-cards" (https://www.ui-layouts.com/components/spotlight-cards).
// Changes: writes the pointer position to CSS variables instead of React state (no
// re-render per mousemove), and on cream paper the "light" is a halftone print
// revealed under the cursor plus a soft coral glow, instead of a white radial.
import { useRef, type CSSProperties, type ReactNode } from "react";
import { cn } from "@/lib/utils";

export function SpotlightCard({
  children,
  className,
  glow = "var(--coral)",
  style,
}: {
  children: ReactNode;
  className?: string;
  glow?: string;
  style?: CSSProperties;
}) {
  const ref = useRef<HTMLDivElement>(null);

  return (
    <div
      ref={ref}
      onPointerMove={(e) => {
        const el = ref.current;
        if (!el) return;
        const r = el.getBoundingClientRect();
        el.style.setProperty("--mx", `${e.clientX - r.left}px`);
        el.style.setProperty("--my", `${e.clientY - r.top}px`);
      }}
      className={cn("group/spot relative overflow-hidden", className)}
      style={style}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover/spot:opacity-100"
        style={{
          background: `radial-gradient(320px circle at var(--mx, 50%) var(--my, 50%), color-mix(in oklab, ${glow} 38%, transparent), transparent 70%)`,
        }}
      />
      <div
        aria-hidden
        className="bg-halftone pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover/spot:opacity-25"
        style={{
          maskImage: "radial-gradient(180px circle at var(--mx, 50%) var(--my, 50%), black, transparent 75%)",
          WebkitMaskImage:
            "radial-gradient(180px circle at var(--mx, 50%) var(--my, 50%), black, transparent 75%)",
        }}
      />
      <div className="relative">{children}</div>
    </div>
  );
}
