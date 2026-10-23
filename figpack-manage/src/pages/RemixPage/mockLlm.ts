import type {
  ChatCompletionRequest,
  ChatCompletionResponse,
  LlmMessage,
  LlmToolCall,
} from "./llmApi";

// A scripted stand-in for the LLM endpoint, for developing the remix agent
// without it (VITE_LLM_MOCK=1). For each request it reads the page, changes
// the first "title" in the figure spec to the user's message, reads the
// console, and reports what it did.

let nextId = 1;

const toolCall = (name: string, args: object): LlmToolCall => ({
  id: `mock_${nextId++}`,
  type: "function",
  function: { name, arguments: JSON.stringify(args) },
});

const reply = (
  content: string | null,
  tool_calls?: LlmToolCall[],
): ChatCompletionResponse => ({
  choices: [{ message: { content, tool_calls } }],
  figpack_cost_usd: 0.00042,
});

const lastToolName = (messages: LlmMessage[], toolCallId: string) => {
  for (const m of messages) {
    if (m.role === "assistant") {
      const tc = m.tool_calls?.find((t) => t.id === toolCallId);
      if (tc) return tc.function.name;
    }
  }
  return null;
};

export const mockChatCompletion = async (
  request: ChatCompletionRequest,
  signal?: AbortSignal,
): Promise<ChatCompletionResponse> => {
  await new Promise((resolve) => setTimeout(resolve, 400));
  if (signal?.aborted) throw new DOMException("Aborted", "AbortError");
  const messages = request.messages;
  const last = messages[messages.length - 1];
  const userText =
    [...messages].reverse().find((m) => m.role === "user")?.content || "";

  if (last.role === "user") {
    return reply("I will look at the page first.", [
      toolCall("read_page", { offset: 1, limit: 400 }),
    ]);
  }
  if (last.role === "tool") {
    const name = lastToolName(messages, last.tool_call_id);
    if (name === "read_page") {
      const titleLine = last.content
        .split("\n")
        .map((l) => l.replace(/^\s*\d+\t/, ""))
        .find((l) => /"title": "/.test(l));
      if (!titleLine) return reply("I could not find a title in the spec.");
      const newLine = titleLine.replace(
        /"title": "[^"]*"/,
        `"title": ${JSON.stringify(userText.slice(0, 60))}`,
      );
      return reply(null, [
        toolCall("edit_page", { old_string: titleLine, new_string: newLine }),
      ]);
    }
    if (name === "edit_page") {
      return reply(null, [toolCall("read_console", {})]);
    }
    if (name === "read_console") {
      return reply(
        `(mock) I set the figure title to "${userText.slice(0, 60)}". The console after the reload:\n\n${last.content.slice(0, 500)}`,
      );
    }
  }
  return reply("(mock) Nothing to do.");
};
