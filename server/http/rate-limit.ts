import { rateRules } from "@/server/config";

type Bucket = { count: number; resetAt: number };
type Rule = { key: string; max: number; windowMs: number; cost: number; scope: "visitor" | "site" };

export type Blocked = { ok: false; scope: Rule["scope"]; retryAfterSec: number };

const GLOBAL_KEY = "__hackmuseLimits";
const MAX_BUCKETS = 10_000;

type GlobalWithLimits = typeof globalThis & {
  [GLOBAL_KEY]?: Map<string, Bucket>;
};

// One process, one Map, like the job store: a restart resets the counts and a second
// instance would not share them. Fine while the app runs as a single instance.
function buckets(): Map<string, Bucket> {
  const globalStore = globalThis as GlobalWithLimits;
  if (!globalStore[GLOBAL_KEY]) {
    globalStore[GLOBAL_KEY] = new Map();
  }
  return globalStore[GLOBAL_KEY];
}

/**
 * The client as the nearest trusted proxy saw it: the `hops`-th entry from the right of
 * X-Forwarded-For. Entries further left are client-supplied and can be spoofed, which is
 * why the daily budget, not this key, is the hard cap.
 */
function visitorId(request: Request, hops: number): string {
  const forwarded = (request.headers.get("x-forwarded-for") ?? "")
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);
  return forwarded[forwarded.length - hops] ?? request.headers.get("x-real-ip") ?? "local";
}

function msUntilUtcMidnight(now: number): number {
  const next = new Date(now);
  next.setUTCHours(24, 0, 0, 0);
  return next.getTime() - now;
}

/** Charges every rule or none, so a blocked request does not use up the other budget. */
function take(rules: Rule[], now: number): { ok: true } | Blocked {
  const map = buckets();
  if (map.size > MAX_BUCKETS) {
    for (const [key, bucket] of map) {
      if (bucket.resetAt <= now) map.delete(key);
    }
  }

  const live = rules.map((rule) => {
    let bucket = map.get(rule.key);
    if (!bucket || bucket.resetAt <= now) {
      bucket = { count: 0, resetAt: now + rule.windowMs };
      map.set(rule.key, bucket);
    }
    return { rule, bucket };
  });

  const blocked = live.find(({ rule, bucket }) => bucket.count + rule.cost > rule.max);
  if (blocked) {
    return {
      ok: false,
      scope: blocked.rule.scope,
      retryAfterSec: Math.max(1, Math.ceil((blocked.bucket.resetAt - now) / 1000)),
    };
  }
  for (const { rule, bucket } of live) bucket.count += rule.cost;
  return { ok: true };
}

/**
 * Counts one request against this visitor and `dailyCost` units against the site-wide daily
 * budget of `name`. Call it only on paths that reach a paid API.
 */
export function checkLimit(
  request: Request,
  name: string,
  rule: { perVisitor: number; windowMs: number; daily: number },
  dailyCost = 1,
): { ok: true } | Blocked {
  const now = Date.now();
  const who = visitorId(request, rateRules().trustedProxyHops);
  return take(
    [
      { key: `${name}:visitor:${who}`, max: rule.perVisitor, windowMs: rule.windowMs, cost: 1, scope: "visitor" },
      { key: `${name}:day`, max: rule.daily, windowMs: msUntilUtcMidnight(now), cost: dailyCost, scope: "site" },
    ],
    now,
  );
}

function waitText(seconds: number): string {
  if (seconds >= 3600) return `${Math.ceil(seconds / 3600)} hours`;
  if (seconds >= 60) return `${Math.ceil(seconds / 60)} minutes`;
  return `${seconds} seconds`;
}

/**
 * `text` matches the routes that answer `{ error: string }`; `coded` matches the ones that
 * answer `{ error: { code, message } }`. A spent daily budget is a 503; the debate room shows the
 * message, and the feed falls back to a sharks-only grade.
 */
export function limitResponse(blocked: Blocked, shape: "text" | "coded"): Response {
  const site = blocked.scope === "site";
  const status = site ? 503 : 429;
  const message = site
    ? "HACKMUSE has used up today's budget. Try again tomorrow."
    : `You've hit the limit for now. Try again in ${waitText(blocked.retryAfterSec)}.`;
  const headers = { "Retry-After": String(blocked.retryAfterSec) };
  return shape === "text"
    ? Response.json({ error: message }, { status, headers })
    : Response.json({ error: { code: site ? "budget_exhausted" : "rate_limited", message } }, { status, headers });
}
