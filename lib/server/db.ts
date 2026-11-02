import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { FeedResult } from "../feed";
import type { GemmaReview } from "../review";
import type { Debate } from "../types";

let cached: SupabaseClient | null | undefined;

/**
 * Server-side client with the secret key, which bypasses row-level security. The browser never
 * talks to the database; every read and write goes through a route that decides what is allowed.
 * Null when Supabase isn't configured, and the app then runs on sessionStorage alone.
 */
export function db(): SupabaseClient | null {
  if (cached === undefined) {
    const url = process.env.HACKMUSE_SUPABASE_URL;
    const key = process.env.HACKMUSE_SUPABASE_SERVICE_ROLE_KEY;
    cached =
      url && key ? createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } }) : null;
  }
  return cached;
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function readJudgmentId(value: unknown): string | null {
  return typeof value === "string" && UUID.test(value) ? value.toLowerCase() : null;
}

/** The judgment id a request body carries, if it is a well-formed one. */
export function judgmentIdFromBody(body: unknown): string | null {
  return typeof body === "object" && body !== null
    ? readJudgmentId((body as Record<string, unknown>).judgmentId)
    : null;
}

/** Creates an idea with its first judgment and returns the judgment id; null when nothing was saved. */
export async function createJudgment(input: {
  idea: string;
  hackathonUrl: string;
  rules: string;
}): Promise<string | null> {
  const client = db();
  if (!client) return null;
  try {
    const { data: idea, error: ideaError } = await client.from("ideas").insert({}).select("id").single();
    if (ideaError || !idea) throw ideaError ?? new Error("no idea row");
    const { data: judgment, error } = await client
      .from("judgments")
      .insert({
        idea_id: idea.id,
        idea_text: input.idea,
        hackathon_url: input.hackathonUrl,
        rules: input.rules,
      })
      .select("id")
      .single();
    if (error || !judgment) throw error ?? new Error("no judgment row");
    return judgment.id as string;
  } catch (error) {
    console.error("[db] could not create the idea:", error);
    return null;
  }
}

// Each result is written once: the `is null` filter means a replay of the same id cannot overwrite it.

export async function saveDebate(id: string, debate: Debate, latencyMs: number): Promise<void> {
  const client = db();
  if (!client) return;
  try {
    const { error } = await client
      .from("judgments")
      .update({ debate, model: debate.model, latency_ms: latencyMs })
      .eq("id", id)
      .is("debate", null);
    if (error) throw error;
  } catch (error) {
    console.error("[db] could not save the debate:", error);
  }
}

export async function saveReview(id: string, review: GemmaReview): Promise<void> {
  const client = db();
  if (!client) return;
  try {
    const { error } = await client.from("judgments").update({ review }).eq("id", id).is("review", null);
    if (error) throw error;
  } catch (error) {
    console.error("[db] could not save the review:", error);
  }
}

/** Needs migration 0002 (judgments.feed). Before it is applied the save fails, is logged, and nothing else breaks. */
export async function saveFeed(id: string, feed: FeedResult): Promise<void> {
  const client = db();
  if (!client) return;
  try {
    const { error } = await client.from("judgments").update({ feed }).eq("id", id).is("feed", null);
    if (error) throw error;
  } catch (error) {
    console.error("[db] could not save the feed:", error);
  }
}

/** Makes the idea behind a judgment readable by anyone with the link. */
export async function shareJudgment(id: string): Promise<"ok" | "missing" | "unsaved" | "offline" | "error"> {
  const client = db();
  if (!client) return "offline";
  try {
    const { data, error } = await client.from("judgments").select("idea_id, debate").eq("id", id).maybeSingle();
    if (error) throw error;
    if (!data) return "missing";
    if (!data.debate) return "unsaved";
    const { error: updateError } = await client.from("ideas").update({ is_public: true }).eq("id", data.idea_id);
    if (updateError) throw updateError;
    return "ok";
  } catch (error) {
    console.error("[db] could not share the verdict:", error);
    return "error";
  }
}

export interface PublicVerdict {
  id: string;
  idea: string;
  hackathonUrl: string;
  debate: Debate;
  review: GemmaReview | null;
  feed: FeedResult | null;
  createdAt: string;
}

const VERDICT_COLUMNS = "id, idea_text, hackathon_url, debate, review, created_at, ideas!inner(is_public)";

/** A verdict that was shared, or null: unknown id, not shared, or not finished. */
export async function getPublicVerdict(id: string): Promise<PublicVerdict | null> {
  const client = db();
  if (!client) return null;
  try {
    const read = (columns: string) =>
      client.from("judgments").select(columns).eq("id", id).maybeSingle<Record<string, unknown>>();
    let { data, error } = await read(`${VERDICT_COLUMNS}, feed`);
    // 42703 = undefined column: migration 0002 is not applied yet, so read the verdict without the feed.
    if (error?.code === "42703") ({ data, error } = await read(VERDICT_COLUMNS));
    if (error) throw error;
    if (!data?.debate) return null;
    const ideas = data.ideas as { is_public: boolean } | { is_public: boolean }[] | null;
    const isPublic = Array.isArray(ideas) ? ideas[0]?.is_public : ideas?.is_public;
    if (!isPublic) return null;
    return {
      id: data.id as string,
      idea: data.idea_text as string,
      hackathonUrl: data.hackathon_url as string,
      debate: data.debate as Debate,
      review: (data.review as GemmaReview | null) ?? null,
      feed: (data.feed as FeedResult | null | undefined) ?? null,
      createdAt: data.created_at as string,
    };
  } catch (error) {
    console.error("[db] could not read the verdict:", error);
    return null;
  }
}

export async function addToWaitlist(email: string, source: string): Promise<"ok" | "offline" | "error"> {
  const client = db();
  if (!client) return "offline";
  try {
    const { error } = await client.from("waitlist").insert({ email: email.toLowerCase(), source });
    // 23505 = already on the list. Same answer as a new signup, so the form leaks nothing.
    if (error && error.code !== "23505") throw error;
    return "ok";
  } catch (error) {
    console.error("[db] could not add to the waitlist:", error);
    return "error";
  }
}
