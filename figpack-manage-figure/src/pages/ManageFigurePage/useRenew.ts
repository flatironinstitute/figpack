import { useCallback, useState } from 'react';
import { FIGPACK_API_BASE_URL } from '../../config';

export const useRenew = (
  figureUrl: string,
  apiKey: string | null,
  loadFigureData: (url: string) => Promise<void>
) => {
  const [renewLoading, setRenewLoading] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);

  const handleRenew = useCallback(async () => {
    if (!apiKey) {
      throw new Error("API key is required to renew a figure");
    }

    setRenewLoading(true);
    try {
      const response = await fetch(`${FIGPACK_API_BASE_URL}/api/renew`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ figureUrl, apiKey }),
      });

      const result = await response.json();

      if (result.success) {
        await loadFigureData(figureUrl);
        setApiError(null);
        return { success: true };
      } else {
        setApiError(`Failed to renew figure: ${result.message}`);
      }
    } catch (err) {
      setApiError(`Error renewing figure: ${err}`);
    } finally {
      setRenewLoading(false);
    }
  }, [figureUrl, apiKey, loadFigureData]);

  return {
    renewLoading,
    apiError,
    handleRenew: apiKey ? handleRenew : null,
  };
};
