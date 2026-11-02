import type { GemmaReview } from "@/server/gemma/prompt";
import type { FeedResult } from "./feed";
import { CUSTOM_EVENT, PRESETS } from "./hackathons";
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

// Per-tab draft state. The saved copy of a verdict lives in the database (see lib/server/db.ts).
// v2: the eight-criterion rubric; verdicts cached under the old five-criterion shape are ignored.
const IDEA_KEY = "hackmuse:idea";
const DEBATE_KEY = "hackmuse:debate:v2";
const HACKATHON_KEY = "hackmuse:hackathon:v2";
const REVIEW_KEY = "hackmuse:review:v2";
const FEED_KEY = "hackmuse:feed:v1";
// The saved verdict this session's debate and review fill in; absent when the database is off.
const JUDGMENT_KEY = "hackmuse:judgment";
// Set while this tab is watching the demo, so it does not depend on ?demo=1 surviving navigation.
const DEMO_KEY = "hackmuse:demo";

/** Where the idea is pitched: a theme preset (no page) or the person's own event. */
export interface Hackathon {
  /** A preset id from lib/hackathons.ts, or "custom". */
  preset: string;
  hackathonUrl: string;
  rules: string;
}

export const DEFAULT_HACKATHON: Hackathon = { preset: PRESETS[0].id, hackathonUrl: "", rules: PRESETS[0].rules };

export { CUSTOM_EVENT };

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
  storage()?.removeItem(FEED_KEY);
  storage()?.removeItem(JUDGMENT_KEY);
  storage()?.removeItem(DEMO_KEY);
}

/** Start the scripted demo on a sample idea. Replaces whatever draft this tab had. */
export function startDemoSession(idea: string = SAMPLE_IDEAS[0]): string {
  saveIdea(idea, DEFAULT_HACKATHON);
  storage()?.setItem(DEMO_KEY, "1");
  return idea;
}

export function isDemoSession(): boolean {
  return storage()?.getItem(DEMO_KEY) === "1";
}

export function saveJudgmentId(id: string) {
  storage()?.setItem(JUDGMENT_KEY, id);
}

export function loadJudgmentId(): string | null {
  return storage()?.getItem(JUDGMENT_KEY) ?? null;
}

export function loadHackathon(): Hackathon {
  try {
    const raw = storage()?.getItem(HACKATHON_KEY);
    const value = raw ? (JSON.parse(raw) as Partial<Hackathon>) : null;
    if (value?.rules) {
      return { preset: value.preset ?? CUSTOM_EVENT, hackathonUrl: value.hackathonUrl ?? "", rules: value.rules };
    }
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

export function saveFeed(idea: string, feed: FeedResult) {
  storage()?.setItem(FEED_KEY, JSON.stringify({ idea, feed }));
}

export function loadFeed(idea: string): FeedResult | null {
  try {
    const raw = storage()?.getItem(FEED_KEY);
    if (!raw) return null;
    const value = JSON.parse(raw) as { idea: string; feed: FeedResult };
    return value.idea === idea ? value.feed : null;
  } catch {
    return null;
  }
}
