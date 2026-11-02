import { MAX_IDEA, MIN_IDEA } from "@/lib/idea";
import { judgmentIdFromBody, saveDebate } from "@/lib/server/db";
import { streamDemo } from "@/lib/server/demo-debate";
import { gemmaApiKey, streamDebate, type HackathonContext } from "@/lib/server/gemma";
import type { StreamEvent } from "@/lib/types";
import { rateRules } from "@/server/config";
import { checkLimit, limitResponse } from "@/server/http/rate-limit";

// Streams the debate as NDJSON (one StreamEvent per line) so the room can start
// voicing the first lines while Gemma is still writing the rest.
export async function POST(request: Request) {
  let idea = "";
  let demo = false;
  let hackathon: HackathonContext | undefined;
  let judgmentId: string | null = null;
  try {
    const body = await request.json();
    judgmentId = judgmentIdFromBody(body);
    idea = typeof body?.idea === "string" ? body.idea.trim() : "";
    demo = body?.demo === true;
    const url = typeof body?.hackathonUrl === "string" ? body.hackathonUrl.trim() : "";
    const rules = typeof body?.rules === "string" ? body.rules.trim() : "";
    // A theme preset has rules but no page, so the URL is optional.
    if (rules) hackathon = { url: url.slice(0, 2000), rules };
  } catch {
    return Response.json({ error: "Body must be JSON: { idea: string }" }, { status: 400 });
  }

  if (idea.length < MIN_IDEA || idea.length > MAX_IDEA) {
    return Response.json({ error: `Describe the idea in ${MIN_IDEA}–${MAX_IDEA} characters.` }, { status: 400 });
  }

  const apiKey = gemmaApiKey();
  // Demo mode makes no Gemma call, so it is free and not counted.
  if (!demo && apiKey) {
    const blocked = checkLimit(request, "debate", rateRules().debate);
    if (!blocked.ok) return limitResponse(blocked, "text");
  }
  const signal = AbortSignal.any([request.signal, AbortSignal.timeout(120_000)]);
  const events = demo || !apiKey ? streamDemo(idea, signal) : streamDebate(idea, apiKey, signal, hackathon);
  const encoder = new TextEncoder();
  const startedAt = Date.now();

  const body = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (e: StreamEvent) => controller.enqueue(encoder.encode(`${JSON.stringify(e)}\n`));
      try {
        for await (const event of events) {
          send(event);
          // Saved here, from what the server produced, so a verdict can't be written from the browser.
          // Demo debates are placeholders and are never saved.
          if (event.type === "debate" && event.debate.source === "gemma" && judgmentId) {
            await saveDebate(judgmentId, event.debate, Date.now() - startedAt);
          }
        }
      } catch (err) {
        console.error("[debate] Gemma failed:", err);
        if (!request.signal.aborted) {
          send({ type: "error", message: "The judges couldn't reach a verdict. Try again." });
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
