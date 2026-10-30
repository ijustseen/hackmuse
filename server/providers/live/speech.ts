import type { SpeechRequest, SpeechSynthesizer } from "@/server/providers/types";

/**
 * Live speech. Each podcast turn is synthesized separately so the dialogue
 * can play while research is still running.
 * Paste the ElevenLabs text-to-speech call into `synthesize` and return a URL
 * the browser can play. Follow the current ElevenLabs skill before writing that call.
 */
export class LiveSpeechSynthesizer implements SpeechSynthesizer {
  readonly name = "elevenlabs";

  async synthesize(request: SpeechRequest): Promise<{ audioUrl: string | null; error: string | null }> {
    const apiKey = process.env.ELEVENLABS_API_KEY;
    if (!apiKey) {
      throw new Error("SPEECH_PROVIDER=live requires ELEVENLABS_API_KEY.");
    }

    throw new Error(
      `No ElevenLabs call is implemented for ${request.speaker} (${request.text.length} characters, voice ${request.voiceId}). Add it in server/providers/live/speech.ts.`,
    );
  }
}
