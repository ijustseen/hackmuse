import { GoogleGenAI } from "@google/genai";
import {
  buildGemmaPrompt,
  gemmaCriteria,
  type GemmaCriterionReview,
  type GemmaProjectInput,
  type GemmaReview,
  type GemmaSimilarProject,
  type GemmaSource,
} from "./prompt.ts";

export async function reviewWithGemma(input: GemmaProjectInput): Promise<GemmaReview> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is missing.");
  }

  const model = process.env.GEMMA_MODEL || "gemma-4-26b-a4b-it";
  const ai = new GoogleGenAI({ apiKey });
  const response = await ai.models.generateContent({
    model,
    contents: buildGemmaPrompt(input),
    config: {
      tools: [{ googleSearch: {} }],
      temperature: 0.2,
      maxOutputTokens: 8_000,
    },
  });

  const text = response.text ?? "";
  const grounding = response.candidates?.[0]?.groundingMetadata;
  const sources = groundingSources(grounding);
  const queries = grounding?.webSearchQueries?.filter((query): query is string => typeof query === "string") ?? [];
  const parsed = parseReview(text);

  return {
    model,
    parsed: parsed.ok,
    missing: parsed.missing,
    criteria: parsed.criteria,
    similarProjects: parsed.similarProjects,
    sources,
    queries,
    rawText: parsed.ok ? null : text || null,
  };
}

function groundingSources(grounding: { groundingChunks?: Array<{ web?: { title?: string; uri?: string } | null }> } | undefined): GemmaSource[] {
  return (
    grounding?.groundingChunks
      ?.map((chunk) => chunk.web)
      .filter((source): source is { title: string; uri: string } => Boolean(source?.title && source?.uri))
      .map((source) => ({ title: source.title, uri: source.uri })) ?? []
  );
}

function parseReview(text: string): {
  ok: boolean;
  missing: string | null;
  criteria: GemmaCriterionReview[];
  similarProjects: GemmaSimilarProject[];
} {
  const value = readJson(text);
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return { ok: false, missing: null, criteria: emptyCriteria(), similarProjects: [] };
  }

  const record = value as Record<string, unknown>;
  return {
    ok: true,
    missing: textOrNull(record.missing),
    criteria: readCriteria(record.criteria),
    similarProjects: readProjects(record.similarProjects ?? record.similar_projects ?? record.projects),
  };
}

function readJson(text: string): unknown {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i)?.[1] ?? text;
  const start = fenced.indexOf("{");
  const end = fenced.lastIndexOf("}");
  if (start < 0 || end <= start) return null;
  try {
    return JSON.parse(fenced.slice(start, end + 1));
  } catch {
    return null;
  }
}

function readCriteria(value: unknown): GemmaCriterionReview[] {
  const byId = new Map<string, Record<string, unknown>>();
  if (Array.isArray(value)) {
    for (const item of value) {
      if (item && typeof item === "object" && !Array.isArray(item)) {
        const record = item as Record<string, unknown>;
        const id = typeof record.id === "string" ? record.id : "";
        if (id) byId.set(id, record);
      }
    }
  } else if (value && typeof value === "object") {
    for (const [id, item] of Object.entries(value as Record<string, unknown>)) {
      if (item && typeof item === "object" && !Array.isArray(item)) {
        byId.set(id, item as Record<string, unknown>);
      }
    }
  }

  return gemmaCriteria.map((criterion) => {
    const item = byId.get(criterion.id);
    return {
      id: criterion.id,
      label: criterion.label,
      score: item ? readScore(item.score) : null,
      explanation: item ? textOrEmpty(item.explanation ?? item.short_explanation) : "",
      strengths: item ? readList(item.strengths) : [],
      weaknesses: item ? readList(item.weaknesses) : [],
      recommendations: item ? readList(item.recommendations) : [],
    };
  });
}

function emptyCriteria(): GemmaCriterionReview[] {
  return gemmaCriteria.map((criterion) => ({
    id: criterion.id,
    label: criterion.label,
    score: null,
    explanation: "",
    strengths: [],
    weaknesses: [],
    recommendations: [],
  }));
}

function readProjects(value: unknown): GemmaSimilarProject[] {
  if (!Array.isArray(value)) return [];
  const projects: GemmaSimilarProject[] = [];
  for (const item of value) {
    if (!item || typeof item !== "object" || Array.isArray(item)) continue;
    const record = item as Record<string, unknown>;
    const name = textOrEmpty(record.name ?? record.title ?? record.project);
    const url = httpUrl(record.url ?? record.uri ?? record.link);
    const note = textOrEmpty(record.note ?? record.why ?? record.summary ?? record.placement);
    if (!name && !url) continue;
    projects.push({ name: name || url || "Untitled project", url, note });
  }
  return projects;
}

function readScore(value: unknown): number | null {
  const numeric = typeof value === "number" ? value : typeof value === "string" ? Number(value) : NaN;
  if (!Number.isFinite(numeric)) return null;
  return Math.max(0, Math.min(100, Math.round(numeric)));
}

function readList(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.map((item) => textOrEmpty(item)).filter(Boolean);
  }
  const text = textOrEmpty(value);
  return text ? [text] : [];
}

function textOrEmpty(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function textOrNull(value: unknown): string | null {
  const text = textOrEmpty(value);
  return text || null;
}

function httpUrl(value: unknown): string | null {
  if (typeof value !== "string") return null;
  try {
    const url = new URL(value.trim());
    if (url.protocol !== "http:" && url.protocol !== "https:") return null;
    return url.toString();
  } catch {
    return null;
  }
}
