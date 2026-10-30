"use client";

// Adapted from ui-layouts "scroll-text-marquee" (https://www.ui-layouts.com/components/scroll-text-marquee).
// Changes: inline `wrap` instead of @motionone/utils, ReactNode children, typed props.
import {
  motion,
  useAnimationFrame,
  useMotionValue,
  useScroll,
  useSpring,
  useTransform,
  useVelocity,
} from "motion/react";
import { useRef, type ReactNode } from "react";
import { cn, wrap } from "@/lib/utils";

interface ScrollTextMarqueeProps {
  children: ReactNode;
  baseVelocity?: number;
  className?: string;
  /** Flip direction when the user scrolls the other way. */
  scrollDependent?: boolean;
}

export function ScrollTextMarquee({
  children,
  baseVelocity = -5,
  className,
  scrollDependent = true,
}: ScrollTextMarqueeProps) {
  const baseX = useMotionValue(0);
  const { scrollY } = useScroll();
  const scrollVelocity = useVelocity(scrollY);
  const smoothVelocity = useSpring(scrollVelocity, { damping: 50, stiffness: 400 });
  const velocityFactor = useTransform(smoothVelocity, [0, 1000], [0, 2], { clamp: false });
  const x = useTransform(baseX, (v) => `${wrap(-20, -45, v)}%`);
  const direction = useRef(1);

  useAnimationFrame((_, delta) => {
    let moveBy = direction.current * baseVelocity * (delta / 1000);
    if (scrollDependent) {
      if (velocityFactor.get() < 0) direction.current = -1;
      else if (velocityFactor.get() > 0) direction.current = 1;
    }
    moveBy += direction.current * moveBy * velocityFactor.get();
    baseX.set(baseX.get() + moveBy);
  });

  return (
    <div className="flex flex-nowrap overflow-hidden whitespace-nowrap">
      <motion.div className="flex flex-nowrap gap-10 whitespace-nowrap" style={{ x }}>
        {[0, 1, 2, 3].map((i) => (
          <span key={i} aria-hidden={i > 0} className={cn("block", className)}>
            {children}
          </span>
        ))}
      </motion.div>
    </div>
  );
}
