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

function storage() {
  try {
    return typeof window === "undefined" ? null : window.sessionStorage;
  } catch {
    return null;
  }
}

export function saveIdea(idea: string) {
  storage()?.setItem(IDEA_KEY, idea);
  storage()?.removeItem(DEBATE_KEY);
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
