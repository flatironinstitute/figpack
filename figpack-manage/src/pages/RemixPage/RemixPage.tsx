import { Alert, Box, CircularProgress, Tab, Tabs } from "@mui/material";
import React, { useCallback, useMemo, useRef, useState } from "react";
import { useAuth } from "../../hooks/useAuth";
import ChatPanel from "./ChatPanel";
import ConsolePanel from "./ConsolePanel";
import HtmlEditor from "./HtmlEditor";
import RemixHeader from "./RemixHeader";
import RemixPreview, { type RemixPreviewHandle } from "./RemixPreview";
import {
  hasFigureSpec,
  toFigureDirUrl,
  toPageUrl,
  toSrcdoc,
} from "./remixHtml";
import { deleteDraft, saveDraft } from "./draftStore";
import { applyPatchToRemix } from "./applyPatch";
import ApplyPatchDialog, { type ApplyPatchState } from "./ApplyPatchDialog";
import ExportPatchDialog from "./ExportPatchDialog";
import SaveRemixDialog from "./SaveRemixDialog";
import useConsoleLog from "./useConsoleLog";
import type { RemixToolContext } from "./remixTools";
import useFigureHtml from "./useFigureHtml";
import useFigureOwner from "./useFigureOwner";
import useRemixAgent from "./useRemixAgent";
import useRemixDraft from "./useRemixDraft";

// How long Export patch waits for the preview to render the latest page
const EXPORT_WAIT_MS = 20000;

