import type { FeedEvent } from "@/lib/feed";
import { MAX_IDEA, MIN_IDEA } from "@/lib/idea";
import { judgmentIdFromBody, saveFeed } from "@/lib/server/db";
import { streamDemoFeed } from "@/lib/server/demo-feed";
import { streamFeed } from "@/lib/server/feed";
import { gemmaApiKey } from "@/lib/server/gemma";
import { rateRules } from "@/server/config";
import { checkLimit, limitResponse } from "@/server/http/rate-limit";

// Streams the feed simulation as NDJSON (one FeedEvent per line): the people, round 1, round 2,
// then the counted result. The arena moves the fish as each step lands.
export async function POST(request: Request) {
  let idea = "";
  let demo = false;
  let judgmentId: string | null = null;
  try {
    const body = await request.json();
    judgmentId = judgmentIdFromBody(body);
    idea = typeof body?.idea === "string" ? body.idea.trim() : "";
    demo = body?.demo === true;
  } catch {
    return Response.json({ error: "Body must be JSON: { idea: string }" }, { status: 400 });
  }

  if (idea.length < MIN_IDEA || idea.length > MAX_IDEA) {
    return Response.json({ error: `Describe the idea in ${MIN_IDEA}–${MAX_IDEA} characters.` }, { status: 400 });
  }

  const apiKey = gemmaApiKey();
  // The scripted feed makes no Gemma call, so it is free and not counted.
  if (!demo && apiKey) {
    const blocked = checkLimit(request, "feed", rateRules().feed);
    if (!blocked.ok) return limitResponse(blocked, "text");
  }
  const signal = AbortSignal.any([request.signal, AbortSignal.timeout(120_000)]);
  const events = demo || !apiKey ? streamDemoFeed(signal) : streamFeed(idea, apiKey, signal);
  const encoder = new TextEncoder();

  const body = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (e: FeedEvent) => controller.enqueue(encoder.encode(`${JSON.stringify(e)}\n`));
      try {
        for await (const event of events) {
          send(event);
          // Saved from what the server produced, never from the browser. Demo feeds are not saved.
          if (event.type === "feed" && event.feed.source === "gemma" && judgmentId) {
            await saveFeed(judgmentId, event.feed);
          }
        }
      } catch (err) {
        console.error("[feed] Gemma failed:", err);
        if (!request.signal.aborted) {
          send({ type: "error", message: "The feed went quiet. The grade uses the sharks alone." });
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
