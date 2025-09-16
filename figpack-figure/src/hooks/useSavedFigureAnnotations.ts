import { useCallback, useEffect, useMemo, useState } from "react";
import {
  FigureAnnotationsAction,
  FigureAnnotationsState,
  FPViewContexts,
} from "../figpack-interface";
import { PutFigureFilesInterface } from "../UploadFilesPanel/UploadFilesPanel";
import { useProvideFPViewContext } from "../figpack-utils";

export interface SavedFigureAnnotations {
  annotations: { [path: string]: { [key: string]: string } };
}

export const useSavedFigureAnnotations = (
  figureUrl: string,
  putFigureFilesInterface: PutFigureFilesInterface | null,
  contexts: FPViewContexts | undefined,
) => {
  const { state: figureAnnotations, dispatch: figureAnnotationsDispatch } =
    useProvideFPViewContext<FigureAnnotationsState, FigureAnnotationsAction>(
      contexts?.figureAnnotations,
    );

  const [savedFigureAnnotations, setSavedFigureAnnotations] = useState<
    SavedFigureAnnotations | null | undefined
  >(undefined);

  useEffect(() => {
    if (!figureAnnotationsDispatch) return;
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
      if (!a) return;
      if (canceled) return;
      console.info("Loaded annotations:", a);
      setSavedFigureAnnotations(a);
      figureAnnotationsDispatch({
        type: "setAllAnnotations",
        annotations: a.annotations || {},
      });
    };
    load();
    return () => {
      canceled = true;
    };
  }, [figureUrl, figureAnnotationsDispatch]);

  const figureAnnotationsIsDirty = useMemo(() => {
    return !annotationsAreEqual(
      (savedFigureAnnotations || { annotations: {} }).annotations,
      (figureAnnotations || { annotations: {} }).annotations,
    );
  }, [savedFigureAnnotations, figureAnnotations]);

  const revertFigureAnnotations = useCallback(() => {
    if (!figureAnnotationsDispatch) return;
    figureAnnotationsDispatch({
      type: "setAllAnnotations",
      annotations: (savedFigureAnnotations || { annotations: {} }).annotations,
    });
  }, [savedFigureAnnotations, figureAnnotationsDispatch]);

  const saveFigureAnnotations = useCallback(() => {
    if (!putFigureFilesInterface) {
      console.warn("No putFigureFilesInterface available");
      return;
    }
    if (!figureAnnotations) {
      console.warn("No figureAnnotations available");
      return;
    }
    const s = {
      annotations: figureAnnotations.annotations,
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
  }, [figureUrl, figureAnnotations, putFigureFilesInterface]);

  return {
    figureAnnotations,
    figureAnnotationsDispatch,
    figureAnnotationsIsDirty,
    revertFigureAnnotations,
    saveFigureAnnotations: putFigureFilesInterface
      ? saveFigureAnnotations
      : undefined,
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
      !data.annotations ||
      typeof data.annotations !== "object" ||
      Array.isArray(data.annotations)
    ) {
      console.warn(`Invalid annotations format from ${url}`);
      return null;
    }
    return data;
  } catch (error) {
    console.error(`Error loading annotations from ${url}:`, error);
    return null;
  }
};

const annotationsAreEqual = (
  a: { [path: string]: { [key: string]: string } },
  b: { [path: string]: { [key: string]: string } },
): boolean => {
  const aKeys = Object.keys(a).sort();
  const bKeys = Object.keys(b).sort();
  if (aKeys.length !== bKeys.length) return false;
  for (let i = 0; i < aKeys.length; i++) {
    if (aKeys[i] !== bKeys[i]) return false;
    const aSubKeys = Object.keys(a[aKeys[i]]).sort();
    const bSubKeys = Object.keys(b[bKeys[i]]).sort();
    if (aSubKeys.length !== bSubKeys.length) return false;
    for (let j = 0; j < aSubKeys.length; j++) {
      if (aSubKeys[j] !== bSubKeys[j]) return false;
      if (a[aKeys[i]][aSubKeys[j]] !== b[bKeys[i]][bSubKeys[j]]) return false;
    }
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
