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
import SaveRemixDialog from "./SaveRemixDialog";
import useConsoleLog from "./useConsoleLog";
import type { RemixToolContext } from "./remixTools";
import useFigureHtml from "./useFigureHtml";
import useFigureOwner from "./useFigureOwner";
import useRemixAgent from "./useRemixAgent";
import useRemixDraft from "./useRemixDraft";

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
  const agent = useRemixAgent(apiKey, toolContext);
  const draft = useRemixDraft({
    pageUrl,
    originalHtml,
    html,
    setHtml,
    savedPath,
    setSavedPath,
    agent,
  });

  const saveDisabledReason = !isLoggedIn
    ? "Log in as the figure's owner to save remixes"
    : !user || !ownerEmail || user.email !== ownerEmail
      ? "Only the figure's owner can save remixes"
      : agent.running
        ? "Wait for the assistant to finish"
        : null;

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
        onSave={() => setSaveDialogOpen(true)}
      />
      {saveDialogOpen && figureDirUrl && html !== null && (
        <SaveRemixDialog
          open
          onClose={() => setSaveDialogOpen(false)}
          apiKey={apiKey}
          figureDirUrl={figureDirUrl}
          html={html}
          savedPath={savedPath}
          onSaved={setSavedPath}
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