const RemixPage: React.FC = () => {
  const figureUrl = useMemo(() => {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get("figure") || "";
  }, []);
  const figureDirUrl = useMemo(
    () => (figureUrl ? toFigureDirUrl(figureUrl) : null),
    [figureUrl],
  );

  const pageUrl = useMemo(
    () => (figureUrl ? toPageUrl(figureUrl) : null),
    [figureUrl],
  );

  const { html: originalHtml, error } = useFigureHtml(pageUrl);
  const [html, setHtmlState] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const consoleLog = useConsoleLog();
  const [consoleExpanded, setConsoleExpanded] = useState(true);
  const [leftTab, setLeftTab] = useState<"chat" | "html">("chat");
  const { apiKey, isLoggedIn, user } = useAuth();
  const ownerEmail = useFigureOwner(figureDirUrl);
  const [savedPath, setSavedPath] = useState<string | null>(null);
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [exportDialogOpen, setExportDialogOpen] = useState(false);
  const [applyPatchState, setApplyPatchState] =
    useState<ApplyPatchState | null>(null);
  // The page before the last applied patch, for Undo
  const htmlBeforePatch = useRef<string | null>(null);

  // The page is also kept in a ref, so that consecutive agent edits within
  // one render see each other's changes
  const htmlRef = useRef<string | null>(null);
  const setHtml = useCallback((h: string | null) => {
    htmlRef.current = h;
    setHtmlState(h);
  }, []);

  const previewRef = useRef<RemixPreviewHandle>(null);
  const { getEntries, startReloadWait } = consoleLog;
  const toolContext: RemixToolContext = useMemo(
    () => ({
      getHtml: () => htmlRef.current ?? "",
      setHtml,
      getConsoleEntries: getEntries,
      waitForReload: () => startReloadWait()(),
      snapshotFigure: (maxWaitMs: number) => {
        if (!previewRef.current) {
          return Promise.reject(new Error("The preview is not available"));
        }
        return previewRef.current.capture(maxWaitMs);
      },
    }),
    [setHtml, getEntries, startReloadWait],
  );
  const getRenderedSpec = useCallback(() => {
    if (!previewRef.current) {
      return Promise.reject(new Error("The preview is not available"));
    }
    return previewRef.current.getRenderedSpec(EXPORT_WAIT_MS);
  }, []);
  const agent = useRemixAgent(apiKey, toolContext);

  const handleApplyPatch = useCallback(
    async (file: File) => {
      const current = htmlRef.current;
      if (current === null || !figureDirUrl) return;
      setApplyPatchState({ status: "working", fileName: file.name });
      try {
        const result = await applyPatchToRemix(
          await file.text(),
          await getRenderedSpec(),
          current,
          figureDirUrl,
        );
        htmlBeforePatch.current = current;
        setHtml(result.html);
        setApplyPatchState({ status: "done", fileName: file.name, result });
      } catch (err) {
        setApplyPatchState({
          status: "error",
          fileName: file.name,
          error: err instanceof Error ? err.message : String(err),
        });
      }
    },
    [figureDirUrl, getRenderedSpec, setHtml],
  );
  const handleUndoPatch = useCallback(() => {
    if (htmlBeforePatch.current !== null) setHtml(htmlBeforePatch.current);
    setApplyPatchState(null);
  }, [setHtml]);
  const draft = useRemixDraft({
    pageUrl,
    originalHtml,
    html,
    setHtml,
    savedPath,
    setSavedPath,
    agent,
  });

  // Users who do not own the figure save into a copy of it
  const saveAsCopy = !!user && !!ownerEmail && user.email !== ownerEmail;
  const saveDisabledReason = !isLoggedIn
    ? "Log in to save remixes"
    : !user || !ownerEmail
      ? "Only figures registered with figpack can be saved"
      : agent.running
        ? "Wait for the assistant to finish"
        : null;

  // After saving into a copy, the draft (page and chat) moves to the saved
  // remix in the copy, which then opens; there the user is the owner
  const { getChatState } = agent;
  const handleSavedAsCopy = useCallback(
    async (copyDirUrl: string, path: string) => {
      if (html === null) return;
      const copyPageUrl = copyDirUrl + path;
      try {
        await saveDraft({
          figureUrl: copyPageUrl,
          html,
          savedPath: path,
          originalHtml: html,
          chat: getChatState(),
          updatedAt: Date.now(),
        });
        if (pageUrl) await deleteDraft(pageUrl);
      } catch (err) {
        console.warn("Could not move the remix draft", err);
      }
      window.location.assign(
        `/remix?figure=${encodeURIComponent(copyPageUrl)}`,
      );
    },
    [html, pageUrl, getChatState],
  );

  const srcdoc = useMemo(
    () => (html !== null && figureDirUrl ? toSrcdoc(html, figureDirUrl) : ""),
    [html, figureDirUrl],
  );

  const canRemix =
    !error && originalHtml !== null && hasFigureSpec(originalHtml);

  const { markResetToOriginal } = draft;
  const handleReset = useCallback(() => {
    setHtml(originalHtml);
    markResetToOriginal();
  }, [originalHtml, setHtml, markResetToOriginal]);
  const handleReload = useCallback(() => setReloadKey((k) => k + 1), []);

  if (!figureUrl) {
    return <Alert severity="error">No figure specified</Alert>;
  }

  return (
    // Fixed to the window, since #root has a max width
    <Box
      sx={{
        position: "fixed",
        inset: 0,
        display: "flex",
        flexDirection: "column",
        bgcolor: "background.default",
      }}
    >
      <RemixHeader
        figureUrl={figureDirUrl ? figureDirUrl + "index.html" : figureUrl}
        pageUrl={pageUrl ?? figureUrl}
        showControls={canRemix}
        modified={html !== originalHtml}
        draftRestoredFrom={draft.status.restoredFrom}
        onReset={handleReset}
        onReload={handleReload}
        saveDisabledReason={saveDisabledReason}
        saveAsCopy={saveAsCopy}
        onSave={() => setSaveDialogOpen(true)}
        onExportPatch={() => setExportDialogOpen(true)}
        onApplyPatch={handleApplyPatch}
        applyPatchDisabledReason={
          agent.running ? "Wait for the assistant to finish" : null
        }
      />
      {applyPatchState && (
        <ApplyPatchDialog
          state={applyPatchState}
          onClose={() => setApplyPatchState(null)}
          onUndo={handleUndoPatch}
        />
      )}
      {exportDialogOpen && figureDirUrl && html !== null && (
        <ExportPatchDialog
          onClose={() => setExportDialogOpen(false)}
          getRenderedSpec={getRenderedSpec}
          html={html}
          figureDirUrl={figureDirUrl}
        />
      )}
      {saveDialogOpen && figureDirUrl && html !== null && (
        <SaveRemixDialog
          open
          onClose={() => setSaveDialogOpen(false)}
          apiKey={apiKey}
          figureDirUrl={figureDirUrl}
          html={html}
          savedPath={savedPath}
          onSaved={setSavedPath}
          asCopy={saveAsCopy}
          onSavedAsCopy={handleSavedAsCopy}
        />
      )}
      {error ? (
        <Alert severity="error" sx={{ m: 2 }}>
          {error}
        </Alert>
      ) : html === null || originalHtml === null || !draft.restored ? (
        <Box sx={{ display: "flex", justifyContent: "center", p: 4 }}>
          <CircularProgress />
        </Box>
      ) : !hasFigureSpec(originalHtml) ? (
        <Alert severity="warning" sx={{ m: 2 }}>
          This figure cannot be remixed because it was made with an older
          version of figpack. Figures made with a newer version include a figure
          spec in their index.html, which a remix needs.
        </Alert>
      ) : (
        <>
          {draft.status.originalChanged && (
            <Alert severity="info" onClose={draft.dismissOriginalChanged}>
              The figure&apos;s page has changed since this remix draft was
              started. Reset to original to start over from the current version.
            </Alert>
          )}
          {draft.status.saveError && (
            <Alert severity="warning">{draft.status.saveError}</Alert>
          )}
          <Box sx={{ flex: 1, minHeight: 0, display: "flex" }}>
            <Box
              sx={{
                width: "40%",
                minWidth: 320,
                borderRight: "1px solid",
                borderColor: "divider",
                display: "flex",
                flexDirection: "column",
              }}
            >
              <Tabs
                value={leftTab}
                onChange={(_e, v) => setLeftTab(v)}
                sx={{
                  minHeight: 36,
                  borderBottom: "1px solid",
                  borderColor: "divider",
                }}
              >
                <Tab value="chat" label="Chat" sx={{ minHeight: 36, py: 0 }} />
                <Tab value="html" label="HTML" sx={{ minHeight: 36, py: 0 }} />
              </Tabs>
              <Box sx={{ flex: 1, minHeight: 0 }}>
                {leftTab === "chat" ? (
                  <ChatPanel agent={agent} isLoggedIn={isLoggedIn} />
                ) : (
                  <HtmlEditor
                    html={html}
                    onChange={setHtml}
                    readOnly={agent.running}
                  />
                )}
              </Box>
            </Box>
            <Box
              sx={{
                flex: 1,
                minWidth: 0,
                display: "flex",
                flexDirection: "column",
              }}
            >
              <Box sx={{ flex: 1, minHeight: 0 }}>
                <RemixPreview
                  srcdoc={srcdoc}
                  reloadKey={reloadKey}
                  onConsoleMessage={consoleLog.addEntry}
                  previewRef={previewRef}
                />
              </Box>
              <ConsolePanel
                entries={consoleLog.entries}
                expanded={consoleExpanded}
                onToggle={() => setConsoleExpanded((x) => !x)}
                onClear={consoleLog.clear}
              />
            </Box>
          </Box>
        </>
      )}
    </Box>
  );
};

export default RemixPage;
