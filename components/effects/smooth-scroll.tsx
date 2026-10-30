"use client";

// Adapted from ui-layouts "smooth-scroll" (https://www.ui-layouts.com/components/smooth-scroll).
import { ReactLenis } from "lenis/react";
import { useReducedMotion } from "motion/react";
import type { ReactNode } from "react";

export function SmoothScroll({ children }: { children: ReactNode }) {
  const reduced = useReducedMotion();
  if (reduced) return <>{children}</>;
  return (
    <ReactLenis root options={{ lerp: 0.09, wheelMultiplier: 1.05 }}>
      {children}
    </ReactLenis>
  );
}
