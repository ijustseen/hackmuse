import type {
  Analysis,
  CriterionScore,
  DialogueTurn,
  PageExcerpt,
  ResearchReport,
  SearchHit,
  SpeakerId,
  Submission,
} from "@/server/domain/types";
import { clip } from "@/server/prompts/text";

/** Fixture data for the stub providers. Clearly labeled so it cannot be mistaken for live research. */

const fixtureHits: SearchHit[] = [
  {
    title: "Fixture: Harbor Weekend winners",
    url: "https://example.com/hackathons/harbor-weekend",
    snippet:
      "Fixture result, not a live search. First place shipped a working demo for a narrow user and a two-minute video.",
  },
  {
    title: "Fixture: Northline Build Night winners",
    url: "https://example.com/hackathons/northline",
    snippet:
      "Fixture result, not a live search. Winners mapped their project onto the published judging criteria in the submission text.",
  },
];

export function stubPage(url: string): PageExcerpt {
  return {
    url,
    title: null,
    text: "Stub page reader. The live reader will fetch this URL and return visible text. The pasted rules are the source of criteria until then.",
  };
}

export function stubSearchHits(): SearchHit[] {
  return fixtureHits.map((hit) => ({ ...hit }));
}

export function stubResearch(input: {
  submission: Submission;
  page: PageExcerpt;
  sources: SearchHit[];
}): ResearchReport {
  return {
    summary: `Stub research for “${clip(input.submission.idea, 140)}”. These similar hackathons are fixtures until the search provider and the research prompt are connected.`,
    patterns: [
      "Fixture pattern: winners demo a narrow workflow rather than a platform.",
      "Fixture pattern: the submission text quotes the published judging criteria.",
    ],
    hackathons: input.sources.map((source) => ({
      name: source.title,
      url: source.url,
      whySimilar: "Fixture comparison. A live research pass will explain the overlap with this hackathon.",
      winners: [
        {
          name: "Unknown (fixture)",
          project: "Not fetched",
          whyItWon: source.snippet,
        },
      ],
    })),
    sources: input.sources,
    page: input.page,
  };
}

const stubLines: Array<(idea: string) => { speaker: SpeakerId; text: string }> = [
  (idea) => ({
    speaker: "host",
    text: `Welcome in. The idea on the table is: ${clip(idea, 180)} Research into similar events is still running, so we will stay with the pitch and the written rules.`,
  }),
  () => ({
    speaker: "critic",
    text: "The written rules are the part I want to pressure. If the judging criteria ask for a working demo, a slide-only story will lose even when the idea is sharp.",
  }),
  () => ({
    speaker: "host",
    text: "So the first cut is demoability. Can a team show the core loop before the deadline, using only what the rules allow?",
  }),
  () => ({
    speaker: "critic",
    text: "Yes. The second cut is whether the idea is specific to this hackathon. A generic assistant that ignores the theme usually places behind a smaller project that quotes the brief.",
  }),
  () => ({
    speaker: "host",
    text: "We still do not have the similar-event winners in front of us. When that lands, the review should check this pitch against those patterns, not against our guesses.",
  }),
  () => ({
    speaker: "critic",
    text: "Agreed. Until then the open risks are scope, a missing demo path, and any rule this pitch does not answer directly. The score comes after the research, not in this conversation.",
  }),
];

export function stubDialogueTurn(transcriptLength: number, idea: string): DialogueTurn {
  const line = stubLines[transcriptLength] ?? stubLines[stubLines.length - 1];
  return line(idea);
}

export function stubPodcastTitle(idea: string): string {
  return `Stub episode: ${clip(idea, 60)}`;
}

export function stubAnalysis(idea: string): Analysis {
  const criteria: CriterionScore[] = [
    {
      id: "rule-fit",
      label: "Fit to the pasted rules",
      score: placeholderScore(idea, 1),
      rationale: "Placeholder. The live analysis prompt chooses this criterion and writes the rationale.",
    },
    {
      id: "demo-path",
      label: "Demo path before the deadline",
      score: placeholderScore(idea, 2),
      rationale: "Placeholder. A connected model should judge whether the core loop can be shown.",
    },
    {
      id: "winner-pattern",
      label: "Distance from typical winners",
      score: placeholderScore(idea, 3),
      rationale: "Placeholder. This waits on live research instead of the fixture hackathons.",
    },
  ];
  const overallScore = Math.round(
    criteria.reduce((sum, criterion) => sum + criterion.score, 0) / criteria.length,
  );
  return {
    summary: `Placeholder review of “${clip(idea, 140)}”. Overall ${overallScore}/100 comes from the stub provider, not from a model.`,
    pros: [
      "The pipeline received an idea, a hackathon URL, and written rules as separate inputs.",
    ],
    cons: [
      "Scores, pros, and cons are fixtures until the analysis prompt and LLM provider are connected.",
    ],
    overallScore,
    criteria,
  };
}

function placeholderScore(seed: string, salt: number): number {
  let hash = salt;
  for (const char of seed) {
    hash = (hash * 33 + char.charCodeAt(0)) >>> 0;
  }
  return 35 + (hash % 46);
}
