"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { Magnetic } from "@/components/effects/magnetic";
import { BrutalButton } from "@/components/ui/brutal-button";
import { SpotlightCard } from "@/components/ui/spotlight-card";
import { useTypewriter } from "@/components/ui/typewriter";
import { MAX_IDEA, MIN_IDEA, SAMPLE_IDEAS, saveIdea } from "@/lib/idea";
import { cn } from "@/lib/utils";

export function IdeaForm() {
  const router = useRouter();
  const [idea, setIdea] = useState("");
  const [focused, setFocused] = useState(false);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const phrases = useMemo(() => SAMPLE_IDEAS.slice(0, 5), []);
  const placeholder = useTypewriter(phrases);
  const chips = SAMPLE_IDEAS.slice(5);

  const length = idea.trim().length;
  const tooShort = length < MIN_IDEA;

  function submit() {
    if (tooShort) {
      setError(`Give the judges a bit more — at least ${MIN_IDEA} characters.`);
      return;
    }
    setSubmitting(true);
    saveIdea(idea.trim());
    router.push("/debate");
  }

  return (
    <SpotlightCard className="border-[3px] border-ink bg-paper shadow-brutal-lg">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
      >
        <div className="flex items-center justify-between border-b-[3px] border-ink bg-ink px-4 py-2 font-mono text-[11px] font-bold uppercase tracking-[0.2em] text-cream">
          <span>Case file № {String(length).padStart(4, "0")}</span>
          <span className="flex items-center gap-2">
            <span className="h-2 w-2 bg-coral" />
            <span className="h-2 w-2 bg-mustard" />
            <span className="h-2 w-2 bg-mint" />
          </span>
        </div>

        <div className="p-5 sm:p-6">
          <label htmlFor="idea" className="font-display text-3xl font-black uppercase leading-none">
            Your idea, in plain words
          </label>
          <p className="mt-2 text-sm text-ink/70">
            What it does, who it&apos;s for, what the demo looks like. The panel does the rest.
          </p>

          <div className="relative mt-4">
            <textarea
              id="idea"
              name="idea"
              value={idea}
              maxLength={MAX_IDEA}
              rows={6}
              onChange={(e) => {
                setIdea(e.target.value);
                if (error) setError("");
              }}
              onFocus={() => setFocused(true)}
              onBlur={() => setFocused(false)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) submit();
              }}
              data-lenis-prevent
              className="block w-full resize-none border-[3px] border-ink bg-cream p-4 text-lg leading-relaxed shadow-[inset_4px_4px_0_0_rgba(16,32,28,0.08)] outline-none transition-colors focus:bg-white"
            />
            {!idea && !focused && (
              <div
                aria-hidden
                className="pointer-events-none absolute inset-0 p-4 text-lg leading-relaxed text-ink/40 [border:3px_solid_transparent]"
              >
                {placeholder}
                <span className="ml-0.5 inline-block h-5 w-2 translate-y-0.5 animate-blink bg-ink/50" />
              </div>
            )}
          </div>

          <div className="mt-2 flex items-center justify-between font-mono text-[11px] uppercase tracking-wider text-ink/60">
            <span className={cn(error && "font-bold text-coral-deep")} role={error ? "alert" : undefined}>
              {error || "Ctrl + Enter to submit"}
            </span>
            <span className="tabular-nums">
              {idea.length}/{MAX_IDEA}
            </span>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            <span className="font-mono text-[11px] font-bold uppercase tracking-wider text-ink/60">Try:</span>
            {chips.map((c) => (
              <button
                key={c}
                type="button"
                data-cursor="use"
                onClick={() => {
                  setIdea(c);
                  setError("");
                }}
                className="max-w-full truncate border-2 border-ink bg-sage px-2 py-0.5 text-left text-xs transition-transform hover:-rotate-1 hover:bg-mustard"
              >
                {c}
              </button>
            ))}
          </div>

          <div className="mt-6 flex flex-wrap items-center justify-between gap-4">
            <p className="max-w-[16rem] font-mono text-[11px] uppercase leading-relaxed tracking-wider text-ink/60">
              Debated by Gemma&nbsp;4 · voiced by ElevenLabs · ~90&nbsp;seconds
            </p>
            <Magnetic>
              <BrutalButton type="submit" size="lg" cursor="summon" disabled={submitting}>
                {submitting ? "Summoning…" : "Summon the judges"}
                <span aria-hidden className="text-xl leading-none">→</span>
              </BrutalButton>
            </Magnetic>
          </div>
        </div>
      </form>
    </SpotlightCard>
  );
}
