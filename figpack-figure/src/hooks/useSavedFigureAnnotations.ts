/* eslint-disable @typescript-eslint/no-explicit-any */
import { useCallback, useEffect, useMemo, useState } from "react";
import { InMemoryFigureAnnotations } from "../main";

export interface SavedFigureAnnotations {
  items: { [key: string]: string };
}

export const useSavedFigureAnnotations = (
  figureUrl: string,
  headerIframeElement: HTMLIFrameElement | null,
) => {
  const [savedFigureAnnotations, setSavedFigureAnnotations] = useState<
    SavedFigureAnnotations | null | undefined
  >(undefined);
  const { figureAnnotationItems } = useFigureAnnotationItems();

  useEffect(() => {
    let canceled = false;
    const load = async () => {
      const figureUrlWithoutIndexHtml = figureUrl.endsWith("/index.html")
        ? figureUrl.slice(0, -"index.html".length)
        : figureUrl;
      const figureUrlWithoutTrailingSlash = figureUrlWithoutIndexHtml.endsWith(
        "/",
      )
        ? figureUrlWithoutIndexHtml.slice(0, -1)
        : figureUrlWithoutIndexHtml;
      const annotationsUrl =
        figureUrlWithoutTrailingSlash + "/annotations.json";
      const a = await loadRemoteFigureAnnotations(annotationsUrl);
      if (canceled) return;
      console.log("Loaded annotations:", a);
      setSavedFigureAnnotations(a);
      const x = (window as any).figpack_p1?.figureAnnotations;
      if (x && a) {
        x.setAllItems({ ...a.items });
      }
    };
    load();
    return () => {
      canceled = true;
    };
  }, [figureUrl]);

  const figureAnnotationsIsDirty = useMemo(() => {
    return !annotationItemsAreEqual(
      savedFigureAnnotations?.items || null,
      figureAnnotationItems,
    );
  }, [savedFigureAnnotations, figureAnnotationItems]);

  const revertFigureAnnotations = useCallback(() => {
    const x: InMemoryFigureAnnotations = (window as any).figpack_p1
      ?.figureAnnotations;
    if (!x) {
      console.warn("No figureAnnotations object found");
      return;
    }
    x.setAllItems(savedFigureAnnotations?.items || {});
  }, [savedFigureAnnotations]);

  const saveFigureAnnotations = useCallback(() => {
    const s = {
      ...{ ...(savedFigureAnnotations || {}) },
      items: figureAnnotationItems,
    };
    uploadFigureAnnotationsLocal(figureUrl, s, headerIframeElement)
      .then(() => {
        setSavedFigureAnnotations(s);
      })
      .catch((error) => {
        console.error("Failed to upload annotations:", error);
        // You might want to show a user-facing error message here
        // For now, we'll just log the error
      });
  }, [
    figureUrl,
    figureAnnotationItems,
    headerIframeElement,
    savedFigureAnnotations,
  ]);

  return {
    figureAnnotationsIsDirty,
    revertFigureAnnotations,
    saveFigureAnnotations,
  };
};

const loadRemoteFigureAnnotations = async (
  url: string,
): Promise<SavedFigureAnnotations | null> => {
  try {
    const response = await fetch(url);
    if (!response.ok) {
      console.warn(
        `Failed to load annotations from ${url}: ${response.statusText}`,
      );
      return null;
    }
    const data = await response.json();
    if (typeof data !== "object" || data === null || Array.isArray(data)) {
      console.warn(`Invalid annotations format from ${url}`);
      return null;
    }
    if (
      !data.items ||
      typeof data.items !== "object" ||
      Array.isArray(data.items)
    ) {
      console.warn(`Invalid annotations items format from ${url}`);
      return null;
    }
    return data;
  } catch (error) {
    console.error(`Error loading annotations from ${url}:`, error);
    return null;
  }
};

const useFigureAnnotationItems = (): {
  figureAnnotationItems: { [key: string]: string };
} => {
  const [figureAnnotationItems, setFigureAnnotationItems] = useState<{
    [key: string]: string;
  }>({});

  useEffect(() => {
    const x: InMemoryFigureAnnotations = (window as any).figpack_p1
      ?.figureAnnotations;
    if (!x) {
      setFigureAnnotationItems({});
      return;
    }
    setFigureAnnotationItems(x.getAllItems());
    const cancelSubscribe = x.onItemsChanged((items) => {
      setFigureAnnotationItems({ ...items }); // important to make a copy to trigger re-renders
    });
    return () => {
      cancelSubscribe();
    };
  }, []);

  return { figureAnnotationItems };
};

