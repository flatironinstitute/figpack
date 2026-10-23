import type { LlmMessage } from "./llmApi";
import type { ChatItem } from "./useRemixAgent";

// Remix drafts, kept in this browser's IndexedDB (one per figure), so that
// a page refresh does not lose work

export type ChatState = {
  items: ChatItem[];
  history: LlmMessage[];
  sessionCostUsd: number;
  model: string;
};

export type RemixDraft = {
  figureUrl: string; // the URL of the remixed page; the key
  html: string;
  // The page in the figure directory this remix was last saved to, if any
  savedPath?: string;
  // The figure's index.html when the draft was started, to detect changes
  originalHtml: string;
  chat: ChatState;
  updatedAt: number;
};

const DB_NAME = "figpack-remix";
const STORE = "drafts";

const openDb = () =>
  new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => {
      request.result.createObjectStore(STORE, { keyPath: "figureUrl" });
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });

const withStore = async <T>(
  mode: IDBTransactionMode,
  fn: (store: IDBObjectStore) => IDBRequest<T>,
): Promise<T> => {
  const db = await openDb();
  try {
    return await new Promise<T>((resolve, reject) => {
      const request = fn(db.transaction(STORE, mode).objectStore(STORE));
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  } finally {
    db.close();
  }
};

export const loadDraft = (figureUrl: string) =>
  withStore<RemixDraft | undefined>("readonly", (s) => s.get(figureUrl));

export const saveDraft = (draft: RemixDraft) =>
  withStore("readwrite", (s) => s.put(draft));

export const deleteDraft = (figureUrl: string) =>
  withStore("readwrite", (s) => s.delete(figureUrl));
