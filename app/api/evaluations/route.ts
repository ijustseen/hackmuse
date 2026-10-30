import { after, connection } from "next/server";
import { providerNames } from "@/server/providers/types";
import { createProviders } from "@/server/providers/index";
import { createEvaluation, evaluationStore } from "@/server/jobs/store";
import { runEvaluation } from "@/server/pipeline/run-evaluation";
import { jsonError, readSubmission } from "@/server/http/submission";

export const maxDuration = 300;

export async function GET() {
  await connection();
  return Response.json({
    evaluations: evaluationStore.list().map((evaluation) => ({
      id: evaluation.id,
      status: evaluation.status,
      stage: evaluation.stage,
      createdAt: evaluation.createdAt,
      updatedAt: evaluation.updatedAt,
    })),
  });
}

export async function POST(request: Request) {
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

  const providers = createProviders();
  const evaluation = evaluationStore.insert(
    createEvaluation({
      id: crypto.randomUUID(),
      status: "queued",
      stage: "queued",
      submission: parsed.submission,
      providers: providerNames(providers),
      research: null,
      podcast: null,
      analysis: null,
      error: null,
    }),
  );

  after(() => runEvaluation(evaluation.id, providers));

  return Response.json(evaluation, { status: 202 });
}
