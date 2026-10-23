import { Alert, Box, CircularProgress } from "@mui/material";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import ConsolePanel from "./ConsolePanel";
import HtmlEditor from "./HtmlEditor";
import RemixHeader from "./RemixHeader";
import RemixPreview from "./RemixPreview";
import { hasFigureSpec, toFigureDirUrl, toSrcdoc } from "./remixHtml";
import useConsoleLog from "./useConsoleLog";
import useFigureHtml from "./useFigureHtml";

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
  const [html, setHtml] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const consoleLog = useConsoleLog();
  const [consoleExpanded, setConsoleExpanded] = useState(true);

  useEffect(() => {
    setHtml(originalHtml);
  }, [originalHtml]);

  const srcdoc = useMemo(
    () => (html !== null && figureDirUrl ? toSrcdoc(html, figureDirUrl) : ""),
    [html, figureDirUrl],
  );

  const canRemix =
    !error && originalHtml !== null && hasFigureSpec(originalHtml);

  const handleReset = useCallback(() => setHtml(originalHtml), [originalHtml]);
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
            <HtmlEditor html={html} onChange={setHtml} />
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
