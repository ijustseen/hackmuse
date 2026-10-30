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
