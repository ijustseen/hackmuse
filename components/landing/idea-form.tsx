"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { Magnetic } from "@/components/effects/magnetic";
import { SharkWater } from "@/components/effects/shark-water";
import { BrutalButton } from "@/components/ui/brutal-button";
import { SpotlightCard } from "@/components/ui/spotlight-card";
import { useTypewriter } from "@/components/ui/typewriter";
import { CUSTOM_EVENT, PRESETS, presetById } from "@/lib/hackathons";
import { DEFAULT_HACKATHON, MAX_IDEA, MAX_RULES, MIN_IDEA, SAMPLE_IDEAS, saveIdea } from "@/lib/idea";
import { cn } from "@/lib/utils";

const prefersReducedMotion = () =>
  typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

export function IdeaForm() {
  const router = useRouter();
  const [idea, setIdea] = useState("");
  const [focused, setFocused] = useState(false);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [preset, setPreset] = useState(DEFAULT_HACKATHON.preset);
  const [eventUrl, setEventUrl] = useState("");
  const [eventRules, setEventRules] = useState("");
  const phrases = useMemo(() => SAMPLE_IDEAS.slice(0, 5), []);
  const placeholder = useTypewriter(phrases);
  const chips = SAMPLE_IDEAS.slice(5);

  const custom = preset === CUSTOM_EVENT;
  const length = idea.trim().length;
  const tooShort = length < MIN_IDEA;

  function submit() {
    if (submitting) return;
    if (tooShort) {
      setError(`Give the sharks a bit more: at least ${MIN_IDEA} characters.`);
      return;
    }
    const url = eventUrl.trim();
    if (custom && !eventRules.trim()) {
      setError("Paste your event's rules, prizes or judging criteria (the page link is optional).");
      return;
    }
    if (custom && url && !/^https?:\/\/\S+$/i.test(url)) {
      setError("The event page needs to be an http or https link, or leave it empty.");
      return;
    }
    const hackathon = custom
      ? { preset: CUSTOM_EVENT, hackathonUrl: url, rules: eventRules.trim() }
      : { preset, hackathonUrl: "", rules: presetById(preset)?.rules ?? DEFAULT_HACKATHON.rules };
    saveIdea(idea.trim(), hackathon);
    setSubmitting(true);
    // Let the fins dive for a beat; the debate page was prefetched on focus, so this is the only wait.
    setTimeout(() => router.push("/debate"), prefersReducedMotion() ? 0 : 380);
  }

  return (
    <div>
      <SpotlightCard className="border-[3px] border-ink bg-paper shadow-brutal-lg">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            submit();
          }}
        >
          <div className="flex items-center justify-between border-b-[3px] border-ink bg-ink px-4 py-2 font-mono text-[11px] font-bold uppercase tracking-[0.2em] text-cream">
            <span className="flex items-center gap-2">
              <span className="h-2 w-2 animate-blink bg-coral" />
              The tank is open
            </span>
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
            <p className="mt-2 text-sm text-ink/70">What it does, who it&apos;s for, what the demo shows. The sharks do the rest.</p>

            <div className="relative mt-4">
              <textarea
                id="idea"
                name="idea"
                value={idea}
                maxLength={MAX_IDEA}
                rows={5}
                onChange={(e) => {
                  setIdea(e.target.value);
                  if (error) setError("");
                }}
                onFocus={() => {
                  setFocused(true);
                  router.prefetch("/debate");
                }}
                onBlur={() => setFocused(false)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) submit();
                }}
                aria-describedby="idea-help"
                data-lenis-prevent
                className="block w-full resize-none border-[3px] border-ink bg-cream p-4 text-lg leading-relaxed shadow-[inset_4px_4px_0_0_rgba(16,32,28,0.08)] outline-none transition-colors focus:bg-white"
              />
              {!idea && !focused && (
                <div
                  aria-hidden
                  className="pointer-events-none absolute inset-0 p-4 text-lg leading-relaxed text-ink/65 [border:3px_solid_transparent]"
                >
                  {placeholder}
                  <span className="ml-0.5 inline-block h-5 w-2 translate-y-0.5 animate-blink bg-ink/50" />
                </div>
              )}
            </div>

            <div
              id="idea-help"
              className="mt-2 flex items-center justify-between font-mono text-[11px] uppercase tracking-wider text-ink/70"
            >
              <span className={cn(error && "font-bold text-coral-deep")} role={error ? "alert" : undefined}>
                {error || "Ctrl + Enter to throw it in"}
              </span>
              <span className="tabular-nums">
                {idea.length}/{MAX_IDEA}
              </span>
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              <span className="font-mono text-[11px] font-bold uppercase tracking-wider text-ink/70">Try:</span>
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

            <fieldset className="mt-5 border-[3px] border-ink bg-cream p-3">
              <legend className="-ml-1 bg-cream px-1 font-mono text-[11px] font-bold uppercase tracking-wider">
                Pitching it at
              </legend>
              <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label="Kind of hackathon">
                {[...PRESETS.map((p) => ({ id: p.id, label: p.label })), { id: CUSTOM_EVENT, label: "My event →" }].map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    role="radio"
                    aria-checked={preset === p.id}
                    data-cursor="pick"
                    onClick={() => {
                      setPreset(p.id);
                      if (error) setError("");
                    }}
                    className={cn(
                      "border-2 border-ink px-2 py-1 font-mono text-[11px] font-bold uppercase tracking-wider transition-[transform,background-color] duration-150",
                      preset === p.id ? "bg-coral shadow-[2px_2px_0_0_var(--ink)]" : "bg-paper hover:-translate-y-px hover:bg-white",
                    )}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
              {custom ? (
                <div className="mt-3 space-y-3">
                  <label className="block">
                    <span className="font-mono text-[11px] font-bold uppercase tracking-wider">
                      Event page <span className="text-ink/65">(optional)</span>
                    </span>
                    <input
                      type="url"
                      value={eventUrl}
                      maxLength={2000}
                      placeholder="https://"
                      onChange={(e) => {
                        setEventUrl(e.target.value);
                        if (error) setError("");
                      }}
                      className="mt-1 block w-full border-[3px] border-ink bg-paper px-3 py-2 text-sm outline-none focus:bg-white"
                    />
                  </label>
                  <label className="block">
                    <span className="font-mono text-[11px] font-bold uppercase tracking-wider">Rules, prizes, judging criteria</span>
                    <textarea
                      value={eventRules}
                      maxLength={MAX_RULES}
                      rows={4}
                      placeholder="Paste them from the event page. The sharks judge fit against these."
                      onChange={(e) => {
                        setEventRules(e.target.value);
                        if (error) setError("");
                      }}
                      data-lenis-prevent
                      className="mt-1 block w-full resize-y border-[3px] border-ink bg-paper p-3 text-sm leading-relaxed outline-none focus:bg-white"
                    />
                  </label>
                </div>
              ) : (
                <p className="mt-2 text-xs leading-snug text-ink/70">
                  Judged against what {preset === "general" ? "most hackathons" : `${presetById(preset)?.label} hackathons`} usually
                  look for. Pick <span className="font-bold">My event</span> to use your real rules.
                </p>
              )}
            </fieldset>

            <div className="mt-6 flex flex-wrap items-center justify-between gap-4">
              <p className="max-w-[16rem] font-mono text-[11px] uppercase leading-relaxed tracking-wider text-ink/70">
                Gemma&nbsp;4 · 5 sharks + 30 people · free
              </p>
              <Magnetic>
                <BrutalButton type="submit" size="lg" cursor="throw" disabled={submitting}>
                  {submitting ? "Into the tank…" : "Throw it in"}
                  <span aria-hidden className="text-xl leading-none">
                    →
                  </span>
                </BrutalButton>
              </Magnetic>
            </div>
          </div>
        </form>
      </SpotlightCard>
      <SharkWater
        agitated={focused || idea.length > 0}
        diving={submitting}
        label={submitting ? "Feeding time" : "5 sharks circling"}
        className="mt-5 shadow-brutal-sm"
      />
    </div>
  );
}
