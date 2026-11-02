import "server-only";
import { FEED_SLOTS, summarizeFeed, type FeedEvent, type FeedPerson, type FeedReaction, type Reaction } from "../feed";

// Scripted feed for demo mode (no Gemma key, or the demo debate). Same shape and pacing as the
// real one, so the arena can be shown offline. The scorecard labels it DEMO.

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

  const people: FeedPerson[] = FEED_SLOTS.map((slot, i) => ({ ...slot, handle: WHO[i][0], who: WHO[i][1] }));
  yield { type: "people", people };
  await sleep(2600, signal);

  const first: FeedReaction[] = FIRST.map(([reaction, line]) => ({ reaction, line }));
  yield { type: "round", round: 1, reactions: first };
  await sleep(3200, signal);

  const final = first.map((r, i) => (TURNS[i] ? { reaction: TURNS[i][0], line: TURNS[i][1] } : r));
  yield { type: "round", round: 2, reactions: final };

  yield { type: "feed", feed: summarizeFeed(people, first, final, "demo", "scripted") };
}
