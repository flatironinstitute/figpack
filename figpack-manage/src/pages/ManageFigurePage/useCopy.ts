import { useCallback, useState } from "react";
import { copyFigure } from "./copyFigureApi";

export const useCopy = (
  figureUrl: string,
  apiKey: string | null,
  onCopied: (newFigureUrl: string) => void,
) => {
  const [copyLoading, setCopyLoading] = useState(false);
  const [copyError, setCopyError] = useState<string | null>(null);

  const handleCopy = useCallback(async () => {
    if (!apiKey) return;
    setCopyLoading(true);
    setCopyError(null);
    try {
      onCopied(await copyFigure(figureUrl, apiKey));
    } catch (err) {
      setCopyError(`Failed to copy figure: ${(err as Error).message}`);
    } finally {
      setCopyLoading(false);
    }
  }, [figureUrl, apiKey, onCopied]);

  return {
    copyLoading,
    copyError,
    handleCopy: apiKey ? handleCopy : null,
  };
};
