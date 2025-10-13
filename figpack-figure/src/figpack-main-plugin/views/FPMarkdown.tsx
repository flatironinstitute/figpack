import React, { useEffect, useState } from "react";
import { ZarrGroup } from "../figpack-interface";
import ReactMarkdown from "react-markdown";

export const FPMarkdown: React.FC<{
  zarrGroup: ZarrGroup;
  width: number;
  height: number;
}> = ({ zarrGroup, width, height }) => {
  const [content, setContent] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const fontSize = zarrGroup.attrs["font_size"] || undefined;

  useEffect(() => {
    const loadContent = async () => {
      try {
        setLoading(true);
        setError(null);

        // Get the markdown content from the zarr array
        const data = await zarrGroup.getDatasetData("content_data", {});
        if (data === undefined) {
          throw new Error("Dataset 'content_data' not found");
        }

        // Convert the uint8 array back to string
        const uint8Array = new Uint8Array(data);
        const decoder = new TextDecoder("utf-8");
        const markdownContent = decoder.decode(uint8Array);
        setContent(markdownContent);
      } catch (err) {
        console.error("Failed to load markdown:", err);
        setError(
          `Failed to load markdown: ${err instanceof Error ? err.message : String(err)}`,
        );
      } finally {
        setLoading(false);
      }
    };

    loadContent();
  }, [zarrGroup]);

  if (error) {
    return (
      <div
        style={{
          width,
          height,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "#666",
          padding: "20px",
          textAlign: "center",
          backgroundColor: "#f5f5f5",
        }}
      >
        <div>
          <div style={{ marginBottom: "10px", fontWeight: "bold" }}>
            Markdown Load Error
          </div>
          <div style={{ fontSize: "14px" }}>{error}</div>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div
        style={{
          width,
          height,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "#666",
          backgroundColor: "#f5f5f5",
          fontSize,
        }}
      >
        Loading markdown...
      </div>
    );
  }

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
        fontSize,
      }}
    >
      <ReactMarkdown>{content}</ReactMarkdown>
    </div>
  );
};
