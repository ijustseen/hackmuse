"use client";

import { useEffect, useRef, useState, type FormEvent, type ReactNode } from "react";

type SpeakerId = "host" | "critic";

type Draft = {
  idea: string;
  hackathonUrl: string;
  rules: string;
};

type Turn = {
  speaker: SpeakerId;
  text: string;
};

type Criterion = {
  id: string;
  label: string;
  score: number;
  rationale: string;
};

type Board = {
  stage: "research_and_podcast" | "analysis" | "completed";
  message: string;
  title: string | null;
  turns: Turn[];
  showResearch: boolean;
  showAnalysis: boolean;
};

type Step =
  | { at: number; kind: "stage"; stage: Board["stage"]; message: string }
  | { at: number; kind: "title"; title: string }
  | { at: number; kind: "turn"; turn: Turn }
  | { at: number; kind: "research" }
  | { at: number; kind: "analysis" };

const example: Draft = {
  idea: "A tool that takes an idea, a hackathon link, and the rules you paste, then says whether it is worth building: what usually wins at similar events, a short conversation between two hosts, and a score by criterion.",
  hackathonUrl: "https://hacktoberfest.com",
  rules:
    "A working prototype is due by the end of the day. Judges look at usefulness for the participant, technical execution, and how well the project fits the event theme.",
};

const speakers: Record<SpeakerId, { name: string; role: string }> = {
  host: { name: "Muse", role: "host" },
  critic: { name: "Skeptic", role: "critic" },
};

const criteria: Criterion[] = [
  {
    id: "rule-fit",
    label: "Fit to the rules",
    score: 81,
    rationale: "The prototype can be shown against rules the participant pasted: theme, usefulness, and a working piece.",
  },
  {
    id: "demo-path",
    label: "Shippable in a day",
    score: 76,
    rationale: "The core is one form and one review screen. Voice and search can be switched on later without breaking the demo.",
  },
  {
    id: "winner-pattern",
    label: "Close to what usually wins",
    score: 64,
    rationale: "A narrow flow for a hackathon participant, rather than a platform for everyone. It still needs one specific person this saves.",
  },
  {
    id: "clarity",
    label: "Clear what to do with the score",
    score: 72,
    rationale: "Pros, cons, and per-criterion scores answer whether to build or narrow the idea, rather than only posting a number.",
  },
];

const overallScore = 74;

