import type { GemmaReview } from "@/server/gemma/prompt";

export type { GemmaReview };

/** Research-backed review from POST /api/gemma-review, fetched alongside the debate. */
export type ReviewState =
  | { status: "loading" }
  | { status: "ready"; review: GemmaReview }
  | { status: "failed"; message: string };

/**
 * Plain mean of the scored criteria. The review prompt deliberately assigns no
 * weights, so neither do we. Null when Gemma returned no usable scores.
 */
export function reviewOverall(review: GemmaReview): number | null {
  const scores = review.criteria.map((c) => c.score).filter((s): s is number => s !== null);
  if (scores.length === 0) return null;
  return Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
}

export async function fetchReview(
  body: { idea: string; hackathonUrl: string; rules: string },
  signal: AbortSignal,
): Promise<GemmaReview> {
  const res = await fetch("/api/gemma-review", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    signal,
  });
  const data = await res.json().catch(() => null);
  if (!res.ok) throw new Error(data?.error?.message ?? `Review failed (${res.status})`);
  return data as GemmaReview;
}
