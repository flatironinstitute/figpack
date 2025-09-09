import { useEffect, useState } from "react";
import { TrackAnimationClient } from "./TrackAnimationClient";
import { ZarrGroup } from "./figpack-plugin-interface/ZarrTypes";

// Hook to use the TrackAnimation client
export const useTrackAnimationClient = (zarrGroup: ZarrGroup) => {
  const [client, setClient] = useState<TrackAnimationClient | null>(null);

  useEffect(() => {
    let canceled = false;
    const createClient = async () => {
      try {
        const c = await TrackAnimationClient.create(zarrGroup);
        if (canceled) return;
        setClient(c);
      } catch (err) {
        console.error("Failed to create TrackAnimation client:", err);
      }
    };
    createClient();
    return () => {
      canceled = true;
    };
  }, [zarrGroup]);

  return client;
};