export function PreviewBoard() {
  const [draft, setDraft] = useState<Draft>(example);
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<keyof Draft, string>>>({});
  const [phase, setPhase] = useState<"idle" | "running" | "done">("idle");
  const [submitted, setSubmitted] = useState<Draft | null>(null);
  const [board, setBoard] = useState<Board | null>(null);
  const generation = useRef(0);
  const timers = useRef<number[]>([]);

  useEffect(() => {
    return () => {
      for (const timer of timers.current) window.clearTimeout(timer);
    };
  }, []);

  function stop() {
    generation.current += 1;
    for (const timer of timers.current) window.clearTimeout(timer);
    timers.current = [];
  }

  function reset() {
    stop();
    setPhase("idle");
    setBoard(null);
    setSubmitted(null);
  }

  function start(submission: Draft) {
    stop();
    const token = generation.current;
    setPhase("running");
    setSubmitted(submission);
    setBoard({
      stage: "research_and_podcast",
      message: "Looking for similar hackathons and recording the podcast.",
      title: null,
      turns: [],
      showResearch: false,
      showAnalysis: false,
    });

    for (const step of scriptFor(submission)) {
      const timer = window.setTimeout(() => {
        if (generation.current !== token) return;
        setBoard((current) => (current ? applyStep(current, step) : current));
        if (step.kind === "analysis") setPhase("done");
      }, step.at);
      timers.current.push(timer);
    }
  }

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const next = {
      idea: draft.idea.trim(),
      hackathonUrl: draft.hackathonUrl.trim(),
      rules: draft.rules.trim(),
    };
    const errors = validate(next);
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) return;
    setDraft(next);
    start(next);
  }

  return (
    <div className="min-h-full bg-[#efeae1] text-[#1a1814]">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-8 px-4 py-8 sm:px-8 sm:py-12">
        <header className="flex flex-col gap-3">
          <p className="font-mono text-xs tracking-[0.18em] text-[#8a8175] uppercase">Hackmuse</p>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <h1 className="max-w-xl text-3xl font-semibold tracking-tight sm:text-4xl">
              Hackathon idea review
            </h1>
            <p className="max-w-sm text-sm leading-6 text-[#6b645c]">
              Preview with no requests. The copy below is a scripted walkthrough, so you can see the screen order
              before models are connected.
            </p>
          </div>
        </header>

        <form onSubmit={onSubmit} className="grid gap-4 rounded-3xl bg-[#faf7f2] p-5 shadow-[0_1px_0_rgba(26,24,20,0.06)] sm:p-6">
          <Field label="Idea" error={fieldErrors.idea} hint="How you would explain it to a teammate.">
            <textarea
              name="idea"
              value={draft.idea}
              onChange={(event) => setDraft({ ...draft, idea: event.target.value })}
              rows={4}
              disabled={phase === "running"}
              className={inputClass(Boolean(fieldErrors.idea))}
            />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
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
                rows={4}
                disabled={phase === "running"}
                className={inputClass(Boolean(fieldErrors.rules))}
              />
            </Field>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="submit"
              disabled={phase === "running"}
              className="rounded-full bg-[#1a1814] px-5 py-2.5 text-sm font-medium text-[#faf7f2] disabled:cursor-wait disabled:opacity-60"
            >
              {phase === "running" ? "Listening…" : "Review the idea"}
            </button>
            {phase !== "idle" ? (
              <button type="button" onClick={reset} className="rounded-full px-4 py-2.5 text-sm text-[#6b645c]">
                Reset
              </button>
            ) : null}
          </div>
        </form>

        {board && submitted ? (
          <section className="flex flex-col gap-6" aria-live="polite">
            <StageRail stage={board.stage} message={board.message} />
            <div className="grid gap-6 lg:grid-cols-2">
              <PodcastPanel title={board.title} turns={board.turns} />
              <ResearchPanel url={submitted.hackathonUrl} visible={board.showResearch} />
            </div>
            <AnalysisPanel idea={submitted.idea} visible={board.showAnalysis} />
          </section>
        ) : (
          <ol className="grid gap-3 sm:grid-cols-3">
            {[
              ["01", "Two voices", "Muse and Skeptic take the idea apart, line by line, while the search is running."],
              ["02", "Similar wins", "Cards for hackathons and what usually places there."],
              ["03", "Score", "An overall mark, pros, cons, and the criteria the model chooses."],
            ].map(([index, title, text]) => (
              <li key={index} className="rounded-2xl border border-[#ddd4c6] px-4 py-4">
                <p className="font-mono text-xs text-[#8a8175]">{index}</p>
                <p className="mt-2 font-medium">{title}</p>
                <p className="mt-1 text-sm leading-6 text-[#6b645c]">{text}</p>
              </li>
            ))}
          </ol>
        )}
      </div>
    </div>
  );
}

function StageRail({ stage, message }: { stage: Board["stage"]; message: string }) {
  const steps = [
    ["research_and_podcast", "Podcast and search"],
    ["analysis", "Review"],
    ["completed", "Done"],
  ] as const;
  const active = steps.findIndex(([id]) => id === stage);

  return (
    <div className="flex flex-col gap-3">
      <ol className="flex flex-wrap gap-2">
        {steps.map(([id, label], index) => {
          const reached = index <= active;
          return (
            <li
              key={id}
              className={`rounded-full px-3 py-1 text-xs ${reached ? "bg-[#1a1814] text-[#faf7f2]" : "bg-[#e4ddd2] text-[#6b645c]"}`}
            >
              {label}
            </li>
          );
        })}
      </ol>
      <p className="text-sm text-[#6b645c]">{message}</p>
    </div>
  );
}

