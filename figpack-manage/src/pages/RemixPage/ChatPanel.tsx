import { AddComment, Send, Stop } from "@mui/icons-material";
import {
  Box,
  Checkbox,
  CircularProgress,
  FormControlLabel,
  IconButton,
  MenuItem,
  Select,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import React, { useEffect, useRef, useState } from "react";
import LoginButton from "../../components/LoginButton";
import ChatItemView from "./ChatItemView";
import { formatCost } from "./formatCost";
import { LLM_MODELS } from "./llmApi";
import type useRemixAgent from "./useRemixAgent";

interface ChatPanelProps {
  agent: ReturnType<typeof useRemixAgent>;
  isLoggedIn: boolean;
}

const ChatPanel: React.FC<ChatPanelProps> = ({ agent, isLoggedIn }) => {
  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  // Keep the newest messages in view
  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [agent.items, agent.running]);

  const handleSend = () => {
    if (!input.trim() || agent.running) return;
    agent.sendMessage(input.trim());
    setInput("");
  };

  return (
    <Box sx={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          gap: 1,
          px: 1,
          py: 0.5,
          borderBottom: "1px solid",
          borderColor: "divider",
        }}
      >
        <Select
          size="small"
          variant="standard"
          value={agent.model}
          onChange={(e) => agent.setModel(e.target.value)}
          disabled={agent.running}
          sx={{ fontSize: 13 }}
        >
          {LLM_MODELS.map((m) => (
            <MenuItem key={m} value={m} sx={{ fontSize: 13 }}>
              {m}
            </MenuItem>
          ))}
        </Select>
        <Tooltip title="Let the assistant take screenshots of the preview. Each screenshot adds to the cost.">
          <FormControlLabel
            control={
              <Checkbox
                size="small"
                checked={agent.allowScreenshots}
                onChange={(e) => agent.setAllowScreenshots(e.target.checked)}
                disabled={agent.running}
              />
            }
            label="Allow screenshots"
            slotProps={{ typography: { variant: "caption" } }}
            sx={{ ml: 1, mr: 0 }}
          />
        </Tooltip>
        <Box sx={{ flexGrow: 1 }} />
        <Tooltip title="Total cost of this session's LLM calls">
          <Typography variant="caption" color="text.secondary">
            Session: {formatCost(agent.sessionCostUsd)}
          </Typography>
        </Tooltip>
        <Tooltip title="New chat (keeps the page)">
          <span>
            <IconButton
              aria-label="New chat (keeps the page)"
              size="small"
              onClick={agent.newChat}
              disabled={agent.running || agent.items.length === 0}
            >
              <AddComment fontSize="small" />
            </IconButton>
          </span>
        </Tooltip>
      </Box>
      <Box
        ref={scrollRef}
        sx={{
          flex: 1,
          overflow: "auto",
          p: 1.5,
          display: "flex",
          flexDirection: "column",
          gap: 1,
        }}
      >
        {agent.items.length === 0 && (
          <Typography variant="body2" color="text.secondary">
            Describe how you would like to change the figure, for example
            &quot;make the layout horizontal&quot; or &quot;rename the first
            panel to Raw signal&quot;. The assistant edits this remix only; the
            original figure is not changed.
          </Typography>
        )}
        {agent.items.map((item) => (
          <ChatItemView key={item.id} item={item} />
        ))}
        {agent.running && <CircularProgress size={16} />}
      </Box>
      <Box sx={{ p: 1, borderTop: "1px solid", borderColor: "divider" }}>
        {isLoggedIn ? (
          <Box sx={{ display: "flex", gap: 1, alignItems: "flex-end" }}>
            <TextField
              fullWidth
              multiline
              maxRows={6}
              size="small"
              placeholder="Ask for a change..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
            />
            {agent.running ? (
              <Tooltip title="Stop">
                <IconButton
                  aria-label="Stop"
                  onClick={agent.cancel}
                  color="error"
                >
                  <Stop />
                </IconButton>
              </Tooltip>
            ) : (
              <IconButton
                aria-label="Send"
                onClick={handleSend}
                color="primary"
                disabled={!input.trim()}
              >
                <Send />
              </IconButton>
            )}
          </Box>
        ) : (
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <Typography variant="body2" color="text.secondary">
              Log in to use the assistant.
            </Typography>
            <Box sx={{ color: "primary.main" }}>
              <LoginButton />
            </Box>
          </Box>
        )}
      </Box>
    </Box>
  );
};

export default ChatPanel;
