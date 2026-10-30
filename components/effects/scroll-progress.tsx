"use client";

import { motion, useScroll, useSpring } from "motion/react";

export function ScrollProgress() {
  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, { stiffness: 120, damping: 24 });
  return (
    <motion.div
      aria-hidden
      className="fixed left-0 right-0 top-0 z-[80] h-1.5 origin-left bg-coral"
      style={{ scaleX }}
    />
  );
}
