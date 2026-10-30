/** Shared contract for an idea review. Routes, agents, and the event log all use these types. */

export const speakers = ["host", "critic"] as const;

export type SpeakerId = (typeof speakers)[number];

export const speakerNames: Record<SpeakerId, string> = {
  host: "Muse",
  critic: "Skeptic",
};

export type Submission = {
  idea: string;
  hackathonUrl: string;
  rules: string;
};

export type EvaluationStatus = "queued" | "running" | "completed" | "failed";

export type EvaluationStage =
  | "queued"
  | "research_and_podcast"
  | "analysis"
  | "completed"
  | "failed";

export type ProviderNames = {
  llm: string;
  search: string;
  speech: string;
  page: string;
};

export type PageExcerpt = {
  url: string;
  title: string | null;
  text: string;
};

export type SearchHit = {
  title: string;
  url: string;
  snippet: string;
};

export type Winner = {
  name: string;
  project: string;
  whyItWon: string;
};

export type SimilarHackathon = {
  name: string;
  url: string;
  whySimilar: string;
  winners: Winner[];
};

export type ResearchReport = {
  summary: string;
  patterns: string[];
  hackathons: SimilarHackathon[];
  sources: SearchHit[];
  page: PageExcerpt;
};

export type DialogueTurn = {
  speaker: SpeakerId;
  text: string;
};

export type PodcastClip = {
  index: number;
  speaker: SpeakerId;
  text: string;
  voiceId: string;
  audioUrl: string | null;
  error: string | null;
};

export type Podcast = {
  title: string;
  turns: DialogueTurn[];
  clips: PodcastClip[];
};

export type CriterionScore = {
  id: string;
  label: string;
  score: number;
  rationale: string;
};

export type Analysis = {
  summary: string;
  pros: string[];
  cons: string[];
  overallScore: number;
  criteria: CriterionScore[];
};

export type Evaluation = {
  id: string;
  createdAt: string;
  updatedAt: string;
  status: EvaluationStatus;
  stage: EvaluationStage;
  submission: Submission;
  providers: ProviderNames;
  research: ResearchReport | null;
  podcast: Podcast | null;
  analysis: Analysis | null;
  error: string | null;
};

/**
 * Fixed event vocabulary. The SSE route replays this log.
 * `id` is added by the store and is the resume cursor (`Last-Event-ID` or `?after=`).
 */
export type EvaluationEvent =
  | { type: "accepted"; submission: Submission; providers: ProviderNames }
  | { type: "stage"; stage: EvaluationStage; message: string }
  | { type: "podcast"; title: string }
  | { type: "dialogue"; index: number; turn: DialogueTurn }
  | { type: "audio"; clip: PodcastClip }
  | { type: "research"; report: ResearchReport }
  | { type: "analysis"; analysis: Analysis }
  | { type: "done" }
  | { type: "error"; message: string; recoverable: false };

export type LoggedEvent = {
  id: number;
  at: string;
  event: EvaluationEvent;
};
