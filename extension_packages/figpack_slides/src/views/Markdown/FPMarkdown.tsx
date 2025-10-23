/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { ZarrGroup, FPViewContexts } from "../../figpack-interface";
import EditableMarkdownContent from "./EditableMarkdownContent";
import { SlideEditAction } from "../Slide/SlideTitle";

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

  // Extract editable from contexts
  const editable = useMemo(() => {
    return (contexts.editable as any) ?? false;
  }, [contexts]);

  const { slideIndex, sectionIndex } = useMemo(() => {
    const si = zarrGroup.attrs["slide_index"] as number | undefined;
    const sei = zarrGroup.attrs["section_index"] as number | undefined;
    return {
      slideIndex: si,
      sectionIndex: sei,
    };
  }, [zarrGroup]);

  const onEditMarkdown = useCallback(
    (newContent: string) => {
      const onEditSlide = contexts.onEditSlide as any | undefined;
      if (!onEditSlide) return;
      if (slideIndex === undefined || sectionIndex === undefined) return;
      const action: SlideEditAction = {
        type: "edit_markdown",
        sectionIndex: sectionIndex,
        content: newContent,
      };
      onEditSlide(slideIndex, action);
    },
    [contexts, slideIndex, sectionIndex],
  );

  const [slideEdits, setSlideEdits] = useState<
    Map<number, SlideEditAction[]> | undefined
  >(undefined);
  const updateSlideEdits = useCallback(() => {
    setSlideEdits(contexts.slideEdits as any | undefined);
  }, [contexts]);
  useEffect(() => {
    const cancel = (contexts.onSlideEditsChanged as any)?.(updateSlideEdits);
    updateSlideEdits();
    return () => {
      if (cancel) cancel();
    };
  }, [contexts, updateSlideEdits]);

  const editedContent = useMemo(() => {
    if (!slideEdits || sectionIndex === undefined || slideIndex === undefined) {
      return content;
    }
    const actions = slideEdits.get(slideIndex);
    if (!actions) {
      return content;
    }
    let modifiedContent = content;
    for (const action of actions) {
      if (
        action.type === "edit_markdown" &&
        action.sectionIndex === sectionIndex
      ) {
        modifiedContent = action.content;
      }
    }
    return modifiedContent;
  }, [content, slideEdits, sectionIndex, slideIndex]);

  const fragments: string[] = useMemo(
    () => getFragmentsForContent(editedContent),
    [editedContent],
  );

  // Get fragment context from contexts prop (with fallback for when not in presentation mode)
  const fragmentContext = contexts.fragment as any | undefined;
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
      <EditableMarkdownContent
        content={visibleContent}
        editable={editable}
        onEdit={onEditMarkdown}
      />
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
