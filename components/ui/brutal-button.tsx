// Adapted from ui-layouts "btn-click-down" (https://www.ui-layouts.com/components/buttons):
// hard offset shadow that collapses when pressed, restyled to the HACKMUSE palette.
import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";
import { cn } from "@/lib/utils";

type Tone = "coral" | "paper" | "ink" | "sage";
type Size = "sm" | "md" | "lg";

const TONES: Record<Tone, string> = {
  coral: "bg-coral text-ink hover:bg-[#ee8279]",
  paper: "bg-paper text-ink hover:bg-white",
  ink: "bg-ink text-cream hover:bg-teal-deep",
  sage: "bg-sage text-ink hover:bg-[#d6e1db]",
};

const SIZES: Record<Size, string> = {
  sm: "h-9 px-3 text-xs [--sh:3px]",
  md: "h-12 px-5 text-sm [--sh:5px]",
  lg: "h-16 px-8 text-base sm:text-lg [--sh:7px]",
};

export function brutalButtonClass(tone: Tone = "coral", size: Size = "md", className?: string) {
  return cn(
    "relative inline-flex select-none items-center justify-center gap-2 border-2 border-ink font-mono font-bold uppercase tracking-wider",
    "[box-shadow:var(--sh)_var(--sh)_0_0_var(--blood)] transition-[transform,box-shadow,background-color] duration-100",
    "hover:-translate-x-px hover:-translate-y-px",
    "active:translate-x-[var(--sh)] active:translate-y-[var(--sh)] active:[box-shadow:0_0_0_0_var(--blood)]",
    "disabled:pointer-events-none disabled:opacity-50",
    "focus-visible:outline-3 focus-visible:outline-offset-4 focus-visible:outline-ink",
    TONES[tone],
    SIZES[size],
    className,
  );
}

type BaseProps = { tone?: Tone; size?: Size; className?: string; children: ReactNode; cursor?: string };

export function BrutalButton({
  tone,
  size,
  className,
  cursor,
  ...props
}: BaseProps & Omit<ComponentProps<"button">, "className">) {
  return <button data-cursor={cursor} className={brutalButtonClass(tone, size, className)} {...props} />;
}

export function BrutalLink({
  tone,
  size,
  className,
  cursor,
  ...props
}: BaseProps & Omit<ComponentProps<typeof Link>, "className">) {
  return <Link data-cursor={cursor} className={brutalButtonClass(tone, size, className)} {...props} />;
}
