import { connection } from "next/server";
import { jsonError, readSubmission } from "@/server/http/submission";
import { reviewWithGemma } from "@/server/gemma/review";

export const maxDuration = 300;

export async function POST(request: Request) {
  await connection();

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError(400, "invalid_json", "Request body must be JSON.");
  }

  const parsed = readSubmission(body);
  if ("fields" in parsed) {
    return jsonError(400, "invalid_submission", "Idea, hackathon URL, and rules are required.", {
      fields: parsed.fields,
    });
  }

  try {
    const review = await reviewWithGemma({
      projectIdea: parsed.submission.idea,
      hackathonUrl: parsed.submission.hackathonUrl,
      hackathonRules: parsed.submission.rules,
    });
    return Response.json(review);
  } catch (error) {
    const failure = publicFailure(error);
    return jsonError(failure.status, failure.code, failure.message);
  }
}

function publicFailure(error: unknown): { status: number; code: string; message: string } {
  const message = error instanceof Error ? error.message : String(error);
  if (message.includes("GEMINI_API_KEY is missing")) {
    return { status: 500, code: "missing_key", message: "GEMINI_API_KEY is not set on the server." };
  }
  if (message.includes("API_KEY_INVALID") || message.includes("API key not valid")) {
    return {
      status: 502,
      code: "invalid_key",
      message: "GEMINI_API_KEY was rejected. Replace it in .env.local and restart the dev server.",
    };
  }
  const safe = message.replace(/AIza[\w-]+/g, "[key]").replace(/AQ\.[\w.-]+/g, "[key]").slice(0, 400);
  return { status: 502, code: "gemma_failed", message: safe || "Gemma did not return a review." };
}
