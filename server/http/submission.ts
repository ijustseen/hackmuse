import { limits } from "@/server/config";
import type { Submission } from "@/server/domain/types";

export type FieldErrors = Partial<Record<keyof Submission, string>>;

export function readSubmission(body: unknown): { submission: Submission } | { fields: FieldErrors } {
  if (typeof body !== "object" || body === null || Array.isArray(body)) {
    return { fields: { idea: "Body must be a JSON object." } };
  }

  const record = body as Record<string, unknown>;
  const fields: FieldErrors = {};
  const idea = readText(record.idea, "idea", limits.idea.min, limits.idea.max, fields);
  const rules = readText(record.rules, "rules", limits.rules.min, limits.rules.max, fields);
  const hackathonUrl = readUrl(record.hackathonUrl, fields);

  if (Object.keys(fields).length > 0 || !idea || !rules || !hackathonUrl) {
    return { fields };
  }

  return { submission: { idea, rules, hackathonUrl } };
}

function readText(
  value: unknown,
  field: keyof Submission,
  min: number,
  max: number,
  fields: FieldErrors,
): string | undefined {
  if (typeof value !== "string" || value.trim() === "") {
    fields[field] = "Required.";
    return undefined;
  }
  const trimmed = value.trim();
  if (trimmed.length < min || trimmed.length > max) {
    fields[field] = `Use between ${min} and ${max} characters.`;
    return undefined;
  }
  return trimmed;
}

function readUrl(value: unknown, fields: FieldErrors): string | undefined {
  if (typeof value !== "string" || value.trim() === "") {
    fields.hackathonUrl = "Required.";
    return undefined;
  }
  const trimmed = value.trim();
  if (trimmed.length > limits.url.max) {
    fields.hackathonUrl = `Use at most ${limits.url.max} characters.`;
    return undefined;
  }
  try {
    const url = new URL(trimmed);
    if (url.protocol !== "http:" && url.protocol !== "https:") {
      fields.hackathonUrl = "Use an http or https URL.";
      return undefined;
    }
    return url.toString();
  } catch {
    fields.hackathonUrl = "Use an http or https URL.";
    return undefined;
  }
}

export function jsonError(
  status: number,
  code: string,
  message: string,
  extra?: Record<string, unknown>,
): Response {
  return Response.json({ error: { code, message, ...extra } }, { status });
}
