import type { PageExcerpt, SearchHit } from "@/server/domain/types";
import { stubPage, stubSearchHits } from "@/server/providers/fixtures";
import { pauseForStub } from "@/server/providers/latency";
import type {
  HackathonSearchClient,
  LlmClient,
  LlmCompletion,
  PageReader,
  SearchQuery,
  SpeechRequest,
  SpeechSynthesizer,
} from "@/server/providers/types";

export class StubLlmClient implements LlmClient {
  readonly name = "stub";

  async complete<T>(request: LlmCompletion<T>): Promise<T> {
    await pauseForStub();
    return request.parse(request.stub());
  }
}

export class StubHackathonSearch implements HackathonSearchClient {
  readonly name = "stub";

  async search(query: SearchQuery): Promise<SearchHit[]> {
    await pauseForStub();
    void query;
    return stubSearchHits();
  }
}

export class StubSpeechSynthesizer implements SpeechSynthesizer {
  readonly name = "stub";

  async synthesize(request: SpeechRequest): Promise<{ audioUrl: null; error: null }> {
    await pauseForStub();
    void request;
    return { audioUrl: null, error: null };
  }
}

export class StubPageReader implements PageReader {
  readonly name = "stub";

  async read(url: string): Promise<PageExcerpt> {
    await pauseForStub();
    return stubPage(url);
  }
}
