import React, { useEffect, useState } from "react";
import { ZarrGroup } from "../figpack-interface";

export const FPIframe: React.FC<{
  zarrGroup: ZarrGroup;
  width: number;
  height: number;
}> = ({ zarrGroup, width, height }) => {
  const [url, setUrl] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadUrl = async () => {
      try {
        setLoading(true);
        setError(null);

        // Get the URL from the zarr array
        const data = await zarrGroup.getDatasetData("url_data", {});
        if (!data || data.length === 0) {
          throw new Error("Empty URL data");
        }

        // Convert the uint8 array back to string
        const uint8Array = new Uint8Array(data);
        const decoder = new TextDecoder("utf-8");
        const urlString = decoder.decode(uint8Array);
        setUrl(urlString);
      } catch (err) {
        console.error("Failed to load iframe URL:", err);
        setError(
          `Failed to load iframe URL: ${err instanceof Error ? err.message : String(err)}`,
        );
      } finally {
        setLoading(false);
      }
    };

    loadUrl();
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
            Iframe Load Error
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
        }}
      >
        Loading iframe...
      </div>
    );
  }

  return (
    <iframe
      src={url}
      width={width}
      height={height}
      style={{
        border: "none",
        display: "block",
      }}
      title="Figpack Iframe"
    />
  );
};
