import type { LlmMessage } from "@/server/providers/types";
import type { Podcast, ResearchReport, Submission } from "@/server/domain/types";
import { speakerNames } from "@/server/domain/types";
import { submissionBlock } from "@/server/prompts/text";

/**
 * Prompt slot `analysis.review`.
 * The model chooses the criteria. Scores are integers from 0 to 100.
 * Replace the system text when the real rubric prompt is ready.
 */
export function analysisMessages(input: {
  submission: Submission;
  research: ResearchReport;
  podcast: Podcast;
}): LlmMessage[] {
  const transcript = input.podcast.turns
    .map((turn) => `${speakerNames[turn.speaker]}: ${turn.text}`)
    .join("\n");

  return [
    {
      role: "system",
      content: [
        "You review a hackathon idea after seeing similar events and a short podcast about the idea.",
        "Choose 3 to 6 criteria yourself from the pasted rules and from what the similar events rewarded. Do not reuse a fixed rubric.",
        "Reply with JSON only, matching Analysis: summary, pros (1-8), cons (1-8), overallScore (integer 0-100), criteria[{id, label, score, rationale}].",
        "id is kebab-case. score is an integer 0-100. overallScore is your judgement, not necessarily the average.",
        "Ground pros and cons in the idea, the pasted rules, and the research. Ignore placeholder text that says the providers are stubs.",
        "Write in the same language as the participant's idea.",
      ].join(" "),
    },
    {
      role: "user",
      content: [
        submissionBlock(input.submission),
        `Research:\n${JSON.stringify(input.research, null, 2)}`,
        `Podcast title: ${input.podcast.title}`,
        `Transcript:\n${transcript}`,
      ].join("\n\n"),
    },
  ];
}
