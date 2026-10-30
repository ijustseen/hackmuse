import type { LlmClient, LlmCompletion } from "@/server/providers/types";

/**
 * Live model client. `complete` validates whatever `callChatModel` returns.
 * Paste the provider call into `callChatModel`. The stub payload on the request is unused.
 */
export class LiveLlmClient implements LlmClient {
  readonly name = "live";

  async complete<T>(request: LlmCompletion<T>): Promise<T> {
    const raw = await callChatModel({
      promptId: request.promptId,
      schemaName: request.schemaName,
      messages: request.messages,
    });
    return request.parse(raw);
  }
}

async function callChatModel(request: {
  promptId: string;
  schemaName: string;
  messages: LlmCompletion<unknown>["messages"];
}): Promise<unknown> {
  const apiKey = process.env.LLM_API_KEY;
  const baseUrl = process.env.LLM_BASE_URL;
  const model = process.env.LLM_MODEL;
  if (!apiKey || !baseUrl || !model) {
    throw new Error(
      "LLM_PROVIDER=live requires LLM_API_KEY, LLM_BASE_URL, and LLM_MODEL.",
    );
  }

  throw new Error(
    `No LLM call is implemented for prompt "${request.promptId}" (schema ${request.schemaName}, model ${model}). Add it in server/providers/live/llm.ts.`,
  );
}
