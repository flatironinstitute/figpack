import React, { useState } from "react";
import {
  Paper,
  IconButton,
  Tooltip,
  ClickAwayListener,
  Box,
  Alert,
  Button,
  Stack,
} from "@mui/material";
import { ContentCopy, Login, PersonAdd } from "@mui/icons-material";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneLight } from "react-syntax-highlighter/dist/esm/styles/prism";
import homeContent from "./home.md?raw";
import { useAuth } from "../../hooks/useAuth";
import LoginDialog from "../../components/LoginDialog";

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
  const { isLoggedIn, user, login } = useAuth();
  const [loginDialogOpen, setLoginDialogOpen] = useState(false);

  const handleOpenLogin = () => {
    setLoginDialogOpen(true);
  };

  const handleCloseLogin = () => {
    setLoginDialogOpen(false);
  };

  const handleLogin = (apiKey: string) => {
    login(apiKey);
  };

  return (
    <Paper sx={{ p: 4, borderRadius: 2 }}>
      {/* Authentication Status Banner */}
      {isLoggedIn && user ? (
        <Alert severity="success" sx={{ mb: 3 }}>
          Logged in as <strong>{user.email}</strong>
        </Alert>
      ) : (
        <Alert
          severity="info"
          sx={{ mb: 3 }}
          action={
            <Stack direction="row" spacing={1}>
              <Button
                color="inherit"
                size="small"
                startIcon={<Login />}
                onClick={handleOpenLogin}
              >
                Login
              </Button>
              <Button
                color="inherit"
                size="small"
                startIcon={<PersonAdd />}
                onClick={handleOpenLogin}
              >
                Create Account
              </Button>
            </Stack>
          }
        >
          Not logged in.{" "}
          <strong>
            You only need an account if you want to upload figures for sharing.
          </strong>{" "}
          Local figure creation works without authentication.
        </Alert>
      )}

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
          iframe({ ...props }) {
            return (
              <iframe {...props} allow={props.allow || "clipboard-write"} />
            );
          },
        }}
      >
        {homeContent}
      </ReactMarkdown>

      {/* Login Dialog */}
      <LoginDialog
        open={loginDialogOpen}
        onClose={handleCloseLogin}
        onLogin={handleLogin}
      />
    </Paper>
  );
};

export default HomePage;
