"use client";

// Adapted from ui-layouts "randomized-text-effect" (https://www.ui-layouts.com/components/randomized-text-effect).
// Changes: cancellable on unmount/text change, preserves spaces, configurable speed.
import { useEffect, useState } from "react";

const GLYPHS = "abcdefghijklmnopqrstuvwxyz!@#$%^&*-_+=;:<>,";

export function RandomizedText({
  text,
  revealMs = 45,
  className,
}: {
  text: string;
  revealMs?: number;
  className?: string;
}) {
  const [shown, setShown] = useState(text);

  useEffect(() => {
    let cancelled = false;
    const scramble = (from: number) =>
      text.slice(0, from) +
      text
        .slice(from)
        .split("")
        .map((ch) => (ch === " " ? " " : GLYPHS[Math.floor(Math.random() * GLYPHS.length)]))
        .join("");
    const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

    (async () => {
      const end = Date.now() + 300;
      while (Date.now() < end && !cancelled) {
        setShown(scramble(0));
        await sleep(50);
      }
      for (let i = 0; i < text.length && !cancelled; i++) {
        setShown(scramble(i + 1));
        await sleep(revealMs);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [text, revealMs]);

  return (
    <span className={className} aria-label={text}>
      <span aria-hidden>{shown}</span>
    </span>
  );
}
