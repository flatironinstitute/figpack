import { useCallback, useState } from "react";
import { FIGPACK_API_BASE_URL } from "../../config";

interface PinInfo {
  name: string;
  figureDescription: string;
}

export const usePin = (
  figureUrl: string,
  apiKey: string | null,
  loadFigureData: (url: string) => Promise<void>,
) => {
  const [pinDialogOpen, setPinDialogOpen] = useState(false);
  const [pinLoading, setPinLoading] = useState(false);
  const [pinError, setPinError] = useState<string | null>(null);
  const [unpinLoading, setUnpinLoading] = useState(false);

  const handlePin = useCallback(
    async (pinInfo: PinInfo) => {
      if (!apiKey) {
        throw new Error("API key is required to pin a figure");
      }

      setPinLoading(true);
      setPinError(null);
      try {
        const response = await fetch(`${FIGPACK_API_BASE_URL}/pin`, {
          method: "POST",
          headers: { "Content-Type": "application/json", "x-api-key": apiKey },
          body: JSON.stringify({
            figureUrl,
            pinInfo: pinInfo,
          }),
        });

        const result = await response.json();

        if (result.success) {
          await loadFigureData(figureUrl);
          setPinDialogOpen(false);
          return { success: true };
        } else {
          setPinError(`Failed to pin figure: ${result.message}`);
          throw Error(result.message);
        }
      } catch (err) {
        setPinError(`Error pinning figure: ${err}`);
        throw err;
      } finally {
        setPinLoading(false);
      }
    },
    [figureUrl, apiKey, loadFigureData],
  );

  const handleOpenPinDialog = () => {
    setPinError(null);
    setPinDialogOpen(true);
  };

  const handleClosePinDialog = () => {
    setPinError(null);
    setPinDialogOpen(false);
  };

  const handleUnpin = useCallback(async () => {
    if (!apiKey) {
      throw new Error("API key is required to unpin a figure");
    }

    setUnpinLoading(true);
    setPinError(null);
    try {
      const response = await fetch(`${FIGPACK_API_BASE_URL}/unpin`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-api-key": apiKey },
        body: JSON.stringify({
          figureUrl,
        }),
      });

      const result = await response.json();

      if (result.success) {
        await loadFigureData(figureUrl);
        return { success: true };
      } else {
        setPinError(`Failed to unpin figure: ${result.message}`);
        throw Error(result.message);
      }
    } catch (err) {
      setPinError(`Error unpinning figure: ${err}`);
      throw err;
    } finally {
      setUnpinLoading(false);
    }
  }, [figureUrl, apiKey, loadFigureData]);

  return {
    pinDialogOpen,
    pinLoading,
    unpinLoading,
    pinError,
    handlePin: apiKey ? handlePin : null,
    handleUnpin: apiKey ? handleUnpin : null,
    handleOpenPinDialog,
    handleClosePinDialog,
  };
};
