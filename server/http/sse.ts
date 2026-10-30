import type { EvaluationEvent, LoggedEvent } from "@/server/domain/types";
import { evaluationStore } from "@/server/jobs/store";

const encoder = new TextEncoder();

export function evaluationEventStream(
  evaluationId: string,
  lastEventId: number,
  signal: AbortSignal,
): ReadableStream<Uint8Array> {
  return new ReadableStream({
    start(controller) {
      let closed = false;
      let cursor = lastEventId;
      let unsubscribe = () => {};
      const timer: { heartbeat?: ReturnType<typeof setInterval> } = {};

      const close = () => {
        if (closed) return;
        closed = true;
        if (timer.heartbeat) clearInterval(timer.heartbeat);
        unsubscribe();
        signal.removeEventListener("abort", close);
        try {
          controller.close();
        } catch {
          // The client already went away.
        }
      };

      const enqueue = (chunk: Uint8Array) => {
        if (closed) return;
        try {
          controller.enqueue(chunk);
        } catch {
          close();
        }
      };

      const send = (entry: LoggedEvent) => {
        if (closed || entry.id <= cursor) return;
        cursor = entry.id;
        enqueue(encoder.encode(formatSse(entry)));
        if (isTerminal(entry.event)) close();
      };

      unsubscribe = evaluationStore.subscribe(evaluationId, send);
      for (const entry of evaluationStore.eventsAfter(evaluationId, lastEventId)) {
        send(entry);
      }
      if (closed) return;

      timer.heartbeat = setInterval(() => {
        enqueue(encoder.encode(": ping\n\n"));
      }, 15_000);

      const evaluation = evaluationStore.get(evaluationId);
      const finished = evaluation?.status === "completed" || evaluation?.status === "failed";
      if (finished && evaluationStore.eventsAfter(evaluationId, cursor).length === 0) {
        close();
      }

      signal.addEventListener("abort", close);
    },
  });
}

function isTerminal(event: EvaluationEvent): boolean {
  return event.type === "done" || event.type === "error";
}

function formatSse(entry: LoggedEvent): string {
  const data = JSON.stringify({ id: entry.id, ...entry.event });
  return `id: ${entry.id}\nevent: ${entry.event.type}\ndata: ${data}\n\n`;
}

export function lastEventIdFrom(request: { headers: Headers; nextUrl: URL }): number {
  const header = request.headers.get("last-event-id");
  const query = request.nextUrl.searchParams.get("after");
  const parsed = Number(header ?? query ?? "0");
  if (!Number.isInteger(parsed) || parsed < 0) return 0;
  return parsed;
}
