import { ContentCopy, Visibility, VisibilityOff } from "@mui/icons-material";
import { TextField, IconButton, InputAdornment, Tooltip } from "@mui/material";
import React, { useState } from "react";

interface ApiKeyFieldProps {
  value: string;
  onChange?: (value: string) => void;
  disabled?: boolean;
  placeholder?: string;
  label?: string;
  helperText?: string;
  autoFocus?: boolean;
  onKeyPress?: (event: React.KeyboardEvent<HTMLInputElement>) => void;
}

const COPY_STATES = {
  READY: "Copy to clipboard",
  SUCCESS: "Copied!",
  ERROR: "Failed to copy",
} as const;

const ApiKeyField: React.FC<ApiKeyFieldProps> = ({
  value,
  onChange,
  disabled = false,
  placeholder = "Enter your API key",
  label = "API Key",
  helperText,
  autoFocus = false,
  onKeyPress,
}) => {
  const [showApiKey, setShowApiKey] = useState<boolean>(false);
  const [copyState, setCopyState] = useState<keyof typeof COPY_STATES>("READY");

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopyState("SUCCESS");
      setTimeout(() => setCopyState("READY"), 2000);
    } catch (error) {
      console.error("Failed to copy to clipboard:", error);
      setCopyState("ERROR");
      setTimeout(() => setCopyState("READY"), 2000);
    }
  };

  return (
    <TextField
      label={label}
      type={showApiKey ? "text" : "password"}
      value={value}
      onChange={(e) => onChange?.(e.target.value)}
      fullWidth
      disabled={disabled}
      placeholder={placeholder}
      helperText={helperText}
      autoFocus={autoFocus}
      onKeyPress={onKeyPress}
      InputProps={{
        endAdornment: (
          <InputAdornment position="end">
            {value && (
              <Tooltip title={COPY_STATES[copyState]}>
                <IconButton onClick={handleCopy} edge="end" size="small">
                  <ContentCopy
                    color={copyState === "SUCCESS" ? "success" : undefined}
                  />
                </IconButton>
              </Tooltip>
            )}
            <IconButton onClick={() => setShowApiKey(!showApiKey)} edge="end">
              {showApiKey ? <VisibilityOff /> : <Visibility />}
            </IconButton>
          </InputAdornment>
        ),
      }}
    />
  );
};

export default ApiKeyField;
