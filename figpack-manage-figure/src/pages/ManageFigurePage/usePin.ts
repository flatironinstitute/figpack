import { useState } from 'react';

interface PinInfo {
  name: string;
  figure_description: string;
}

export const usePin = (
  figureUrl: string,
  apiKey: string | null,
  loadFigureData: (url: string) => Promise<void>
) => {
  const [pinDialogOpen, setPinDialogOpen] = useState(false);
  const [pinLoading, setPinLoading] = useState(false);
  const [pinError, setPinError] = useState<string | null>(null);
  const [unpinLoading, setUnpinLoading] = useState(false);

  const handlePin = async (pinInfo: PinInfo) => {
    if (!figureUrl) return;

    if (!apiKey) {
      return { requiresApiKey: true };
    }

    setPinLoading(true);
    setPinError(null);
    try {
      const response = await fetch("https://figpack-api.vercel.app/api/pin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          figureUrl: figureUrl,
          apiKey: apiKey,
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
  };

  const handleOpenPinDialog = () => {
    setPinError(null);
    setPinDialogOpen(true);
  };

  const handleClosePinDialog = () => {
    setPinError(null);
    setPinDialogOpen(false);
  };

  const handleUnpin = async () => {
    if (!figureUrl) return;

    if (!apiKey) {
      return { requiresApiKey: true };
    }

    setUnpinLoading(true);
    setPinError(null);
    try {
      const response = await fetch("https://figpack-api.vercel.app/api/unpin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          figureUrl: figureUrl,
          apiKey: apiKey,
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
  };

  return {
    pinDialogOpen,
    pinLoading,
    unpinLoading,
    pinError,
    handlePin,
    handleUnpin,
    handleOpenPinDialog,
    handleClosePinDialog,
  };
};
