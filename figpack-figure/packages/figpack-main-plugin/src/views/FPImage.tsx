import React, { useEffect, useState } from "react";
import { ZarrGroup } from "../figpack-interface";

export const FPImage: React.FC<{
  zarrGroup: ZarrGroup;
  width: number;
  height: number;
}> = ({ zarrGroup, width, height }) => {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const errorMessage = zarrGroup.attrs["error"] || null;
  const imageFormat = zarrGroup.attrs["image_format"] || "Unknown";
  const dataSize = zarrGroup.attrs["data_size"] || 0;

  useEffect(() => {
    let imageUrl0: string | null = null;
    const loadImage = async () => {
      try {
        setLoading(true);
        setError(null);

        // Get the image data from the zarr array
        const data = await zarrGroup.file.getDatasetData(
          join(zarrGroup.path, "image_data"),
          {},
        );
        if (!data || data.length === 0) {
          throw new Error("Empty image data");
        }

        // Convert the uint8 array back to bytes and create a blob
        const uint8Array = new Uint8Array(data);

        // Determine MIME type based on format
        let mimeType = "application/octet-stream";
        if (imageFormat === "PNG") {
          mimeType = "image/png";
        } else if (imageFormat === "JPEG") {
          mimeType = "image/jpeg";
        }

        const blob = new Blob([uint8Array], { type: mimeType });
        imageUrl0 = URL.createObjectURL(blob);
        setImageUrl(imageUrl0);
      } catch (err) {
        console.error("Failed to load image:", err);
        setError(
          `Failed to load image: ${err instanceof Error ? err.message : String(err)}`,
        );
      } finally {
        setLoading(false);
      }
    };

    loadImage();

    // Cleanup function to revoke object URL
    return () => {
      if (imageUrl0) {
        URL.revokeObjectURL(imageUrl0);
      }
    };
  }, [zarrGroup, imageFormat]);

  if (errorMessage || error) {
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
            Image Load Error
          </div>
          <div style={{ fontSize: "14px" }}>{errorMessage || error}</div>
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
        Loading image...
      </div>
    );
  }

  if (!imageUrl) {
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
        No image data available
      </div>
    );
  }

  return (
    <div
      style={{
        width,
        height,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "#f5f5f5",
        overflow: "hidden",
      }}
    >
      <img
        src={imageUrl}
        alt="Figpack Image"
        style={{
          maxWidth: "100%",
          maxHeight: "100%",
          objectFit: "contain",
          display: "block",
        }}
        onError={() => {
          setError("Failed to display image");
        }}
      />
      {/* Optional: Show image info */}
      <div
        style={{
          position: "absolute",
          bottom: "5px",
          right: "5px",
          backgroundColor: "rgba(0, 0, 0, 0.7)",
          color: "white",
          padding: "2px 6px",
          fontSize: "10px",
          borderRadius: "3px",
          opacity: 0.8,
        }}
      >
        {imageFormat} ({Math.round(dataSize / 1024)}KB)
      </div>
    </div>
  );
};

const join = (path: string, name: string) => {
  if (path.endsWith("/")) {
    return path + name;
  } else {
    return path + "/" + name;
  }
};
