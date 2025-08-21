import React from "react";
import {
  Paper,
  IconButton,
  Tooltip,
  ClickAwayListener,
  Box,
} from "@mui/material";
import { ContentCopy } from "@mui/icons-material";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneLight } from "react-syntax-highlighter/dist/esm/styles/prism";
import homeContent from "./home.md?raw";

const CopyableCodeBlock: React.FC<{
  children: string;
  language: string;
}> = ({ children, language }) => {
  const [copied, setCopied] = React.useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(children);
    setCopied(true);
  };

  const handleClickAway = () => {
    setCopied(false);
  };

  return (
    <ClickAwayListener onClickAway={handleClickAway}>
      <Box
        sx={{
          position: "relative",
          "&:hover .copy-button": {
            opacity: 1,
          },
        }}
      >
        <SyntaxHighlighter style={oneLight} language={language} PreTag="div">
          {children}
        </SyntaxHighlighter>
        <Tooltip
          title={copied ? "Copied!" : "Copy to clipboard"}
          placement="top"
        >
          <IconButton
            className="copy-button"
            onClick={handleCopy}
            size="small"
            sx={{
              position: "absolute",
              top: 8,
              right: 8,
              opacity: 0,
              transition: "opacity 0.2s",
              backgroundColor: "rgba(255, 255, 255, 0.8)",
              "&:hover": {
                backgroundColor: "rgba(255, 255, 255, 0.9)",
              },
            }}
          >
            <ContentCopy fontSize="small" />
          </IconButton>
        </Tooltip>
      </Box>
    </ClickAwayListener>
  );
};

const HomePage = () => {
  return (
    <Paper sx={{ p: 4, borderRadius: 2 }}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          code(props) {
            const { children, className } = props;
            const match = /language-(\w+)/.exec(className || "");
            return match ? (
              <CopyableCodeBlock language={match[1]}>
                {String(children).replace(/\n$/, "")}
              </CopyableCodeBlock>
            ) : (
              <code className={className}>{children}</code>
            );
          },
        }}
      >
        {homeContent}
      </ReactMarkdown>
    </Paper>
  );
};

export default HomePage;