function PodcastPanel({ title, turns }: { title: string | null; turns: Turn[] }) {
  return (
    <section className="flex flex-col gap-4 rounded-3xl bg-[#faf7f2] p-5">
      <div>
        <h2 className="text-lg font-semibold">Podcast</h2>
        <p className="mt-1 text-sm text-[#6b645c]">{title ?? "The episode is starting…"}</p>
      </div>
      {turns.length === 0 ? (
        <div className="h-24 animate-pulse rounded-2xl bg-[#efeae1]" />
      ) : (
        <ol className="flex flex-col gap-4">
          {turns.map((turn, index) => {
            const speaker = speakers[turn.speaker];
            const tone = turn.speaker === "host" ? "text-[#9a3412]" : "text-[#1f4d3a]";
            return (
              <li key={`${turn.speaker}-${index}`} className="flex flex-col gap-2">
                <p className={`text-xs font-medium tracking-wide uppercase ${tone}`}>
                  {speaker.name}
                  <span className="ml-2 font-normal tracking-normal text-[#8a8175] normal-case">{speaker.role}</span>
                </p>
                <p className="text-sm leading-6">{turn.text}</p>
                <p className="flex items-center gap-2 text-xs text-[#8a8175]">
                  <span className="inline-block h-2 w-2 rounded-full bg-[#ddd4c6]" aria-hidden />
                  A voice track will show up here once ElevenLabs is connected
                </p>
              </li>
            );
          })}
        </ol>
      )}
    </section>
  );
}

function ResearchPanel({ url, visible }: { url: string; visible: boolean }) {
  return (
    <section className="flex flex-col gap-4 rounded-3xl bg-[#faf7f2] p-5">
      <div>
        <h2 className="text-lg font-semibold">Similar hackathons</h2>
        <p className="mt-1 truncate text-sm text-[#6b645c]">{url}</p>
      </div>
      {visible ? (
        <ul className="flex flex-col gap-3">
          {sampleHackathons.map((hackathon) => (
            <li key={hackathon.name} className="rounded-2xl border border-[#e7dfd4] px-4 py-3">
              <p className="font-medium">{hackathon.name}</p>
              <p className="mt-1 text-sm leading-6 text-[#6b645c]">{hackathon.why}</p>
              <p className="mt-2 text-sm leading-6">
                <span className="text-[#8a8175]">Winner. </span>
                {hackathon.winner}
              </p>
            </li>
          ))}
          <li className="text-sm leading-6 text-[#6b645c]">
            A narrow flow and a prototype that answers the written rules usually place higher.
          </li>
        </ul>
      ) : (
        <div className="flex flex-col gap-3">
          <div className="h-20 animate-pulse rounded-2xl bg-[#efeae1]" />
          <div className="h-20 animate-pulse rounded-2xl bg-[#efeae1]" />
        </div>
      )}
    </section>
  );
}

