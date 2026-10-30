import { sampleProject, type GemmaReview } from "@/server/gemma/prompt";
import type { Debate } from "./types";

export const MIN_IDEA = 12;
export const MAX_IDEA = 1200;

export const SAMPLE_IDEAS = [
  "A plant that texts you when it's thirsty, in the voice of a disappointed parent",
  "Turn any lecture recording into a 5-minute podcast with two AI hosts",
  "A Tinder-style swipe app for picking which open-source issue to fix next",
  "AR glasses that subtitle what your grandmother says in her dialect",
  "A browser extension that roasts your tabs until you close them",
  "Voice-first expense tracker you talk to while walking out of the shop",
  "A multiplayer whiteboard where an AI critic sketches counter-arguments",
  "Find a study buddy at your uni by matching your actual timetables",
];

// Per-session persistence: the idea and its verdict live in sessionStorage only.
const IDEA_KEY = "hackmuse:idea";
const DEBATE_KEY = "hackmuse:debate";
const HACKATHON_KEY = "hackmuse:hackathon";
const REVIEW_KEY = "hackmuse:review";

/** Where the idea is pitched. Defaults to today's event so the demo needs one field. */
export interface Hackathon {
  hackathonUrl: string;
  rules: string;
}

export const DEFAULT_HACKATHON: Hackathon = {
  hackathonUrl: sampleProject.hackathonUrl,
  rules: sampleProject.hackathonRules,
};

export const MAX_RULES = 20_000;

function storage() {
  try {
    return typeof window === "undefined" ? null : window.sessionStorage;
  } catch {
    return null;
  }
}

export function saveIdea(idea: string, hackathon: Hackathon) {
  storage()?.setItem(IDEA_KEY, idea);
  storage()?.setItem(HACKATHON_KEY, JSON.stringify(hackathon));
  storage()?.removeItem(DEBATE_KEY);
  storage()?.removeItem(REVIEW_KEY);
}

export function loadHackathon(): Hackathon {
  try {
    const raw = storage()?.getItem(HACKATHON_KEY);
    const value = raw ? (JSON.parse(raw) as Partial<Hackathon>) : null;
    if (value?.hackathonUrl && value?.rules) return { hackathonUrl: value.hackathonUrl, rules: value.rules };
  } catch {
    /* fall through to the default */
  }
  return DEFAULT_HACKATHON;
}

export function saveReview(idea: string, review: GemmaReview) {
  storage()?.setItem(REVIEW_KEY, JSON.stringify({ idea, review }));
}

export function loadReview(idea: string): GemmaReview | null {
  try {
    const raw = storage()?.getItem(REVIEW_KEY);
    if (!raw) return null;
    const value = JSON.parse(raw) as { idea: string; review: GemmaReview };
    return value.idea === idea ? value.review : null;
  } catch {
    return null;
  }
}

export function loadIdea() {
  return storage()?.getItem(IDEA_KEY) ?? null;
}

export function saveDebate(debate: Debate) {
  storage()?.setItem(DEBATE_KEY, JSON.stringify(debate));
}

export function loadDebate(idea: string): Debate | null {
  try {
    const raw = storage()?.getItem(DEBATE_KEY);
    if (!raw) return null;
    const debate = JSON.parse(raw) as Debate;
    return debate.idea === idea ? debate : null;
  } catch {
    return null;
  }
}
