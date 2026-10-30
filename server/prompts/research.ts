import { limits } from "@/server/config";
import type { LlmMessage } from "@/server/providers/types";
import type { PageExcerpt, SearchHit, Submission } from "@/server/domain/types";
import { clip, submissionBlock } from "@/server/prompts/text";

/**
 * Prompt slot `research.summarize`.
 * Replace the system text when the real research prompt is ready.
 * The model may only describe hackathons present in `sources`.
 */
export function researchMessages(input: {
  submission: Submission;
  page: PageExcerpt;
  sources: SearchHit[];
}): LlmMessage[] {
  return [
    {
      role: "system",
      content: [
        "You summarize what tends to win at hackathons similar to the one the participant is entering.",
        "Use only the search hits and the page excerpt. Do not invent events, winners, or prizes.",
        "If a hit has no winner, say that the winner is unknown.",
        "Reply with JSON only, matching ResearchReport: summary, patterns (1-8 strings), hackathons (name, url, whySimilar, winners[{name, project, whyItWon}]), sources, page.",
        "patterns are the recurring reasons winners placed, written as short statements.",
        "Write in the same language as the participant's idea.",
      ].join(" "),
    },
    {
      role: "user",
      content: [
        submissionBlock(input.submission),
        `Page excerpt:\n${clip(input.page.text, limits.pageTextInPrompt)}`,
        `Search hits:\n${JSON.stringify(input.sources, null, 2)}`,
      ].join("\n\n"),
    },
  ];
}
