import { limits } from "@/server/config";
import type {
  Analysis,
  Evaluation,
  EvaluationEvent,
  EvaluationStage,
  LoggedEvent,
  Podcast,
  PodcastClip,
  ResearchReport,
} from "@/server/domain/types";

type Listener = (entry: LoggedEvent) => void;

type JobRecord = {
  evaluation: Evaluation;
  events: LoggedEvent[];
  listeners: Set<Listener>;
  nextEventId: number;
};

const GLOBAL_KEY = "__hackmuseJobs";

type GlobalWithJobs = typeof globalThis & {
  [GLOBAL_KEY]?: Map<string, JobRecord>;
};

function jobs(): Map<string, JobRecord> {
  const globalStore = globalThis as GlobalWithJobs;
  if (!globalStore[GLOBAL_KEY]) {
    globalStore[GLOBAL_KEY] = new Map();
  }
  return globalStore[GLOBAL_KEY];
}

export function createEvaluation(input: Omit<Evaluation, "updatedAt" | "createdAt"> & { now?: string }): Evaluation {
  const now = input.now ?? new Date().toISOString();
  return {
    id: input.id,
    createdAt: now,
    updatedAt: now,
    status: input.status,
    stage: input.stage,
    submission: input.submission,
    providers: input.providers,
    research: input.research,
    podcast: input.podcast,
    analysis: input.analysis,
    error: input.error,
  };
}

export const evaluationStore = {
  insert(evaluation: Evaluation): Evaluation {
    const record: JobRecord = {
      evaluation,
      events: [],
      listeners: new Set(),
      nextEventId: 1,
    };
    jobs().set(evaluation.id, record);
    this.append(evaluation.id, {
      type: "accepted",
      submission: evaluation.submission,
      providers: evaluation.providers,
    });
    trim();
    return this.require(evaluation.id);
  },

  get(id: string): Evaluation | undefined {
    return jobs().get(id)?.evaluation;
  },

  list(): Evaluation[] {
    return [...jobs().values()]
      .map((record) => record.evaluation)
      .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
  },

  eventsAfter(id: string, lastEventId: number): LoggedEvent[] {
    const record = jobs().get(id);
    if (!record) return [];
    return record.events.filter((entry) => entry.id > lastEventId);
  },

  subscribe(id: string, listener: Listener): () => void {
    const record = jobs().get(id);
    if (!record) return () => {};
    record.listeners.add(listener);
    return () => {
      record.listeners.delete(listener);
    };
  },

  markStage(id: string, stage: EvaluationStage, message: string): void {
    const status = stage === "completed" ? "completed" : stage === "failed" ? "failed" : "running";
    this.patch(id, (current) => ({ ...current, stage, status }));
    this.append(id, { type: "stage", stage, message });
  },

  setPodcastTitle(id: string, title: string): void {
    this.patch(id, (current) => ({
      ...current,
      podcast: { title, turns: [], clips: [] },
    }));
    this.append(id, { type: "podcast", title });
  },

  addTurn(id: string, index: number, turn: Podcast["turns"][number]): void {
    this.patch(id, (current) => {
      const podcast = current.podcast ?? { title: "Hackathon idea", turns: [], clips: [] };
      const turns = podcast.turns.slice();
      turns[index] = turn;
      return { ...current, podcast: { ...podcast, turns } };
    });
    this.append(id, { type: "dialogue", index, turn });
  },

  addClip(id: string, clip: PodcastClip): void {
    this.patch(id, (current) => {
      const podcast = current.podcast ?? { title: "Hackathon idea", turns: [], clips: [] };
      const clips = podcast.clips.slice();
      clips[clip.index] = clip;
      return { ...current, podcast: { ...podcast, clips } };
    });
    this.append(id, { type: "audio", clip });
  },

  setResearch(id: string, report: ResearchReport): void {
    this.patch(id, (current) => ({ ...current, research: report }));
    this.append(id, { type: "research", report });
  },

  complete(id: string, analysis: Analysis): void {
    this.patch(id, (current) => ({
      ...current,
      analysis,
      error: null,
    }));
    this.append(id, { type: "analysis", analysis });
    this.markStage(id, "completed", "Review ready.");
    this.append(id, { type: "done" });
  },

  fail(id: string, message: string): void {
    if (!jobs().has(id)) return;
    this.patch(id, (current) => ({
      ...current,
      status: "failed",
      stage: "failed",
      error: message,
    }));
    this.append(id, { type: "error", message, recoverable: false });
  },

  append(id: string, event: EvaluationEvent): LoggedEvent | undefined {
    const record = jobs().get(id);
    if (!record) return undefined;
    const entry: LoggedEvent = {
      id: record.nextEventId,
      at: new Date().toISOString(),
      event,
    };
    record.nextEventId += 1;
    record.events.push(entry);
    for (const listener of [...record.listeners]) {
      listener(entry);
    }
    return entry;
  },

  patch(id: string, update: (current: Evaluation) => Evaluation): Evaluation {
    const record = this.requireRecord(id);
    const next = update(record.evaluation);
    record.evaluation = { ...next, updatedAt: new Date().toISOString() };
    return record.evaluation;
  },

  require(id: string): Evaluation {
    return this.requireRecord(id).evaluation;
  },

  requireRecord(id: string): JobRecord {
    const record = jobs().get(id);
    if (!record) {
      throw new Error(`Evaluation ${id} is not in the store.`);
    }
    return record;
  },
};

function trim(): void {
  const store = jobs();
  if (store.size <= limits.storedEvaluations) return;
  for (const [id, record] of store) {
    const status = record.evaluation.status;
    if (status === "completed" || status === "failed") {
      store.delete(id);
    }
    if (store.size <= limits.storedEvaluations) return;
  }
}
