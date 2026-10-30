import { runAnalysisAgent } from "@/server/agents/analysis-agent";
import { runPodcastAgent } from "@/server/agents/podcast-agent";
import { runResearchAgent } from "@/server/agents/research-agent";
import { evaluationStore } from "@/server/jobs/store";
import { createProviders } from "@/server/providers/index";
import type { Providers } from "@/server/providers/types";

/**
 * Research and the podcast run together. The review starts only after both finish.
 * A speech failure keeps the episode going; a research or script failure stops the job.
 */
export async function runEvaluation(
  id: string,
  providers: Providers = createProviders(),
): Promise<void> {
  const current = evaluationStore.get(id);
  if (!current || current.status !== "queued") return;

  try {
    evaluationStore.markStage(
      id,
      "research_and_podcast",
      "Looking for similar hackathons and recording the podcast.",
    );

    const submission = current.submission;
    const researchPromise = runResearchAgent({
      submission,
      llm: providers.llm,
      search: providers.search,
      page: providers.page,
    }).then((report) => {
      evaluationStore.setResearch(id, report);
      return report;
    });
    const podcastPromise = runPodcastAgent({
      submission,
      llm: providers.llm,
      speech: providers.speech,
      hooks: {
        onTitle: (title) => evaluationStore.setPodcastTitle(id, title),
        onTurn: (index, turn) => evaluationStore.addTurn(id, index, turn),
        onClip: (clip) => evaluationStore.addClip(id, clip),
      },
    });

    const [researchResult, podcastResult] = await Promise.allSettled([
      researchPromise,
      podcastPromise,
    ]);

    if (researchResult.status === "rejected" || podcastResult.status === "rejected") {
      const failures = [researchResult, podcastResult].flatMap((result) =>
        result.status === "rejected" ? [errorMessage(result.reason)] : [],
      );
      throw new Error(failures.join(" "));
    }

    evaluationStore.markStage(id, "analysis", "Scoring the idea.");

    const analysis = await runAnalysisAgent({
      submission,
      research: researchResult.value,
      podcast: podcastResult.value,
      llm: providers.llm,
    });
    evaluationStore.complete(id, analysis);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Evaluation failed.";
    console.error(`Evaluation ${id} failed`, error);
    evaluationStore.fail(id, message);
  }
}

function errorMessage(reason: unknown): string {
  return reason instanceof Error ? reason.message : "The parallel stage failed.";
}
