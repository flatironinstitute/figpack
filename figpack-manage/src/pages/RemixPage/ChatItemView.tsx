import { Build, ErrorOutline } from "@mui/icons-material";
import { Box, Typography } from "@mui/material";
import React, { useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { formatCost } from "./formatCost";
import { describeToolCall } from "./remixTools";
import type { ChatItem } from "./useRemixAgent";

const ToolItem: React.FC<{
  item: Extract<ChatItem, { kind: "tool" }>;
}> = ({ item }) => {
  const [open, setOpen] = useState(false);
  return (
    <Box sx={{ fontSize: 12, color: "text.secondary" }}>
      <Box
        onClick={() => setOpen((x) => !x)}
        sx={{
          display: "flex",
          alignItems: "center",
          gap: 0.5,
          cursor: "pointer",
          color: item.isError ? "error.main" : undefined,
          "&:hover": { textDecoration: "underline" },
        }}
      >
        <Build sx={{ fontSize: 14 }} />
        {describeToolCall(item.name, item.args)}
        {item.isError && " (failed)"}
      </Box>
      {open && (
        <Box
          component="pre"
          sx={{
            m: 0,
            mt: 0.5,
            p: 1,
            bgcolor: "grey.50",
            border: "1px solid",
            borderColor: "grey.200",
            borderRadius: 1,
            maxHeight: 240,
            overflow: "auto",
            fontSize: 11,
            whiteSpace: "pre-wrap",
            wordBreak: "break-word",
          }}
        >
          {item.name === "edit_page" && formatEditArgs(item.args)}
          {item.result}
        </Box>
      )}
    </Box>
  );
};

const formatEditArgs = (argsJson: string) => {
  try {
    const args = JSON.parse(argsJson);
    return `--- old\n${args.old_string}\n+++ new\n${args.new_string}\n\n`;
  } catch {
    return "";
  }
};

const ChatItemView: React.FC<{ item: ChatItem }> = ({ item }) => {
  switch (item.kind) {
    case "user":
      return (
        <Box
          sx={{
            alignSelf: "flex-end",
            maxWidth: "85%",
            bgcolor: "primary.main",
            color: "white",
            px: 1.5,
            py: 1,
            borderRadius: 2,
            whiteSpace: "pre-wrap",
            fontSize: 14,
          }}
        >
          {item.text}
        </Box>
      );
    case "assistant":
      return (
        <Box
          sx={{
            fontSize: 14,
            "& p": { my: 0.5 },
            "& pre": { overflow: "auto", bgcolor: "grey.50", p: 1 },
          }}
        >
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{item.text}</ReactMarkdown>
        </Box>
      );
    case "tool":
      return <ToolItem item={item} />;
    case "error":
      return (
        <Box
          sx={{
            display: "flex",
            gap: 0.5,
            alignItems: "center",
            color: "error.main",
            fontSize: 13,
          }}
        >
          <ErrorOutline sx={{ fontSize: 16 }} />
          {item.text}
        </Box>
      );
    case "turn-end":
      return (
        <Typography
          variant="caption"
          color="text.disabled"
          sx={{ alignSelf: "flex-end" }}
        >
          {formatCost(item.costUsd)} ({item.llmCalls} LLM call
          {item.llmCalls === 1 ? "" : "s"})
        </Typography>
      );
  }
};

export default ChatItemView;
