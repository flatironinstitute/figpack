import React from "react";
import ReactMarkdown from "react-markdown";
import { RemoteH5Group } from "../remote-h5-file";

export const FPMarkdown: React.FC<{
  zarrGroup: RemoteH5Group;
  width: number;
  height: number;
}> = ({ zarrGroup, width, height }) => {
  const content = zarrGroup.attrs["content"] || "";

  return (
    <div
      style={{
        width,
        height,
        overflow: "auto",
        padding: "16px",
        boxSizing: "border-box",
        backgroundColor: "#ffffff",
        fontFamily:
          "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
      }}
    >
      <ReactMarkdown>{content}</ReactMarkdown>
    </div>
  );
};
