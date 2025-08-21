import { useState } from 'react';
import { FIGPACK_API_BASE_URL } from '../../config';

interface PinInfo {
  name: string;
  figureDescription: string;
}

export const usePin = (
  loadFigureData: (url: string) => Promise<void>
) => {
  const [pinDialogOpen, setPinDialogOpen] = useState(false);
  const [pinLoading, setPinLoading] = useState(false);
  const [pinError, setPinError] = useState<string | null>(null);
  const [unpinLoading, setUnpinLoading] = useState(false);

  const handlePin = async (figureUrl: string, pinInfo: PinInfo, apiKey: string | null) => {
    if (!apiKey) {
      return { requiresApiKey: true };
    }

    setPinLoading(true);
    setPinError(null);
    try {
      const response = await fetch(`${FIGPACK_API_BASE_URL}/api/pin`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          figureUrl,
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

  const handleUnpin = async (figureUrl: string, apiKey: string | null) => {
    if (!apiKey) {
      return { requiresApiKey: true };
    }

    setUnpinLoading(true);
    setPinError(null);
    try {
      const response = await fetch(`${FIGPACK_API_BASE_URL}/api/unpin`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          figureUrl,
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
