import { ZarrGroup } from "../../figpack-interface";
import { useEffect, useState } from "react";
import { LinearDecodeClient } from "./LinearDecodeClient";

export const useLinearDecodeClient = (zarrGroup: ZarrGroup) => {
  const [client, setClient] = useState<LinearDecodeClient | null>(null);

  useEffect(() => {
    let canceled = false;
    const createClient = async () => {
      try {
        const newClient = await LinearDecodeClient.create(zarrGroup);
        if (!canceled) {
          setClient(newClient);
        }
      } catch (error) {
        console.error("Failed to create LinearDecodeClient:", error);
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
