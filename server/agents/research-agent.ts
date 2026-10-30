import { parseResearchReport } from "@/server/domain/parse";
import type { ResearchReport, Submission } from "@/server/domain/types";
import { researchMessages } from "@/server/prompts/research";
import { stubResearch } from "@/server/providers/fixtures";
import type { HackathonSearchClient, LlmClient, PageReader } from "@/server/providers/types";

/** Finds similar hackathons, then asks the model to summarize only those hits. */
export async function runResearchAgent(input: {
  submission: Submission;
  llm: LlmClient;
  search: HackathonSearchClient;
  page: PageReader;
}): Promise<ResearchReport> {
  const page = await input.page.read(input.submission.hackathonUrl);
  const sources = await input.search.search({
    ...input.submission,
    pageText: page.text,
  });

  return input.llm.complete({
    promptId: "research.summarize",
    schemaName: "ResearchReport",
    messages: researchMessages({ submission: input.submission, page, sources }),
    parse: parseResearchReport,
    stub: () => stubResearch({ submission: input.submission, page, sources }),
  });
}
