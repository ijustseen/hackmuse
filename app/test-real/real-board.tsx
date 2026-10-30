"use client";

import { useState, type FormEvent, type ReactNode } from "react";
import { sampleProject, type GemmaReview } from "@/server/gemma/prompt";

type Draft = {
  idea: string;
  hackathonUrl: string;
  rules: string;
};

const example: Draft = {
  idea: sampleProject.projectIdea,
  hackathonUrl: sampleProject.hackathonUrl,
  rules: sampleProject.hackathonRules,
};

export function RealBoard() {
  const [draft, setDraft] = useState<Draft>(example);
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<keyof Draft, string>>>({});
  const [phase, setPhase] = useState<"idle" | "running" | "done" | "error">("idle");
  const [error, setError] = useState<string | null>(null);
  const [review, setReview] = useState<GemmaReview | null>(null);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const errors = validate(draft);
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) return;

    setPhase("running");
    setError(null);
    setReview(null);

    try {
      const response = await fetch("/api/gemma-review", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(draft),
      });
      const payload: unknown = await response.json();
      if (!response.ok) {
        setPhase("error");
        setError(errorMessage(payload));
        return;
      }
      setReview(payload as GemmaReview);
      setPhase("done");
    } catch {
      setPhase("error");
      setError("The review request did not finish. Try again.");
    }
  }

  return (
    <div className="min-h-full bg-white text-[#1a1814]">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-8 px-4 py-8 sm:px-8 sm:py-12">
        <header className="flex flex-col gap-3">
          <p className="font-mono text-xs tracking-[0.18em] text-[#8a8175] uppercase">Hackmuse</p>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <h1 className="max-w-xl text-3xl font-semibold tracking-tight sm:text-4xl">Live idea review</h1>
            <p className="max-w-sm text-sm leading-6 text-[#6b645c]">
              Gemma scores the idea and searches for similar hackathon projects. There is no overall score.
            </p>
          </div>
        </header>

        <form onSubmit={onSubmit} className="grid gap-4 rounded-3xl bg-[#faf7f2] p-5 shadow-[0_1px_0_rgba(26,24,20,0.06)] sm:p-6">
          <Field label="Idea" error={fieldErrors.idea} hint="How you would explain it to a teammate.">
            <textarea
              name="idea"
              value={draft.idea}
              onChange={(event) => setDraft({ ...draft, idea: event.target.value })}
              rows={5}
              disabled={phase === "running"}
              className={inputClass(Boolean(fieldErrors.idea))}
            />
          </Field>
          <Field label="Hackathon page" error={fieldErrors.hackathonUrl}>
            <input
              name="hackathonUrl"
              value={draft.hackathonUrl}
              onChange={(event) => setDraft({ ...draft, hackathonUrl: event.target.value })}
              disabled={phase === "running"}
              inputMode="url"
              className={inputClass(Boolean(fieldErrors.hackathonUrl))}
            />
          </Field>
          <Field label="Rules and criteria" error={fieldErrors.rules} hint="Paste them from the event site.">
            <textarea
              name="rules"
              value={draft.rules}
              onChange={(event) => setDraft({ ...draft, rules: event.target.value })}
              rows={6}
              disabled={phase === "running"}
              className={inputClass(Boolean(fieldErrors.rules))}
            />
          </Field>
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="submit"
              disabled={phase === "running"}
              className="rounded-full bg-[#1a1814] px-5 py-2.5 text-sm font-medium text-[#faf7f2] disabled:cursor-wait disabled:opacity-60"
            >
              {phase === "running" ? "Reviewing…" : "Review with Gemma"}
            </button>
            {phase === "running" ? (
              <p className="text-sm text-[#6b645c]" role="status">
                Searching past hackathons and scoring eight criteria. This often takes a minute.
              </p>
            ) : null}
          </div>
          {error ? <p className="text-sm text-[#9a3412]">{error}</p> : null}
        </form>

        {review ? <ReviewResult review={review} /> : null}
      </div>
    </div>
  );
}

