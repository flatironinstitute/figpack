import { Box } from "@mui/material";
import React from "react";

interface HtmlEditorProps {
  html: string;
  onChange: (html: string) => void;
}

// A plain text editor for the remix page
const HtmlEditor: React.FC<HtmlEditorProps> = ({ html, onChange }) => (
  <Box
    component="textarea"
    value={html}
    onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
      onChange(e.target.value)
    }
    spellCheck={false}
    sx={{
      width: "100%",
      height: "100%",
      resize: "none",
      border: "none",
      outline: "none",
      p: 1,
      fontFamily: "monospace",
      fontSize: 12,
      lineHeight: 1.4,
      whiteSpace: "pre",
      overflow: "auto",
    }}
  />
);

export default HtmlEditor;
