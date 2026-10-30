import { MAX_IDEA, MIN_IDEA } from "@/lib/idea";
import { streamDemo } from "@/lib/server/demo-debate";
import { gemmaApiKey, streamDebate, type HackathonContext } from "@/lib/server/gemma";
import type { StreamEvent } from "@/lib/types";

// Streams the debate as NDJSON (one StreamEvent per line) so the room can start
// voicing the first lines while Gemma is still writing the rest.
export async function POST(request: Request) {
  let idea = "";
  let demo = false;
  let hackathon: HackathonContext | undefined;
  try {
    const body = await request.json();
    idea = typeof body?.idea === "string" ? body.idea.trim() : "";
    demo = body?.demo === true;
    const url = typeof body?.hackathonUrl === "string" ? body.hackathonUrl.trim() : "";
    const rules = typeof body?.rules === "string" ? body.rules.trim() : "";
    if (url && rules) hackathon = { url: url.slice(0, 2000), rules };
  } catch {
    return Response.json({ error: "Body must be JSON: { idea: string }" }, { status: 400 });
  }

  if (idea.length < MIN_IDEA || idea.length > MAX_IDEA) {
    return Response.json({ error: `Describe the idea in ${MIN_IDEA}–${MAX_IDEA} characters.` }, { status: 400 });
  }

  const apiKey = gemmaApiKey();
  const signal = AbortSignal.any([request.signal, AbortSignal.timeout(120_000)]);
  const events = demo || !apiKey ? streamDemo(idea, signal) : streamDebate(idea, apiKey, signal, hackathon);
  const encoder = new TextEncoder();

  const body = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (e: StreamEvent) => controller.enqueue(encoder.encode(`${JSON.stringify(e)}\n`));
      try {
        for await (const event of events) send(event);
      } catch (err) {
        console.error("[debate] Gemma failed:", err);
        if (!request.signal.aborted) {
          send({ type: "error", message: "The judges couldn't reach a verdict (the Gemma call failed). Try again." });
        }
      } finally {
        controller.close();
      }
    },
    cancel() {
      void events.return(undefined);
    },
  });

  return new Response(body, {
    headers: {
      "Content-Type": "application/x-ndjson; charset=utf-8",
      "Cache-Control": "no-store",
      "X-Accel-Buffering": "no",
    },
  });
}
