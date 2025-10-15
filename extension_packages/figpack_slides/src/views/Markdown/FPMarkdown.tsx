import React, { useEffect, useMemo, useState } from "react";
import {
  ZarrGroup,
  FragmentContextValue,
  FPViewContexts,
} from "../../figpack-interface";
import MarkdownContent from "./MarkdownContent";

export const FPMarkdown: React.FC<{
  zarrGroup: ZarrGroup;
  width: number;
  height: number;
  contexts: FPViewContexts;
}> = ({ zarrGroup, width, height, contexts }) => {
  const [content, setContent] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const fontSize = zarrGroup.attrs["font_size"] || undefined;

  const fragments: string[] = useMemo(
    () => getFragmentsForContent(content),
    [content],
  );

  // Get fragment context from contexts prop (with fallback for when not in presentation mode)
  const fragmentContext = contexts.fragment as FragmentContextValue | undefined;
  const currentFragmentIndex = fragmentContext?.currentFragmentIndex ?? 0;
  const isPresentationMode = fragmentContext?.isPresentationMode ?? false;
  const registerNumFragments = useMemo(
    () => fragmentContext?.registerNumFragments ?? (() => {}),
    [fragmentContext],
  );

  useEffect(() => {
    if (fragments.length > 1) {
      registerNumFragments(fragments.length);
    }
    return () => {
      if (fragments.length > 1) {
        registerNumFragments(1);
      }
    };
  }, [fragments.length, registerNumFragments]);

  const visibleContent = useMemo(() => {
    if (isPresentationMode) {
      return fragments.slice(0, currentFragmentIndex + 1).join("\n");
    }
    return fragments.join("\n");
  }, [fragments, isPresentationMode, currentFragmentIndex]);

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
      <MarkdownContent content={visibleContent} />
    </div>
  );
};

const getFragmentsForContent = (content: string): string[] => {
  /*
   * Split the content into fragments. For example
   * Some content
   *
   * ::: incremental
   * * bullet 1
   * * bullet 2
   * :::
   *
   * More content
   *
   * This would be split into 4 fragments
   */
  const lines = content.split("\n");
  const fragments: string[] = [];
  let currentFragmentLines: string[] = [];
  let inIncremental = false;

  const pushCurrentFragment = () => {
    if (currentFragmentLines.length > 0) {
      fragments.push(currentFragmentLines.join("\n"));
      currentFragmentLines = [];
    }
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.trim() === "::: incremental") {
      // Start of incremental section
      pushCurrentFragment();
      inIncremental = true;
    } else if (line.trim() === ":::") {
      // End of incremental section
      pushCurrentFragment();
      inIncremental = false;
    } else if (
      inIncremental &&
      (line.startsWith("* ") || line.startsWith("- "))
    ) {
      // Bullet point in incremental section
      pushCurrentFragment();
      currentFragmentLines.push(line);
      pushCurrentFragment();
    } else {
      // Regular line
      currentFragmentLines.push(line);
    }
  }
  pushCurrentFragment();

  return fragments;
};
