import type { SearchHit } from "@/server/domain/types";
import type { HackathonSearchClient, SearchQuery } from "@/server/providers/types";

/**
 * Live search for similar hackathons and their winners.
 * Paste the search API call into `search`. Return hits only — the research
 * prompt turns them into the report, so the model cannot invent events
 * that were not retrieved.
 */
export class LiveHackathonSearch implements HackathonSearchClient {
  readonly name = "live";

  async search(query: SearchQuery): Promise<SearchHit[]> {
    const idea = query.idea.trim();
    throw new Error(
      `No hackathon search call is implemented (idea length ${idea.length}). Add it in server/providers/live/search.ts.`,
    );
  }
}
