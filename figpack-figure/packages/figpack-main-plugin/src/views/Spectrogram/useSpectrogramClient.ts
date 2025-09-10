import { ZarrGroup } from "../../figpack-interface";
import { useEffect, useState } from "react";
import { SpectrogramClient } from "./SpectrogramClient";

export const useSpectrogramClient = (zarrGroup: ZarrGroup) => {
  const [client, setClient] = useState<SpectrogramClient | null>(null);

  useEffect(() => {
    let canceled = false;
    const createClient = async () => {
      try {
        const newClient = await SpectrogramClient.create(zarrGroup);
        if (!canceled) {
          setClient(newClient);
        }
      } catch (error) {
        console.error("Failed to create SpectrogramClient:", error);
        if (!canceled) {
          setClient(null);
        }
      }
    };

    createClient();
    return () => {
      canceled = true;
    };
  }, [zarrGroup]);

  return client;
};
