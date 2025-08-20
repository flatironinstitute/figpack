import { useState } from 'react';

export const useRenew = (
  figureUrl: string,
  apiKey: string | null,
  loadFigureData: (url: string) => Promise<void>
) => {
  const [renewLoading, setRenewLoading] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);

  const handleRenew = async (apiKeyToUse?: string) => {
    if (!figureUrl) return;

    const keyToUse = apiKeyToUse || apiKey;
    if (!keyToUse) {
      return { requiresApiKey: true };
    }

    setRenewLoading(true);
    try {
      const response = await fetch("https://figpack-api.vercel.app/api/renew", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ figureUrl: figureUrl, apiKey: keyToUse }),
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
  };

  return {
    renewLoading,
    apiError,
    handleRenew,
    setApiError,
  };
};
