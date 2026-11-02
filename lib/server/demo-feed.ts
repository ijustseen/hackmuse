import "server-only";
import { FEED_SIZE, FEED_SLOTS, summarizeFeed, type FeedEvent, type FeedPerson, type FeedReaction, type Reaction } from "../feed";

// Scripted feed for demo mode (no Gemma key, or the demo debate). Same shape and pacing as the
// real one, so the arena can be shown offline. The scorecard labels it DEMO. Thirty people are
// written by hand; the other seventy are built in code from small word lists and a fixed seed, so
// every demo run shows the same crowd.

const WHO: [string, string][] = [
  ["@mila.makes", "21, design student, posts study-with-me videos"],
  ["@jonnybuilds", "24, junior dev, shares side projects"],
  ["@sara_in_lab", "27, PhD student, short science explainers"],
  ["@kofi.codes", "19, CS freshman, hackathon regular"],
  ["@nightowl.nina", "33, nurse, watches cooking clips after shifts"],
  ["@dadjokes_dan", "45, plumber, reposts memes"],
  ["@lena.studies", "20, med student, flashcard tips"],
  ["@tomasz.ux", "29, UX designer, critiques app launches"],
  ["@priya.ships", "26, indie hacker, building in public"],
  ["@ana.travels", "31, travel nurse, posts city guides"],
  ["@gym_marco", "23, personal trainer, workout reels"],
  ["@hobby.halle", "38, teacher, crafts and DIY"],
  ["@devrel_rob", "34, developer advocate, tech hot takes"],
  ["@yusuf.ai", "28, ML engineer, paper threads"],
  ["@claire.pm", "31, product manager, startup commentary"],
  ["@hackathon_hq", "25, organizer, event recaps"],
  ["@finance.fred", "52, accountant, follows market news"],
  ["@memequeen.jo", "22, barista, shitposts"],
  ["@lisa.recruits", "36, tech recruiter, hiring posts"],
  ["@ben.founder", "30, seed-stage founder, growth tips"],
  ["@vc.watch", "41, angel investor, deal commentary"],
  ["@student.leader", "21, student union, campus events"],
  ["@hr.helga", "44, HR lead, workplace culture"],
  ["@sales.sam", "39, B2B sales, motivation quotes"],
  ["@r_skeptic", "35, sysadmin, debunks hype"],
  ["@build_or_bust", "27, full-stack dev, show-and-tell posts"],
  ["@lurker_lu", "24, data analyst, mostly reads"],
  ["@gamer.gil", "19, student, gaming clips"],
  ["@old.timer", "58, retired engineer, long comments"],
  ["@cat_person", "29, librarian, cat photos"],
];

const FIRST: [Reaction, string][] = [
  ["share", "sending this to my whole study group"],
  ["like", "neat, would try it at the next hackathon"],
  ["object", "cool demo but who keeps using it after week one?"],
  ["share", "this is exactly my problem every Sunday"],
  ["scroll", "not for me"],
  ["scroll", ""],
  ["like", "ok this is actually useful"],
  ["object", "the onboarding will make or break this"],
  ["like", "ship it and post the numbers"],
  ["scroll", "maybe later"],
  ["scroll", ""],
  ["like", "my students would like this"],
  ["object", "seen three of these this year, what's different?"],
  ["like", "the model choice makes sense"],
  ["share", "good wedge, clear user, tagging my team"],
  ["share", "putting this in the recap"],
  ["scroll", ""],
  ["scroll", "lol"],
  ["scroll", ""],
  ["object", "how does this make money?"],
  ["scroll", "pre-revenue, pass"],
  ["like", "could run this at our next campus event"],
  ["scroll", ""],
  ["scroll", ""],
  ["object", "another wrapper around an API"],
  ["like", "the demo part is clever"],
  ["scroll", ""],
  ["scroll", "no game mode?"],
  ["object", "privacy policy first, please"],
  ["scroll", ""],
];

// Round 2: a few people follow the shares, one is put off by the objections.
const TURNS: Record<number, [Reaction, string]> = {
  1: ["share", "ok my friend reposted it, sharing too"],
  9: ["like", "the replies sold me"],
  26: ["like", "everyone in my feed is talking about it"],
  11: ["share", "sharing with the other teachers"],
  13: ["object", "the privacy point is fair"],
};

// The hand-written people were written for 6 slots per platform (4 target, 2 ordinary); they keep
// their platform and audience and sit at the start of each platform's 20 slots.
const HAND_PER_PLATFORM = 6;
const HAND_TARGET = 4;
const PER_PLATFORM = FEED_SIZE / 5;
const TARGET = 12;
const handSlot = (h: number) => {
  const platform = Math.floor(h / HAND_PER_PLATFORM);
  const k = h % HAND_PER_PLATFORM;
  return platform * PER_PLATFORM + (k < HAND_TARGET ? k : TARGET + (k - HAND_TARGET));
};

