import React from "react";
import ReactMarkdown from "react-markdown";
import { ZarrGroup } from "../remote-zarr/RemoteZarr";

export const FPMarkdown: React.FC<{
  zarrGroup: ZarrGroup;
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
