import { Alert, Box, CircularProgress, Tab, Tabs } from "@mui/material";
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useAuth } from "../../hooks/useAuth";
import ChatPanel from "./ChatPanel";
import ConsolePanel from "./ConsolePanel";
import HtmlEditor from "./HtmlEditor";
import RemixHeader from "./RemixHeader";
import RemixPreview from "./RemixPreview";
import { hasFigureSpec, toFigureDirUrl, toSrcdoc } from "./remixHtml";
import useConsoleLog from "./useConsoleLog";
import type { RemixToolContext } from "./remixTools";
import useFigureHtml from "./useFigureHtml";
import useRemixAgent from "./useRemixAgent";

const RemixPage: React.FC = () => {
  const figureUrl = useMemo(() => {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get("figure") || "";
  }, []);
  const figureDirUrl = useMemo(
    () => (figureUrl ? toFigureDirUrl(figureUrl) : null),
    [figureUrl],
  );

  const { html: originalHtml, error } = useFigureHtml(figureDirUrl);
  const [html, setHtmlState] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const consoleLog = useConsoleLog();
  const [consoleExpanded, setConsoleExpanded] = useState(true);
  const [leftTab, setLeftTab] = useState<"chat" | "html">("chat");
  const { apiKey, isLoggedIn } = useAuth();

  // The page is also kept in a ref, so that consecutive agent edits within
  // one render see each other's changes
  const htmlRef = useRef<string | null>(null);
  const setHtml = useCallback((h: string | null) => {
    htmlRef.current = h;
    setHtmlState(h);
  }, []);

  useEffect(() => {
    setHtml(originalHtml);
  }, [originalHtml, setHtml]);

  const { getEntries, startReloadWait } = consoleLog;
  const toolContext: RemixToolContext = useMemo(
    () => ({
      getHtml: () => htmlRef.current ?? "",
      setHtml,
      getConsoleEntries: getEntries,
      waitForReload: () => startReloadWait()(),
    }),
    [setHtml, getEntries, startReloadWait],
  );
  const agent = useRemixAgent(apiKey, toolContext);

  const srcdoc = useMemo(
    () => (html !== null && figureDirUrl ? toSrcdoc(html, figureDirUrl) : ""),
    [html, figureDirUrl],
  );

  const canRemix =
    !error && originalHtml !== null && hasFigureSpec(originalHtml);

  const handleReset = useCallback(
    () => setHtml(originalHtml),
    [originalHtml, setHtml],
  );
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
        figureUrl={figureUrl}
        showControls={canRemix}
        modified={html !== originalHtml}
        onReset={handleReset}
        onReload={handleReload}
      />
      {error ? (
        <Alert severity="error" sx={{ m: 2 }}>
          {error}
        </Alert>
      ) : html === null || originalHtml === null ? (
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
      )}
    </Box>
  );
};

export default RemixPage;
