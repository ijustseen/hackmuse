import { limits, voiceIdFor } from "@/server/config";
import { parseDialogueTurn } from "@/server/domain/parse";
import {
  type DialogueTurn,
  type Podcast,
  type PodcastClip,
  type SpeakerId,
  type Submission,
} from "@/server/domain/types";
import { podcastMessages } from "@/server/prompts/podcast";
import { clip } from "@/server/prompts/text";
import { stubDialogueTurn, stubPodcastTitle } from "@/server/providers/fixtures";
import type { LlmClient, SpeechSynthesizer } from "@/server/providers/types";

export type PodcastHooks = {
  onTitle: (title: string) => void;
  onTurn: (index: number, turn: DialogueTurn) => void;
  onClip: (clip: PodcastClip) => void;
};

/**
 * Host and critic take turns. Each turn is spoken through the speech provider
 * before the next line, so audio can stream while research is still running.
 */
export async function runPodcastAgent(input: {
  submission: Submission;
  llm: LlmClient;
  speech: SpeechSynthesizer;
  hooks: PodcastHooks;
}): Promise<Podcast> {
  const title =
    input.llm.name === "stub"
      ? stubPodcastTitle(input.submission.idea)
      : clip(input.submission.idea, 60);
  input.hooks.onTitle(title);

  const turns: DialogueTurn[] = [];
  const clips: PodcastClip[] = [];

  for (let index = 0; index < limits.podcastTurns; index += 1) {
    const speaker: SpeakerId = index % 2 === 0 ? "host" : "critic";
    const turn = await input.llm.complete({
      promptId: speaker === "host" ? "podcast.host" : "podcast.critic",
      schemaName: "DialogueTurn",
      messages: podcastMessages({
        speaker,
        submission: input.submission,
        transcript: turns,
      }),
      parse: (value) => parseDialogueTurn(value, speaker),
      stub: () => stubDialogueTurn(index, input.submission.idea),
    });

    turns.push(turn);
    input.hooks.onTurn(index, turn);

    const voiceId = voiceIdFor(speaker);
    const spoken = await speakTurn(input.speech, { text: turn.text, speaker, voiceId });
    const clip: PodcastClip = {
      index,
      speaker,
      text: turn.text,
      voiceId,
      audioUrl: spoken.audioUrl,
      error: spoken.error,
    };
    clips.push(clip);
    input.hooks.onClip(clip);
  }

  return { title, turns, clips };
}

async function speakTurn(
  speech: SpeechSynthesizer,
  request: { text: string; speaker: SpeakerId; voiceId: string },
): Promise<{ audioUrl: string | null; error: string | null }> {
  try {
    return await speech.synthesize(request);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Speech synthesis failed.";
    return { audioUrl: null, error: message };
  }
}