const NAMES = ["ava", "noah", "ivy", "leo", "zoe", "max", "eli", "mia", "ravi", "tara", "omar", "nia", "finn", "jada", "hugo", "kira", "sven", "dara", "tobi", "lucia", "arlo", "mei", "diego", "elif", "kai", "rosa"];
const TAILS = ["", "_", ".dev", "99", "_irl", ".codes", "_hq", "42", ".lab", "_daily"];
const AGES = [18, 20, 22, 23, 25, 27, 28, 30, 32, 35, 38, 41, 46, 50, 55, 61];
const JOBS: [string, string][] = [
  ["bootcamp student", "posts coding progress"],
  ["bartender", "posts late-night clips"],
  ["data analyst", "reads industry threads"],
  ["high-school teacher", "shares classroom ideas"],
  ["freelance designer", "posts portfolio work"],
  ["nurse", "watches short recipes"],
  ["backend engineer", "comments on launches"],
  ["marketing manager", "posts growth takes"],
  ["delivery rider", "watches sports highlights"],
  ["PhD student", "shares paper summaries"],
  ["small-shop owner", "posts product photos"],
  ["game modder", "posts patch notes"],
  ["accountant", "follows finance news"],
  ["community manager", "posts event photos"],
  ["electrician", "reposts DIY videos"],
  ["journalist", "reads tech news"],
];

const POOL: Record<Reaction, string[]> = {
  share: ["sending this to my team right now", "my cousin needs this, tagging her", "okay this is genuinely good", "reposting, more people should see it", "finally someone built this"],
  like: ["solid idea, nicely scoped", "would try the demo", "this could work for us", "clean concept, good luck", "bookmarking this for later", "the problem is real"],
  object: ["who is this actually for?", "sounds like a feature, not a product", "what about data privacy?", "free tier will not pay for the model costs", "I tried something like this, people dropped off fast", "the hard part is the first week of use"],
  scroll: ["", "", "", "", "not for me", "maybe later", "huh", "scrolling on"],
};

// Seeded generator (mulberry32) so the same crowd comes out every time.
function seeded(seed: number) {
  let a = seed;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** The 100-person crowd: the hand-written 30 in place, the rest generated. */
function buildCrowd() {
  const rand = seeded(2026);
  const pick = <T,>(list: T[]) => list[Math.floor(rand() * list.length)];

  const people: (FeedPerson | undefined)[] = new Array(FEED_SIZE).fill(undefined);
  const first: (FeedReaction | undefined)[] = new Array(FEED_SIZE).fill(undefined);
  const turns = new Map<number, FeedReaction>();
  const used = new Set<string>();

  WHO.forEach(([handle, who], h) => {
    const g = handSlot(h);
    people[g] = { ...FEED_SLOTS[g], handle, who };
    first[g] = { reaction: FIRST[h][0], line: FIRST[h][1] };
    used.add(handle);
    if (TURNS[h]) turns.set(g, { reaction: TURNS[h][0], line: TURNS[h][1] });
  });

  // Reactions for the other 70, dealt from a shuffled deck so the totals are fixed:
  // with the hand-written 30 that gives 9 shares, 22 likes, 13 objections, 56 scrolls.
  const deck: Reaction[] = [
    ...Array<Reaction>(5).fill("share"),
    ...Array<Reaction>(15).fill("like"),
    ...Array<Reaction>(7).fill("object"),
    ...Array<Reaction>(43).fill("scroll"),
  ];
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }

  const generated: number[] = [];
  FEED_SLOTS.forEach((slot, g) => {
    if (people[g]) return;
    let handle = "";
    do handle = `@${pick(NAMES)}${pick(TAILS)}`;
    while (used.has(handle));
    used.add(handle);
    const [job, posts] = pick(JOBS);
    people[g] = { ...slot, handle, who: `${pick(AGES)}, ${job}, ${posts}` };
    const reaction = deck.pop() as Reaction;
    first[g] = { reaction, line: pick(POOL[reaction]) };
    generated.push(g);
  });

  // Round 2 for the generated people: a few scrollers follow the likes, one like turns into a share
  // and one into a doubt. Together with the hand-written turns that is 10 changes.
  const moves: [Reaction, Reaction, string][] = [
    ["scroll", "like", "so many people liked it, fine, I'll look"],
    ["scroll", "like", "ok the replies convinced me"],
    ["scroll", "like", "didn't get it first, now I do"],
    ["like", "share", "my friend shared it, so am I"],
    ["like", "object", "the privacy point is fair, now I doubt it"],
  ];
  for (const [from, to, line] of moves) {
    const g = generated.find((x) => first[x]?.reaction === from && !turns.has(x));
    if (g !== undefined) turns.set(g, { reaction: to, line });
  }

  return { people: people as FeedPerson[], first: first as FeedReaction[], turns };
}

const sleep = (ms: number, signal?: AbortSignal) =>
  new Promise<void>((resolve, reject) => {
    const t = setTimeout(resolve, ms);
    signal?.addEventListener("abort", () => {
      clearTimeout(t);
      reject(signal.reason);
    });
  });

export async function* streamDemoFeed(signal?: AbortSignal): AsyncGenerator<FeedEvent> {
  yield { type: "meta", source: "demo", model: "scripted" };
  await sleep(1400, signal);

  const { people, first, turns } = buildCrowd();
  yield { type: "people", people };
  await sleep(2600, signal);

  yield { type: "round", round: 1, reactions: first };
  await sleep(3200, signal);

  const final = first.map((r, i) => turns.get(i) ?? r);
  yield { type: "round", round: 2, reactions: final };

  yield { type: "feed", feed: summarizeFeed(people, first, final, "demo", "scripted") };
}
