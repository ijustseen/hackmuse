"use client";

// Adapted from ui-layouts "scroll-text" (https://www.ui-layouts.com/components/scroll-text).
// Changes: typed, no @ts-nocheck, no forced uppercase/dark colours, stagger is configurable.
import { motion, type Variants } from "motion/react";
import { cn } from "@/lib/utils";

type Direction = "up" | "down" | "left" | "right";

const generateVariants = (direction: Direction): Variants => {
  const horizontal = direction === "left" || direction === "right";
  const value = direction === "right" || direction === "down" ? 80 : -80;
  return {
    hidden: { filter: "blur(10px)", opacity: 0, x: horizontal ? value : 0, y: horizontal ? 0 : value },
    visible: {
      filter: "blur(0px)",
      opacity: 1,
      x: 0,
      y: 0,
      transition: { duration: 0.55, ease: [0.22, 1, 0.36, 1] },
    },
  };
};

const TAGS = { h1: motion.h1, h2: motion.h2, h3: motion.h3, p: motion.p, span: motion.span, div: motion.div };

export function TextAnimation({
  as = "h2",
  text,
  className,
  direction = "down",
  letterAnime = false,
  stagger = 0.08,
  once = true,
  variants,
}: {
  as?: keyof typeof TAGS;
  text: string;
  className?: string;
  direction?: Direction;
  letterAnime?: boolean;
  stagger?: number;
  once?: boolean;
  variants?: Variants;
}) {
  const item = variants ?? generateVariants(direction);
  const Tag = TAGS[as];
  return (
    <Tag
      initial="hidden"
      whileInView="visible"
      viewport={{ amount: 0.3, once }}
      variants={{ hidden: {}, visible: { transition: { staggerChildren: stagger } } }}
      className={cn("inline-block", className)}
      aria-label={text}
    >
      {text.split(" ").map((word, i) => (
        <motion.span
          key={`${word}-${i}`}
          aria-hidden
          className="inline-block whitespace-pre"
          variants={letterAnime ? { hidden: {}, visible: { transition: { staggerChildren: stagger / 3 } } } : item}
        >
          {letterAnime
            ? word.split("").map((ch, j) => (
                <motion.span key={j} className="inline-block" variants={item}>
                  {ch}
                </motion.span>
              ))
            : word}
          {" "}
        </motion.span>
      ))}
    </Tag>
  );
}
