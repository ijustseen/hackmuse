import { connection, type NextRequest } from "next/server";
import { evaluationStore } from "@/server/jobs/store";
import { jsonError } from "@/server/http/submission";
import { evaluationEventStream, lastEventIdFrom } from "@/server/http/sse";

export const maxDuration = 300;

export async function GET(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  await connection();
  const { id } = await context.params;
  if (!evaluationStore.get(id)) {
    return jsonError(404, "not_found", "Evaluation not found.");
  }

  return new Response(evaluationEventStream(id, lastEventIdFrom(request), request.signal), {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