const annotationItemsAreEqual = (
  a: { [key: string]: string } | null,
  b: { [key: string]: string } | null | undefined,
): boolean => {
  if (a === b) return true;
  const aIsEmpty = !a || Object.keys(a).length === 0;
  const bIsEmpty = !b || Object.keys(b).length === 0;
  if (aIsEmpty && bIsEmpty) return true;
  if (aIsEmpty !== bIsEmpty) return false;
  if (!a || !b) return false;
  const aKeys = Object.keys(a);
  const bKeys = Object.keys(b);
  if (aKeys.length !== bKeys.length) return false;
  for (const key of aKeys) {
    if (a[key] !== b[key]) return false;
  }
  return true;
};

const uploadFigureAnnotationsLocal = async (
  figureUrl: string,
  annotations: SavedFigureAnnotations,
  headerIframeElement: HTMLIFrameElement | null,
): Promise<void> => {
  const figureUrlWithoutIndexHtml = figureUrl.endsWith("/index.html")
    ? figureUrl.slice(0, -"index.html".length)
    : figureUrl;
  const figureUrlWithoutTrailingSlash = figureUrlWithoutIndexHtml.endsWith("/")
    ? figureUrlWithoutIndexHtml.slice(0, -1)
    : figureUrlWithoutIndexHtml;
  const annotationsUrl = figureUrlWithoutTrailingSlash + "/annotations.json";

  const annotationsJson = JSON.stringify(annotations, null, 2);
  const files = [
    {
      url: annotationsUrl,
      headers: {
        "Content-Type": "application/json",
      },
      body: annotationsJson,
    },
  ];

  await figpackPutFigureFiles(files);
};

const figpackPutFigureFiles = async (
  files: { url: string; headers: any; body: string | ArrayBuffer }[],
) => {
  for (const file of files) {
    const response = await fetch(file.url, {
      method: "PUT",
      headers: file.headers,
      body: file.body,
    });
    if (!response.ok) {
      throw new Error(
        `Failed to upload file to ${file.url} (status: ${response.status})`,
      );
    }
  }
};

const uploadFigureAnnotations = async (
  figureUrl: string,
  annotations: SavedFigureAnnotations,
  headerIframeElement: HTMLIFrameElement | null,
): Promise<void> => {
  if (!headerIframeElement) {
    throw new Error("No iframe element available for uploading annotations");
  }

  return new Promise((resolve, reject) => {
    // Get the current figure URL
    const queryParams = new URLSearchParams(window.location.search);
    const figureUrl = queryParams.get("figure");

    let currentFigureUrl: string;
    if (figureUrl) {
      // Development mode: use the provided figure URL
      currentFigureUrl = figureUrl.endsWith("/index.html")
        ? figureUrl
        : figureUrl.endsWith("/")
          ? figureUrl
          : figureUrl + "/";
    } else {
      // Production mode: derive from current URL
      const baseUrl = window.location.href.split("?")[0];
      currentFigureUrl = baseUrl.endsWith("/index.html")
        ? baseUrl
        : baseUrl.endsWith("/")
          ? baseUrl
          : baseUrl + "/";
    }

    // Convert annotations to JSON file content
    const annotationsJson = JSON.stringify(annotations, null, 2);
    const files = { "annotations.json": annotationsJson };

    // Set up message listener for responses
    const handleMessage = (event: MessageEvent) => {
      // Validate origin for security
      if (!isValidOrigin(event.origin)) {
        return;
      }

      const message = event.data;
      if (!message || !message.type) {
        return;
      }

      switch (message.type) {
        case "UPLOAD_SUCCESS":
          window.removeEventListener("message", handleMessage);
          resolve();
          break;
        case "UPLOAD_ERROR":
          window.removeEventListener("message", handleMessage);
          reject(new Error(message.payload?.error || "Upload failed"));
          break;
        case "USER_CANCELLED":
          window.removeEventListener("message", handleMessage);
          reject(new Error("Upload cancelled by user"));
          break;
        // We can ignore UPLOAD_PROGRESS messages for now
      }
    };

    // Add message listener
    window.addEventListener("message", handleMessage);

    // Send upload request to iframe
    const uploadMessage = {
      type: "UPLOAD_REQUEST",
      payload: {
        figureUrl: currentFigureUrl,
        files: files,
      },
    };

    try {
      headerIframeElement.contentWindow?.postMessage(uploadMessage, "*");
    } catch (error) {
      window.removeEventListener("message", handleMessage);
      reject(new Error(`Failed to send upload request: ${error}`));
    }

    // Set a timeout to prevent hanging forever
    setTimeout(() => {
      window.removeEventListener("message", handleMessage);
      reject(new Error("Upload request timed out"));
    }, 30000); // 30 second timeout
  });
};

// Helper function to validate message origins for security
const isValidOrigin = (origin: string): boolean => {
  // Allow localhost for development
  if (
    origin.startsWith("http://localhost:") ||
    origin.startsWith("https://localhost:")
  ) {
    return true;
  }

  // Allow figpack manage domains
  if (origin === "https://manage.figpack.org") {
    return true;
  }

  // Allow any origin that ends with .figpack.org for subdomains
  if (origin.endsWith(".figpack.org")) {
    return true;
  }

  return false;
};
