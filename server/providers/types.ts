import type {
  PageExcerpt,
  PodcastClip,
  ProviderNames,
  SearchHit,
  SpeakerId,
  Submission,
} from "@/server/domain/types";

export type LlmMessage = {
  role: "system" | "user";
  content: string;
};

/** One model call. `stub` is ignored by the live client and required by the stub client. */
export type LlmCompletion<T> = {
  promptId: string;
  schemaName: string;
  messages: LlmMessage[];
  parse: (value: unknown) => T;
  stub: () => unknown;
};

export interface LlmClient {
  readonly name: string;
  complete<T>(request: LlmCompletion<T>): Promise<T>;
}

export type SearchQuery = Submission & {
  pageText: string;
};

export interface HackathonSearchClient {
  readonly name: string;
  search(query: SearchQuery): Promise<SearchHit[]>;
}

export type SpeechRequest = {
  text: string;
  speaker: SpeakerId;
  voiceId: string;
};

export interface SpeechSynthesizer {
  readonly name: string;
  synthesize(request: SpeechRequest): Promise<Pick<PodcastClip, "audioUrl" | "error">>;
}

export interface PageReader {
  readonly name: string;
  read(url: string): Promise<PageExcerpt>;
}

export type Providers = {
  llm: LlmClient;
  search: HackathonSearchClient;
  speech: SpeechSynthesizer;
  page: PageReader;
};

export function providerNames(providers: Providers): ProviderNames {
  return {
    llm: providers.llm.name,
    search: providers.search.name,
    speech: providers.speech.name,
    page: providers.page.name,
  };
}
