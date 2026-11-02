// The feed: 100 simulated people from social media who see the idea as a post, react, see each
// other's loudest posts and react again. Shared by the server (which runs it) and the browser
// (which draws it). The server runs it as 8 Gemma calls in two parallel phases of 4: each call
// casts 25 people and their first reaction, then each call lets the same 25 react a second time.

export const PLATFORMS = ["tiktok", "instagram", "x", "linkedin", "reddit"] as const;
export type Platform = (typeof PLATFORMS)[number];

export const PLATFORM_LABEL: Record<Platform, string> = {
  tiktok: "TikTok",
  instagram: "Instagram",
  x: "X",
  linkedin: "LinkedIn",
  reddit: "Reddit",
};

export const REACTIONS = ["share", "like", "scroll", "object"] as const;
export type Reaction = (typeof REACTIONS)[number];

export const REACTION_LABEL: Record<Reaction, string> = {
  share: "Would share",
  like: "Liked it",
  scroll: "Scrolled past",
  object: "Pushed back",
};

/** Short form for legends and counters. */
export const REACTION_SHORT: Record<Reaction, string> = {
  share: "Shared",
  like: "Liked",
  scroll: "Scrolled",
  object: "Pushed back",
};

/** One colour per reaction, shared by the arena, the scorecard and the share page. */
export const REACTION_COLOR: Record<Reaction | "pending", string> = {
  pending: "#c9d6cf",
  share: "#e9b949",
  like: "#7fb3a5",
  scroll: "#8a9a95",
  object: "#e8736a",
};

/** How much each reaction is worth to the feed score. A share is the only thing that spreads an idea. */
export const REACTION_WEIGHT: Record<Reaction, number> = { share: 1, like: 0.6, scroll: 0.15, object: 0 };

/** The grade: sharks 70%, feed 30% (decision F2). */
export const SHARK_WEIGHT = 0.7;
export const FEED_WEIGHT = 0.3;

export const FEED_SIZE = 100;
/** Per platform: this many people the idea is for, the rest are ordinary users of that platform. */
const TARGET_PER_PLATFORM = 12;

export interface FeedSlot {
  platform: Platform;
  /** True when this person is in the idea's audience. */
  target: boolean;
}

/** Fixed in code, not left to the model, so every run has the same spread of platforms and audiences. */
export const FEED_SLOTS: FeedSlot[] = PLATFORMS.flatMap((platform) =>
  Array.from({ length: FEED_SIZE / PLATFORMS.length }, (_, k) => ({ platform, target: k < TARGET_PER_PLATFORM })),
);

export interface FeedPerson extends FeedSlot {
  handle: string;
  /** "19, nursing student, posts meal-prep reels" */
  who: string;
}

export interface FeedReaction {
  reaction: Reaction;
  /** Their one-liner, at most ~90 characters. Empty when the model gave none. */
  line: string;
}

export interface FeedEntry extends FeedPerson {
  first: FeedReaction;
  final: FeedReaction;
}

export interface FeedQuote {
  handle: string;
  platform: Platform;
  reaction: Reaction;
  line: string;
}

export interface FeedResult {
  source: "gemma" | "demo";
  model: string;
  people: FeedEntry[];
  counts: Record<Reaction, number>;
  firstCounts: Record<Reaction, number>;
  /** People whose reaction changed after they saw the others' posts. */
  changed: number;
  /** 0-100. */
  score: number;
  topObjection: FeedQuote | null;
  /** Up to three one-liners worth quoting: the best share, the best objection, a changed mind. */
  best: FeedQuote[];
}

/** NDJSON events streamed by POST /api/feed, one per line. */
export type FeedEvent =
  | { type: "meta"; source: FeedResult["source"]; model: string }
  | { type: "people"; people: FeedPerson[] }
  | { type: "round"; round: 1 | 2; reactions: FeedReaction[] }
  | { type: "feed"; feed: FeedResult }
  | { type: "error"; message: string };

export function countReactions(reactions: FeedReaction[]): Record<Reaction, number> {
  const counts = { share: 0, like: 0, scroll: 0, object: 0 };
  for (const r of reactions) counts[r.reaction] += 1;
  return counts;
}

export function feedScore(counts: Record<Reaction, number>): number {
  const total = REACTIONS.reduce((n, r) => n + counts[r], 0);
  if (total === 0) return 0;
  const points = REACTIONS.reduce((n, r) => n + counts[r] * REACTION_WEIGHT[r], 0);
  return Math.round((points / total) * 100);
}

/** The headline number: sharks 70%, feed 30%; sharks alone when the feed is missing. */
export function headlineScore(sharks: number, feed: FeedResult | null): number {
  return feed ? Math.round(sharks * SHARK_WEIGHT + feed.score * FEED_WEIGHT) : sharks;
}

const quote = (p: FeedEntry): FeedQuote => ({
  handle: p.handle,
  platform: p.platform,
  reaction: p.final.reaction,
  line: p.final.line,
});

/** Builds the result from the people and both rounds. Pure, so the demo and the server share it. */
export function summarizeFeed(
  people: FeedPerson[],
  first: FeedReaction[],
  final: FeedReaction[],
  source: FeedResult["source"],
  model: string,
): FeedResult {
  const entries: FeedEntry[] = people.map((p, i) => ({ ...p, first: first[i], final: final[i] }));
  const counts = countReactions(final);
  const spoke = entries.filter((p) => p.final.line);
  // Longer lines carry a reason; prefer the people the idea is for.
  const rank = (a: FeedEntry, b: FeedEntry) => Number(b.target) - Number(a.target) || b.final.line.length - a.final.line.length;
  const pick = (r: Reaction) => spoke.filter((p) => p.final.reaction === r).sort(rank)[0];
  const objection = pick("object");
  const turned = spoke.filter((p) => p.first.reaction !== p.final.reaction).sort(rank)[0];
  const best = [pick("share") ?? pick("like"), objection, turned]
    .filter((p, i, all): p is FeedEntry => !!p && all.indexOf(p) === i)
    .map(quote);

  return {
    source,
    model,
    people: entries,
    counts,
    firstCounts: countReactions(first),
    changed: entries.filter((p) => p.first.reaction !== p.final.reaction).length,
    score: feedScore(counts),
    topObjection: objection ? quote(objection) : null,
    best,
  };
}

export function isReaction(v: unknown): v is Reaction {
  return typeof v === "string" && (REACTIONS as readonly string[]).includes(v);
}
