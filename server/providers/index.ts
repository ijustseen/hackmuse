import { providerMode } from "@/server/config";
import { LiveLlmClient } from "@/server/providers/live/llm";
import { LivePageReader } from "@/server/providers/live/page";
import { LiveHackathonSearch } from "@/server/providers/live/search";
import { LiveSpeechSynthesizer } from "@/server/providers/live/speech";
import {
  StubHackathonSearch,
  StubLlmClient,
  StubPageReader,
  StubSpeechSynthesizer,
} from "@/server/providers/stub";
import type { Providers } from "@/server/providers/types";

/** Reads env at call time. `stub` is the default for every provider. */
export function createProviders(): Providers {
  return {
    llm: providerMode(process.env.LLM_PROVIDER) === "live" ? new LiveLlmClient() : new StubLlmClient(),
    search:
      providerMode(process.env.SEARCH_PROVIDER) === "live"
        ? new LiveHackathonSearch()
        : new StubHackathonSearch(),
    speech:
      providerMode(process.env.SPEECH_PROVIDER) === "live"
        ? new LiveSpeechSynthesizer()
        : new StubSpeechSynthesizer(),
    page: providerMode(process.env.PAGE_PROVIDER) === "live" ? new LivePageReader() : new StubPageReader(),
  };
}
