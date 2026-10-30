import { limits } from "@/server/config";
import {
  type Analysis,
  type CriterionScore,
  type DialogueTurn,
  type ResearchReport,
  type SearchHit,
  type SimilarHackathon,
  type SpeakerId,
  type Winner,
} from "@/server/domain/types";

export class ContractError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ContractError";
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function expectRecord(value: unknown, label: string): Record<string, unknown> {
  if (!isRecord(value)) {
    throw new ContractError(`${label} must be an object.`);
  }
  return value;
}

function expectString(value: unknown, label: string, max = 4_000): string {
  if (typeof value !== "string" || value.trim() === "") {
    throw new ContractError(`${label} must be a non-empty string.`);
  }
  if (value.length > max) {
    throw new ContractError(`${label} is longer than ${max} characters.`);
  }
  return value.trim();
}

function expectScore(value: unknown, label: string): number {
  if (typeof value !== "number" || !Number.isInteger(value) || value < 0 || value > 100) {
    throw new ContractError(`${label} must be an integer from 0 to 100.`);
  }
  return value;
}

function expectStringList(value: unknown, label: string, min: number, max: number): string[] {
  if (!Array.isArray(value) || value.length < min || value.length > max) {
    throw new ContractError(`${label} must be a list of ${min} to ${max} strings.`);
  }
  return value.map((item, index) => expectString(item, `${label}[${index}]`));
}

function parseWinner(value: unknown, index: number): Winner {
  const record = expectRecord(value, `winners[${index}]`);
  return {
    name: expectString(record.name, `winners[${index}].name`, 200),
    project: expectString(record.project, `winners[${index}].project`, 300),
    whyItWon: expectString(record.whyItWon, `winners[${index}].whyItWon`, limits.rationale),
  };
}

function parseHackathon(value: unknown, index: number): SimilarHackathon {
  const record = expectRecord(value, `hackathons[${index}]`);
  if (!Array.isArray(record.winners)) {
    throw new ContractError(`hackathons[${index}].winners must be a list.`);
  }
  return {
    name: expectString(record.name, `hackathons[${index}].name`, 200),
    url: expectString(record.url, `hackathons[${index}].url`, limits.url.max),
    whySimilar: expectString(record.whySimilar, `hackathons[${index}].whySimilar`, limits.rationale),
    winners: record.winners.map(parseWinner),
  };
}

function parseSource(value: unknown, index: number): SearchHit {
  const record = expectRecord(value, `sources[${index}]`);
  return {
    title: expectString(record.title, `sources[${index}].title`, 300),
    url: expectString(record.url, `sources[${index}].url`, limits.url.max),
    snippet: expectString(record.snippet, `sources[${index}].snippet`, 2_000),
  };
}

export function parseResearchReport(value: unknown): ResearchReport {
  const record = expectRecord(value, "ResearchReport");
  const page = expectRecord(record.page, "page");
  if (!Array.isArray(record.hackathons) || !Array.isArray(record.sources)) {
    throw new ContractError("ResearchReport needs hackathons and sources arrays.");
  }
  return {
    summary: expectString(record.summary, "summary", 4_000),
    patterns: expectStringList(record.patterns, "patterns", 1, 8),
    hackathons: record.hackathons.map(parseHackathon),
    sources: record.sources.map(parseSource),
    page: {
      url: expectString(page.url, "page.url", limits.url.max),
      title: page.title === null ? null : expectString(page.title, "page.title", 300),
      text: expectString(page.text, "page.text", 20_000),
    },
  };
}

export function parseDialogueTurn(value: unknown, expected: SpeakerId): DialogueTurn {
  const record = expectRecord(value, "DialogueTurn");
  const speaker = record.speaker;
  if (speaker !== "host" && speaker !== "critic") {
    throw new ContractError("Dialogue turn speaker must be host or critic.");
  }
  if (speaker !== expected) {
    throw new ContractError(`Expected a turn from ${expected}.`);
  }
  return {
    speaker,
    text: expectString(record.text, "text", limits.turnText),
  };
}

function parseCriterion(value: unknown, index: number): CriterionScore {
  const record = expectRecord(value, `criteria[${index}]`);
  const id = expectString(record.id, `criteria[${index}].id`, 80);
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(id)) {
    throw new ContractError(`criteria[${index}].id must be kebab-case.`);
  }
  return {
    id,
    label: expectString(record.label, `criteria[${index}].label`, limits.criterionLabel),
    score: expectScore(record.score, `criteria[${index}].score`),
    rationale: expectString(record.rationale, `criteria[${index}].rationale`, limits.rationale),
  };
}

export function parseAnalysis(value: unknown): Analysis {
  const record = expectRecord(value, "Analysis");
  if (!Array.isArray(record.criteria)) {
    throw new ContractError("Analysis.criteria must be a list.");
  }
  if (record.criteria.length < 1 || record.criteria.length > 8) {
    throw new ContractError("Analysis needs between 1 and 8 criteria.");
  }
  return {
    summary: expectString(record.summary, "summary", 4_000),
    pros: expectStringList(record.pros, "pros", 1, 8),
    cons: expectStringList(record.cons, "cons", 1, 8),
    overallScore: expectScore(record.overallScore, "overallScore"),
    criteria: record.criteria.map(parseCriterion),
  };
}
