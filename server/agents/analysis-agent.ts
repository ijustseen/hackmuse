import { parseAnalysis } from "@/server/domain/parse";
import type { Analysis, Podcast, ResearchReport, Submission } from "@/server/domain/types";
import { analysisMessages } from "@/server/prompts/analysis";
import { stubAnalysis } from "@/server/providers/fixtures";
import type { LlmClient } from "@/server/providers/types";

/** Scores the idea after research and the podcast are both finished. */
export async function runAnalysisAgent(input: {
  submission: Submission;
  research: ResearchReport;
  podcast: Podcast;
  llm: LlmClient;
}): Promise<Analysis> {
  return input.llm.complete({
    promptId: "analysis.review",
    schemaName: "Analysis",
    messages: analysisMessages(input),
    parse: parseAnalysis,
    stub: () => stubAnalysis(input.submission.idea),
  });
}