function AnalysisPanel({ idea, visible }: { idea: string; visible: boolean }) {
  if (!visible) {
    return (
      <section className="rounded-3xl border border-dashed border-[#ddd4c6] px-5 py-6 text-sm text-[#6b645c]">
        The overall score, pros, cons, and per-criterion marks appear after the podcast and the search finish.
      </section>
    );
  }

  return (
    <section className="flex flex-col gap-6 rounded-3xl bg-[#1a1814] p-5 text-[#faf7f2] sm:p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h2 className="text-lg font-semibold">Review</h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-[#d9d0c4]">
            “{clip(idea, 140)}” is worth taking to a hackathon if you can show one full pass in a day: idea in,
            review out. It is still broad. It is not clear which participant this is indispensable for.
          </p>
        </div>
        <p className="shrink-0 font-mono text-5xl tracking-tight whitespace-nowrap">
          {overallScore}
          <span className="ml-1 text-base text-[#d9d0c4]">/ 100</span>
        </p>
      </div>
      <div className="grid gap-6 sm:grid-cols-2">
        <PointList title="Pros" points={pros} />
        <PointList title="Cons" points={cons} />
      </div>
      <ul className="flex flex-col gap-4">
        {criteria.map((criterion) => (
          <li key={criterion.id}>
            <div className="flex items-baseline justify-between gap-3 text-sm">
              <span>{criterion.label}</span>
              <span className="font-mono">{criterion.score}</span>
            </div>
            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-[#3a342c]">
              <div className="h-full rounded-full bg-[#e7d7c4]" style={{ width: `${criterion.score}%` }} />
            </div>
            <p className="mt-2 text-sm leading-6 text-[#d9d0c4]">{criterion.rationale}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}

function PointList({ title, points }: { title: string; points: string[] }) {
  return (
    <div>
      <h3 className="text-sm font-medium text-[#d9d0c4]">{title}</h3>
      <ul className="mt-2 flex flex-col gap-2 text-sm leading-6">
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
  if (!draft.idea) errors.idea = "Write an idea.";
  if (!draft.rules) errors.rules = "Paste the rules.";
  if (!draft.hackathonUrl) {
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

function scriptFor(submission: Draft): Step[] {
  const idea = clip(submission.idea, 180);
  const rules = clip(submission.rules, 120);
  const quotedIdea = idea.replace(/[.!?…]+$/u, "");
  return [
    {
      at: 300,
      kind: "stage",
      stage: "research_and_podcast",
      message: "Looking for similar hackathons and recording the podcast.",
    },
    { at: 700, kind: "title", title: idea },
    {
      at: 1100,
      kind: "turn",
      turn: {
        speaker: "host",
        text: `The idea on the table: “${quotedIdea}.” The search for similar events is still running, so we stay with the pitch and the rules you pasted.`,
      },
    },
    {
      at: 1800,
      kind: "turn",
      turn: {
        speaker: "critic",
        text: `The rules say: ${quoted(rules)} If the judges want a working piece, a slide story loses even when the wording is sharp.`,
      },
    },
    { at: 2400, kind: "research" },
    {
      at: 3000,
      kind: "turn",
      turn: {
        speaker: "host",
        text: "The first cut is whether the team can show the core pass before the deadline. One review screen matters more than three extra features.",
      },
    },
    {
      at: 3700,
      kind: "turn",
      turn: {
        speaker: "critic",
        text: "The second cut is who this is for. “Hackathon participants” is still broad. What usually wins is a narrower person and one clear moment of pain.",
      },
    },
    {
      at: 4400,
      kind: "turn",
      turn: {
        speaker: "host",
        text: "The similar events are on screen now. The score should lean on those and on the rules, not on this conversation.",
      },
    },
    {
      at: 5100,
      kind: "turn",
      turn: {
        speaker: "critic",
        text: "Agreed. We score after the episode, not inside it. The open risks are a wide audience and a scope that will not fit in the demo.",
      },
    },
    { at: 5600, kind: "stage", stage: "analysis", message: "Scoring the idea." },
    { at: 6300, kind: "analysis" },
  ];
}

function applyStep(board: Board, step: Step): Board {
  if (step.kind === "stage") return { ...board, stage: step.stage, message: step.message };
  if (step.kind === "title") return { ...board, title: step.title };
  if (step.kind === "turn") return { ...board, turns: [...board.turns, step.turn] };
  if (step.kind === "research") return { ...board, showResearch: true };
  return {
    ...board,
    stage: "completed",
    message: "Review ready.",
    showAnalysis: true,
  };
}

function quoted(text: string): string {
  const body = text.replace(/\.+$/u, "");
  return body.endsWith("…") ? `“${body}”` : `“${body}.”`;
}

function clip(text: string, max: number): string {
  const trimmed = text.trim();
  if (trimmed.length <= max) return trimmed;
  const cut = trimmed.slice(0, max);
  const space = cut.lastIndexOf(" ");
  const base = space > max * 0.6 ? cut.slice(0, space) : cut;
  return `${base}…`;
}

const pros = [
  "The participant brings their own rules, rather than a generic startup score.",
  "While the search runs, there is already something to read and hear. The wait is not empty.",
];

const cons = [
  "Without a live search, the winner cards do not prove anything.",
  "No single participant is named who needs this tonight.",
];

const sampleHackathons = [
  {
    name: "Weekend Build",
    why: "A short hackathon with published criteria and a working demo as the point.",
    winner: "A narrow helper for one role. The write-up quotes the judging criteria directly.",
  },
  {
    name: "Night Line",
    why: "The same mix: an event theme plus a prototype you can click during the demo.",
    winner: "One path from input to result, with no promise of a platform.",
  },
];
