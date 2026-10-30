"use client";

// In the spirit of ui-layouts "type-writter" (https://www.ui-layouts.com/components/type-writter):
// types each phrase, holds, deletes, moves on.
import { useEffect, useState } from "react";

export function useTypewriter(phrases: string[], { typeMs = 38, holdMs = 1800, deleteMs = 16 } = {}) {
  const [text, setText] = useState("");

  useEffect(() => {
    let cancelled = false;
    const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
    (async () => {
      for (let p = 0; !cancelled; p = (p + 1) % phrases.length) {
        const phrase = phrases[p];
        for (let i = 1; i <= phrase.length && !cancelled; i++) {
          setText(phrase.slice(0, i));
          await sleep(typeMs);
        }
        await sleep(holdMs);
        for (let i = phrase.length; i >= 0 && !cancelled; i--) {
          setText(phrase.slice(0, i));
          await sleep(deleteMs);
        }
        await sleep(300);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [phrases, typeMs, holdMs, deleteMs]);

  return text;
}