function ReviewResult({ review }: { review: GemmaReview }) {
  return (
    <section className="flex flex-col gap-6" aria-live="polite">
      <p className="text-sm text-[#6b645c]">Model {review.model}</p>
      {review.missing ? (
        <p className="rounded-2xl border border-[#ddd4c6] px-4 py-3 text-sm leading-6">{review.missing}</p>
      ) : null}
      <div className="grid gap-6 lg:grid-cols-2">
        <ProjectList projects={review.similarProjects} />
        <SourceList sources={review.sources} queries={review.queries} />
      </div>
      {review.parsed ? (
        <ul className="flex flex-col gap-4 rounded-3xl bg-[#1a1814] p-5 text-[#faf7f2] sm:p-6">
          {review.criteria.map((criterion) => (
            <li key={criterion.id}>
              <div className="flex items-baseline justify-between gap-3 text-sm">
                <span>{criterion.label}</span>
                <span className="shrink-0 font-mono whitespace-nowrap">
                  {criterion.score ?? "—"}
                  <span className="ml-1 text-xs text-[#d9d0c4]">/ 100</span>
                </span>
              </div>
              {criterion.score !== null ? (
                <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-[#3a342c]">
                  <div className="h-full rounded-full bg-[#e7d7c4]" style={{ width: `${criterion.score}%` }} />
                </div>
              ) : null}
              {criterion.explanation ? <p className="mt-2 text-sm leading-6 text-[#d9d0c4]">{criterion.explanation}</p> : null}
              <div className="mt-3 grid gap-3 sm:grid-cols-3">
                <PointList title="Strengths" points={criterion.strengths} />
                <PointList title="Weaknesses" points={criterion.weaknesses} />
                <PointList title="Next" points={criterion.recommendations} />
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <pre className="overflow-x-auto rounded-3xl bg-[#1a1814] p-5 text-sm leading-6 whitespace-pre-wrap text-[#faf7f2]">
          {review.rawText || "Gemma returned no text."}
        </pre>
      )}
    </section>
  );
}

function ProjectList({ projects }: { projects: GemmaReview["similarProjects"] }) {
  return (
    <section className="flex flex-col gap-3 rounded-3xl bg-[#faf7f2] p-5">
      <h2 className="text-lg font-semibold">Projects named in the review</h2>
      {projects.length === 0 ? (
        <p className="text-sm leading-6 text-[#6b645c]">The model did not name a project.</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {projects.map((project) => (
            <li key={`${project.name}-${project.url ?? ""}`} className="rounded-2xl border border-[#e7dfd4] px-4 py-3">
              <p className="font-medium">{project.name}</p>
              {project.note ? <p className="mt-1 text-sm leading-6 text-[#6b645c]">{project.note}</p> : null}
              {project.url ? (
                <a href={project.url} className="mt-2 block truncate text-sm text-[#9a3412] underline" target="_blank" rel="noreferrer">
                  {project.url}
                </a>
              ) : (
                <p className="mt-2 text-sm text-[#8a8175]">No URL was returned.</p>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function SourceList({ sources, queries }: { sources: GemmaReview["sources"]; queries: string[] }) {
  return (
    <section className="flex flex-col gap-3 rounded-3xl bg-[#faf7f2] p-5">
      <h2 className="text-lg font-semibold">Google Search sources</h2>
      <p className="text-sm leading-6 text-[#6b645c]">These are the pages the search tool returned. A citation is not the same as a verified win.</p>
      {sources.length === 0 ? (
        <p className="text-sm leading-6 text-[#6b645c]">No grounding sources were returned.</p>
      ) : (
        <ol className="flex flex-col gap-3">
          {sources.map((source, index) => (
            <li key={source.uri}>
              <a href={source.uri} className="text-sm font-medium underline" target="_blank" rel="noreferrer">
                {index + 1}. {source.title}
              </a>
            </li>
          ))}
        </ol>
      )}
      {queries.length > 0 ? <p className="text-xs leading-5 text-[#8a8175]">Queries: {queries.join(" · ")}</p> : null}
    </section>
  );
}

function PointList({ title, points }: { title: string; points: string[] }) {
  if (points.length === 0) return null;
  return (
    <div>
      <h3 className="text-xs font-medium tracking-wide text-[#d9d0c4] uppercase">{title}</h3>
      <ul className="mt-1 flex flex-col gap-1 text-sm leading-6 text-[#faf7f2]">
        {points.map((point) => (
          <li key={point}>{point}</li>
        ))}
      </ul>
    </div>
  );
}

function Field({
  label,
  hint,
  error,
  children,
}: {
  label: string;
  hint?: string;
  error?: string;
  children: ReactNode;
}) {
  return (
    <label className="flex flex-col gap-2 text-sm">
      <span className="font-medium">{label}</span>
      {children}
      {error ? <span className="text-[#9a3412]">{error}</span> : hint ? <span className="text-[#8a8175]">{hint}</span> : null}
    </label>
  );
}

function inputClass(invalid: boolean): string {
  return `w-full rounded-2xl border bg-white px-3 py-2 text-sm leading-6 outline-none focus:border-[#1a1814] disabled:opacity-70 ${invalid ? "border-[#9a3412]" : "border-[#e7dfd4]"}`;
}

function validate(draft: Draft): Partial<Record<keyof Draft, string>> {
  const errors: Partial<Record<keyof Draft, string>> = {};
  if (!draft.idea.trim()) errors.idea = "Write an idea.";
  if (!draft.rules.trim()) errors.rules = "Paste the rules.";
  if (!draft.hackathonUrl.trim()) {
    errors.hackathonUrl = "A link is required.";
  } else {
    try {
      const url = new URL(draft.hackathonUrl);
      if (url.protocol !== "http:" && url.protocol !== "https:") {
        errors.hackathonUrl = "Use an http or https link.";
      }
    } catch {
      errors.hackathonUrl = "Use an http or https link.";
    }
  }
  return errors;
}

function errorMessage(payload: unknown): string {
  if (payload && typeof payload === "object" && "error" in payload) {
    const error = (payload as { error?: { message?: unknown } }).error;
    if (typeof error?.message === "string" && error.message) return error.message;
  }
  return "Gemma did not return a review.";
}
