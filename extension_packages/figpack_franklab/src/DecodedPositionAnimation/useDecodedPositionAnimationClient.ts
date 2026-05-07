import { useEffect, useState } from "react";
import { ZarrGroup } from "../figpack-interface";
import { DecodedPositionAnimationClient } from "./DecodedPositionAnimationClient";

export const useDecodedPositionAnimationClient = (zarrGroup: ZarrGroup) => {
  const [client, setClient] = useState<DecodedPositionAnimationClient | null>(
    null,
  );

  useEffect(() => {
    let canceled = false;
    DecodedPositionAnimationClient.create(zarrGroup)
      .then((c) => {
        if (canceled) return;
        setClient(c);
      })
      .catch((err) => {
        console.error("Failed to create DecodedPositionAnimation client:", err);
      });
    return () => {
      canceled = true;
    };
  }, [zarrGroup]);

  return client;
};
