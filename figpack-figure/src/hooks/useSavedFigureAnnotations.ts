/* eslint-disable @typescript-eslint/no-explicit-any */
import { useCallback, useEffect, useMemo, useState } from "react";
import { InMemoryFigureAnnotations } from "../main";
import { PutFigureFilesInterface } from "src/FPHeader/FPHeader";

export interface SavedFigureAnnotations {
  items: { [key: string]: string };
}

export const useSavedFigureAnnotations = (
  figureUrl: string,
  putFigureFilesInterface: PutFigureFilesInterface | null,
) => {
  const [savedFigureAnnotations, setSavedFigureAnnotations] = useState<
    SavedFigureAnnotations | null | undefined
  >(undefined);
  const { figureAnnotationItems } = useFigureAnnotationItems();
  const [curating, setCurating] = useState(false);

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
        figureUrlWithoutTrailingSlash + `/annotations.json?cb=${Date.now()}`;
      const a = await loadRemoteFigureAnnotations(annotationsUrl);
      if (canceled) return;
      console.info("Loaded annotations:", a);
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
    if (!putFigureFilesInterface) {
      console.warn("No putFigureFilesInterface available");
      return;
    }
    const s = {
      ...{ ...(savedFigureAnnotations || {}) },
      items: figureAnnotationItems,
    };
    uploadFigureAnnotations(figureUrl, s, putFigureFilesInterface)
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
    savedFigureAnnotations,
    putFigureFilesInterface,
  ]);

  return {
    figureAnnotationsIsDirty,
    revertFigureAnnotations,
    saveFigureAnnotations: putFigureFilesInterface
      ? saveFigureAnnotations
      : undefined,
    curating,
    setCurating,
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

const uploadFigureAnnotations = async (
  figureUrl: string,
  annotations: SavedFigureAnnotations,
  putFigureFilesInterface: PutFigureFilesInterface,
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

  await putFigureFilesInterface.putFigureFiles(files);
};
