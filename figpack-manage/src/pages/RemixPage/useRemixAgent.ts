import { useCallback, useMemo, useRef, useState } from "react";
import type { ChatState } from "./draftStore";
import { type AgentEvent, runAgentTurn } from "./remixAgent";
import type { RemixToolContext } from "./remixTools";
import {
  DEFAULT_LLM_MODEL,
  LlmError,
  type LlmMessage,
  createLlmClient,
} from "./llmApi";

type ChatItemBody =
  | { kind: "user"; text: string }
  | { kind: "assistant"; text: string }
  | {
      kind: "tool";
      name: string;
      args: string;
      result: string;
      isError: boolean;
    }
  | { kind: "turn-end"; costUsd: number; llmCalls: number }
  | { kind: "error"; text: string };

export type ChatItem = ChatItemBody & { id: number };

// State and actions of the remix chat
const useRemixAgent = (apiKey: string, toolContext: RemixToolContext) => {
  const [items, setItems] = useState<ChatItem[]>([]);
  const [running, setRunning] = useState(false);
  const [sessionCostUsd, setSessionCostUsd] = useState(0);
  const [model, setModel] = useState(DEFAULT_LLM_MODEL);
  const historyRef = useRef<LlmMessage[]>([]);
  const abortRef = useRef<AbortController | null>(null);
  const nextId = useRef(1);

  const addItem = useCallback((item: ChatItemBody) => {
    const id = nextId.current++;
    setItems((prev) => [...prev, { ...item, id }]);
  }, []);

  const sendMessage = useCallback(
    async (text: string) => {
      if (running || !text.trim()) return;
      const abort = new AbortController();
      abortRef.current = abort;
      setRunning(true);
      addItem({ kind: "user", text });
      let turnCost = 0;
      let llmCalls = 0;
      const onEvent = (event: AgentEvent) => {
        if (event.type === "llm-call") {
          turnCost += event.costUsd;
          llmCalls++;
          setSessionCostUsd((c) => c + event.costUsd);
        } else if (event.type === "assistant-text") {
          addItem({ kind: "assistant", text: event.text });
        } else {
          addItem({ kind: "tool", ...event });
        }
      };
      try {
        await runAgentTurn({
          history: historyRef.current,
          userText: text,
          model,
          callLlm: createLlmClient(apiKey),
          toolContext,
          onEvent,
          onHistory: (h) => {
            historyRef.current = h;
          },
          signal: abort.signal,
        });
      } catch (err) {
        if (abort.signal.aborted) {
          addItem({ kind: "error", text: "Canceled" });
        } else if (err instanceof LlmError && err.status === 401) {
          addItem({
            kind: "error",
            text: "Your API key was not accepted. Log in again and retry.",
          });
        } else {
          addItem({
            kind: "error",
            text: err instanceof Error ? err.message : String(err),
          });
        }
      } finally {
        addItem({ kind: "turn-end", costUsd: turnCost, llmCalls });
        abortRef.current = null;
        setRunning(false);
      }
    },
    [running, model, apiKey, toolContext, addItem],
  );

  const cancel = useCallback(() => abortRef.current?.abort(), []);

  // For saving and restoring drafts
  const getChatState = useCallback(
    (): ChatState => ({
      items,
      history: historyRef.current,
      sessionCostUsd,
      model,
    }),
    [items, sessionCostUsd, model],
  );
  const restoreChatState = useCallback((state: ChatState) => {
    historyRef.current = state.history;
    nextId.current = Math.max(0, ...state.items.map((i) => i.id)) + 1;
    setItems(state.items);
    setSessionCostUsd(state.sessionCostUsd);
    setModel(state.model);
  }, []);

  const newChat = useCallback(() => {
    if (running) return;
    historyRef.current = [];
    setItems([]);
  }, [running]);

  return useMemo(
    () => ({
      items,
      running,
      sessionCostUsd,
      model,
      setModel,
      sendMessage,
      cancel,
      newChat,
      getChatState,
      restoreChatState,
    }),
    [
      items,
      running,
      sessionCostUsd,
      model,
      sendMessage,
      cancel,
      newChat,
      getChatState,
      restoreChatState,
    ],
  );
};

export default useRemixAgent;
