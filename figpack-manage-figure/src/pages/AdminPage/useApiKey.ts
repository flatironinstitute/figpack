import { useCallback, useEffect, useState } from "react";

const useApiKey = () => {
  const [apiKey, setApiKeyInternal] = useState<string>("");

  const setApiKey = useCallback((key: string) => {
    setApiKeyInternal(key);
    if (key) {
      localStorage.setItem("figpack-api-key", key);
    } else {
      localStorage.removeItem("figpack-api-key");
    }
  }, []);

  useEffect(() => {
    const storedApiKey = localStorage.getItem("figpack-api-key");
    if (storedApiKey) {
      setApiKeyInternal(storedApiKey);
    }
  }, []);

  return { apiKey, setApiKey };
};

export default useApiKey;