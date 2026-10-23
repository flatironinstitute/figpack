import { FIGPACK_API_BASE_URL } from "../../config";

// Client for the figpack LLM endpoint (POST /llm/chat-completions), which
// forwards an OpenAI-style chat completion request to OpenRouter and adds
// the cost of the call (figpack_cost_usd) to the response

export const LLM_MODELS = [
  "anthropic/claude-haiku-5.5",
  "openai/gpt-6-luna",
  "deepseek/deepseek-v4.1-flash-1017",
  "google/gemini-3.5-flash-lite",
  "qwen/qwen3.7-flash",
];
export const DEFAULT_LLM_MODEL = LLM_MODELS[0];

export type LlmToolCall = {
  id: string;
  type: "function";
  function: { name: string; arguments: string };
};

export type LlmContentPart =
  | { type: "text"; text: string }
  | { type: "image_url"; image_url: { url: string } };

export type LlmMessage =
  | { role: "system"; content: string }
  | { role: "user"; content: string | LlmContentPart[] }
  | { role: "assistant"; content: string | null; tool_calls?: LlmToolCall[] }
  | { role: "tool"; tool_call_id: string; content: string };

export type LlmTool = {
  type: "function";
  function: {
    name: string;
    description: string;
    parameters: object;
  };
};

export type ChatCompletionRequest = {
  model?: string;
  messages: LlmMessage[];
  tools?: LlmTool[];
  tool_choice?: "auto" | "none";
  max_tokens?: number;
  purpose?: string;
};

export type ChatCompletionResponse = {
  choices: {
    message: {
      content: string | null;
      tool_calls?: LlmToolCall[];
    };
    finish_reason?: string;
  }[];
  figpack_cost_usd?: number;
};

export class LlmError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

export type CallLlm = (
  request: ChatCompletionRequest,
  signal?: AbortSignal,
) => Promise<ChatCompletionResponse>;

export const createLlmClient = (apiKey: string): CallLlm => {
  // For development without the endpoint: VITE_LLM_MOCK=1 npm run dev
  if (import.meta.env.VITE_LLM_MOCK === "1") {
    return async (request, signal) => {
      const { mockChatCompletion } = await import("./mockLlm");
      return mockChatCompletion(request, signal);
    };
  }
  return async (request, signal) => {
    const response = await fetch(
      `${FIGPACK_API_BASE_URL}/llm/chat-completions`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-api-key": apiKey },
        body: JSON.stringify(request),
        signal,
      },
    );
    let data: unknown = null;
    try {
      data = await response.json();
    } catch {
      // handled below
    }
    if (!response.ok) {
      const message =
        (data as { message?: string } | null)?.message ||
        `HTTP ${response.status} ${response.statusText}`;
      throw new LlmError(message, response.status);
    }
    const result = data as ChatCompletionResponse | null;
    if (!result?.choices?.length) {
      throw new LlmError("Unexpected response from the LLM endpoint", 502);
    }
    return result;
  };
};
