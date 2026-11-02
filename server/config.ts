export const limits = {
  idea: { min: 1, max: 8_000 },
  rules: { min: 1, max: 20_000 },
  url: { max: 2_000 },
  pageTextInPrompt: 8_000,
  podcastTurns: 6,
  criterionLabel: 120,
  rationale: 1_000,
  turnText: 2_000,
  storedEvaluations: 100,
} as const;

export function stubLatencyMs(): number {
  const raw = process.env.STUB_LATENCY_MS ?? "150";
  const parsed = Number(raw);
  if (!Number.isFinite(parsed) || parsed < 0) return 0;
  return parsed;
}

export function voiceIdFor(speaker: "host" | "critic"): string {
  if (speaker === "host") {
    return process.env.ELEVENLABS_VOICE_HOST || "voice_host";
  }
  return process.env.ELEVENLABS_VOICE_CRITIC || "voice_critic";
}

export function providerMode(name: string | undefined): "stub" | "live" {
  return name === "live" ? "live" : "stub";
}

function positiveIntFromEnv(name: string, fallback: number): number {
  const parsed = Number(process.env[name]);
  return Number.isFinite(parsed) && parsed >= 1 ? Math.floor(parsed) : fallback;
}

/**
 * Abuse guards for the routes that spend money. `perVisitor` is per client in `windowMs`;
 * `daily` is site-wide per UTC day, in requests.
 */
export function rateRules() {
  return {
    trustedProxyHops: positiveIntFromEnv("TRUSTED_PROXY_HOPS", 1),
    debate: {
      perVisitor: positiveIntFromEnv("LIMIT_DEBATE_PER_VISITOR", 8),
      windowMs: 60 * 60_000,
      daily: positiveIntFromEnv("LIMIT_DEBATE_DAILY", 300),
    },
    // The feed: 3 Gemma calls per run, so its budget sits next to the debate's.
    feed: {
      perVisitor: positiveIntFromEnv("LIMIT_FEED_PER_VISITOR", 8),
      windowMs: 60 * 60_000,
      daily: positiveIntFromEnv("LIMIT_FEED_DAILY", 300),
    },
    review: {
      perVisitor: positiveIntFromEnv("LIMIT_REVIEW_PER_VISITOR", 6),
      windowMs: 60 * 60_000,
      daily: positiveIntFromEnv("LIMIT_REVIEW_DAILY", 200),
    },
    // Rows written to the database: new ideas and shares.
    writes: {
      perVisitor: positiveIntFromEnv("LIMIT_WRITES_PER_VISITOR", 30),
      windowMs: 60 * 60_000,
      daily: positiveIntFromEnv("LIMIT_WRITES_DAILY", 3_000),
    },
    waitlist: {
      perVisitor: positiveIntFromEnv("LIMIT_WAITLIST_PER_VISITOR", 5),
      windowMs: 60 * 60_000,
      daily: positiveIntFromEnv("LIMIT_WAITLIST_DAILY", 500),
    },
  } as const;
}
