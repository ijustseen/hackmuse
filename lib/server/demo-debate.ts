import "server-only";
import { VOTING_JUDGES } from "../judges";
import { CRITERION_IDS } from "../rubric";
import type { DebateLine, StreamEvent } from "../types";
import { assembleDebate, normalizeLine } from "./gemma";

// Used only when no Gemma key is configured (or the user picks "Run demo
// debate" after an error), so the UI can be demoed offline. The page labels
// these results as DEMO MODE.

function hash(s: string) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function rng(seed: number) {
  let t = seed;
  return () => {
    t = (t + 0x6d2b79f5) | 0;
    let x = Math.imul(t ^ (t >>> 15), 1 | t);
    x = (x + Math.imul(x ^ (x >>> 7), 61 | x)) ^ x;
    return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
  };
}

function shortTitle(idea: string) {
  const words = idea
    .replace(/[^\p{L}\p{N}\s-]/gu, "")
    .split(/\s+/)
    .filter((w) => w.length > 3)
    .slice(0, 3);
  return words.length ? words.map((w) => w[0].toUpperCase() + w.slice(1)).join(" ") : "The Idea";
}

export async function* streamDemo(idea: string, signal?: AbortSignal): AsyncGenerator<StreamEvent> {
  const rand = rng(hash(idea));
  const pick = () => 3 + Math.floor(rand() * 7);
  const snippet = idea.length > 90 ? `${idea.slice(0, 87).trim()}…` : idea;
  const title = shortTitle(idea);
  const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

  const raw = [
    { speaker: "chair", replyTo: null, cue: "warm", text: `Order, everyone. On the table tonight: ${snippet} Shark, you look hungry.` },
    { speaker: "shark", replyTo: null, cue: "skeptical", text: `I'll be blunt. I don't see who pays for ${title}. Hackathon judges love a demo, but investors love a customer, and I can't name one yet.` },
    { speaker: "builder", replyTo: null, cue: "dry", text: "The happy path is a weekend of work. The hard part is the data: where it comes from, how fresh it is, and what happens when it's wrong." },
    { speaker: "angel", replyTo: null, cue: "warm", text: "Before the product, the people. Whoever pitches this needs a reason they, specifically, should build it. Give me that and I'm listening." },
    { speaker: "visionary", replyTo: null, cue: "excited", text: "You're all missing the moment. Picture the demo: one input, and the room watches it come alive. That's the thing people will talk about at dinner." },
    { speaker: "operator", replyTo: null, cue: "dry", text: "Nice moment. Now tell me how the first hundred users find it. A demo isn't a channel." },
    { speaker: "shark", replyTo: "visionary", cue: "dry", text: "Visionary, dinner conversation isn't a business. Give me one person who'd be angry if this disappeared tomorrow." },
    { speaker: "builder", replyTo: "shark", cue: "firm", text: "Shark, it's a hackathon, not a Series A. If they scope it to one sharp flow and fake nothing, it's buildable and honest." },
    { speaker: "operator", replyTo: "visionary", cue: "firm", text: "Visionary, polish without distribution is a beautiful empty room. Launch it where the users already are." },
    { speaker: "chair", replyTo: null, cue: "firm", text: "Verdict: a demo-friendly idea with a clear hook. Biggest strength, the moment it creates. Biggest risk, nobody yet owns the problem it solves." },
  ];

  yield { type: "meta", source: "demo", model: "demo" };
  await sleep(600);
  yield { type: "title", title };

  const lines: DebateLine[] = [];
  for (const r of raw) {
    if (signal?.aborted) return;
    await sleep(350);
    const line = normalizeLine(r)!;
    lines.push(line);
    yield { type: "line", line };
  }

  const scores = {
    scores: Object.fromEntries(
      CRITERION_IDS.map((id) => [id, { score: pick(), note: "Demo mode: placeholder note, connect Gemma for a real one." }]),
    ),
    votes: Object.fromEntries(VOTING_JUDGES.map((id) => [id, pick()])),
    verdict: "Demo-friendly with a clear hook; prove someone actually needs it.",
    strengths: ["A clear demo moment", "Scopable to a single flow"],
    risks: ["No obvious paying user yet", "Depends on data quality"],
  };
  yield { type: "debate", debate: assembleDebate(idea, title, lines, scores, "demo", "demo") };
}
