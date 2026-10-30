import { JUDGES, isJudgeId } from "@/lib/judges";

const DEFAULT_MODEL = "eleven_multilingual_v2";

// Per-judge voice tuning: the Shark is steadier, the Visionary more expressive.
const VOICE_SETTINGS = {
  chair: { stability: 0.6, similarity_boost: 0.8, style: 0.15 },
  shark: { stability: 0.55, similarity_boost: 0.8, style: 0.3 },
  builder: { stability: 0.5, similarity_boost: 0.75, style: 0.25 },
  visionary: { stability: 0.35, similarity_boost: 0.75, style: 0.6 },
  angel: { stability: 0.5, similarity_boost: 0.8, style: 0.35 },
  operator: { stability: 0.55, similarity_boost: 0.8, style: 0.25 },
} as const;

export async function POST(request: Request) {
  const apiKey = process.env.ELEVENLABS_API_KEY;
  if (!apiKey) {
    // The debate room treats 503 as "captions only" mode.
    return Response.json({ error: "ELEVENLABS_API_KEY is not set" }, { status: 503 });
  }

  let speaker: unknown, text: unknown, cue: unknown;
  try {
    ({ speaker, text, cue } = await request.json());
  } catch {
    return Response.json({ error: "Body must be JSON" }, { status: 400 });
  }
  if (!isJudgeId(speaker) || typeof text !== "string" || !text.trim() || text.length > 600) {
    return Response.json({ error: "Expected { speaker, text } with text ≤ 600 chars" }, { status: 400 });
  }

  const model = process.env.ELEVENLABS_MODEL || DEFAULT_MODEL;
  const voiceId =
    process.env[`ELEVENLABS_VOICE_${speaker.toUpperCase()}`] || JUDGES[speaker].voiceId;
  // eleven_v3 understands inline audio tags like [skeptical]; older models would read them aloud.
  const spoken =
    model.startsWith("eleven_v3") && typeof cue === "string" && /^[a-z]{2,16}$/.test(cue)
      ? `[${cue}] ${text}`
      : text;

  const res = await fetch(
    `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}?output_format=mp3_44100_128`,
    {
      method: "POST",
      headers: { "xi-api-key": apiKey, "Content-Type": "application/json", Accept: "audio/mpeg" },
      body: JSON.stringify({
        text: spoken,
        model_id: model,
        voice_settings: VOICE_SETTINGS[speaker],
      }),
      signal: AbortSignal.timeout(45_000),
    },
  );

  if (!res.ok || !res.body) {
    const detail = await res.text().catch(() => "");
    console.error(`[tts] ElevenLabs ${res.status}: ${detail.slice(0, 300)}`);
    return Response.json({ error: `ElevenLabs returned ${res.status}` }, { status: 502 });
  }

  return new Response(res.body, {
    headers: { "Content-Type": "audio/mpeg", "Cache-Control": "no-store" },
  });
}
