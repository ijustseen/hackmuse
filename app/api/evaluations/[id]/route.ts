import { connection, type NextRequest } from "next/server";
import { evaluationStore } from "@/server/jobs/store";
import { jsonError } from "@/server/http/submission";

export async function GET(_request: NextRequest, context: { params: Promise<{ id: string }> }) {
  await connection();
  const { id } = await context.params;
  const evaluation = evaluationStore.get(id);
  if (!evaluation) {
    return jsonError(404, "not_found", "Evaluation not found.");
  }
  return Response.json(evaluation);
}
