import { useEffect, useRef, useState } from "react";
import { deleteDraft, loadDraft, saveDraft } from "./draftStore";
import type useRemixAgent from "./useRemixAgent";

const SAVE_DELAY_MS = 500;

export type DraftStatus = {
  // Time of the draft that was restored when the page opened
  restoredFrom: number | null;
  // The figure's index.html changed since the restored draft was started
  originalChanged: boolean;
  saveError: string | null;
};

// Restores the remix draft of a figure once the original page has loaded,
// then saves the page and chat as they change. A draft that matches the
// original page and has no chat is deleted.
const useRemixDraft = (opts: {
  figureDirUrl: string | null;
  originalHtml: string | null;
  html: string | null;
  setHtml: (html: string) => void;
  agent: ReturnType<typeof useRemixAgent>;
}) => {
  const { figureDirUrl, originalHtml, html, setHtml, agent } = opts;
  const [restored, setRestored] = useState(false);
  const [status, setStatus] = useState<DraftStatus>({
    restoredFrom: null,
    originalChanged: false,
    saveError: null,
  });
  // The original page the current draft is based on
  const draftOriginalRef = useRef<string | null>(null);
  // What was last restored or saved, to skip saving it again
  const lastSavedRef = useRef<{ html: string; items: unknown } | null>(null);

  const { restoreChatState, getChatState } = agent;

  useEffect(() => {
    if (!figureDirUrl || originalHtml === null || restored) return;
    let canceled = false;
    (async () => {
      let draft = undefined;
      try {
        draft = await loadDraft(figureDirUrl);
      } catch (err) {
        console.warn("Could not load remix draft", err);
      }
      if (canceled) return;
      if (draft) {
        draftOriginalRef.current = draft.originalHtml;
        lastSavedRef.current = { html: draft.html, items: draft.chat.items };
        setHtml(draft.html);
        restoreChatState(draft.chat);
        setStatus((s) => ({
          ...s,
          restoredFrom: draft.updatedAt,
          originalChanged: draft.originalHtml !== originalHtml,
        }));
      } else {
        draftOriginalRef.current = originalHtml;
        setHtml(originalHtml);
      }
      setRestored(true);
    })();
    return () => {
      canceled = true;
    };
  }, [figureDirUrl, originalHtml, restored, setHtml, restoreChatState]);

  useEffect(() => {
    if (!restored || !figureDirUrl || html === null || originalHtml === null) {
      return;
    }
    const timer = setTimeout(async () => {
      const chat = getChatState();
      const last = lastSavedRef.current;
      if (last && last.html === html && last.items === chat.items) return;
      lastSavedRef.current = { html, items: chat.items };
      try {
        if (html === originalHtml && chat.items.length === 0) {
          // Nothing to keep; a later draft starts from the current original
          draftOriginalRef.current = originalHtml;
          await deleteDraft(figureDirUrl);
        } else {
          await saveDraft({
            figureUrl: figureDirUrl,
            html,
            originalHtml: draftOriginalRef.current ?? originalHtml,
            chat,
            updatedAt: Date.now(),
          });
        }
        setStatus((s) => (s.saveError ? { ...s, saveError: null } : s));
      } catch (err) {
        setStatus((s) => ({
          ...s,
          saveError: `Could not save the draft in this browser: ${err instanceof Error ? err.message : err}`,
        }));
      }
    }, SAVE_DELAY_MS);
    return () => clearTimeout(timer);
  }, [restored, figureDirUrl, html, originalHtml, getChatState]);

  const dismissOriginalChanged = () =>
    setStatus((s) => ({ ...s, originalChanged: false }));

  // After the page is reset to the original, the draft is based on the
  // current original
  const markResetToOriginal = () => {
    draftOriginalRef.current = originalHtml;
    dismissOriginalChanged();
  };

  return { restored, status, dismissOriginalChanged, markResetToOriginal };
};

export default useRemixDraft;
