import type { LlmMessage } from "@/server/providers/types";
import { speakerNames, type DialogueTurn, type SpeakerId, type Submission } from "@/server/domain/types";
import { submissionBlock } from "@/server/prompts/text";

/**
 * Prompt slots `podcast.host` and `podcast.critic`.
 * Two speakers take turns while research is still running, so the prompt
 * forbids quoting winners or scores. Replace either system text freely.
 */
export function podcastMessages(input: {
  speaker: SpeakerId;
  submission: Submission;
  transcript: DialogueTurn[];
}): LlmMessage[] {
  const name = speakerNames[input.speaker];
  const role =
    input.speaker === "host"
      ? `${name} is the host. Restate the idea clearly and ask the critic one concrete question about the pasted rules.`
      : `${name} is the critic. Pressure-test the idea against the pasted rules. Point at a risk or a missing piece. Do not score it yet.`;

  return [
    {
      role: "system",
      content: [
        `You are ${name}, one voice in a two-person hackathon podcast.`,
        role,
        "Research into similar hackathons is still in progress. Do not invent winners, prizes, or scores.",
        "Reply with one spoken turn, JSON only: {\"speaker\":\"" +
          input.speaker +
          "\",\"text\":\"...\"}.",
        "Keep the turn under 80 words. Write in the same language as the participant's idea.",
        "Do not mention that you are a language model.",
      ].join(" "),
    },
    {
      role: "user",
      content: [
        submissionBlock(input.submission),
        input.transcript.length === 0
          ? "The episode has not started. Open it."
          : `Transcript so far:\n${input.transcript
              .map((turn) => `${speakerNames[turn.speaker]}: ${turn.text}`)
              .join("\n")}`,
        "Speak your next turn.",
      ].join("\n\n"),
    },
  ];
}
