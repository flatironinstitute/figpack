import { useEffect, useState } from "react";
import { ZarrGroup } from "../../figpack-interface";
import { MultiChannelTimeseriesClient } from "./MultiChannelTimeseriesClient";

export const useMultiChannelTimeseriesClient = (zarrGroup: ZarrGroup) => {
  const [client, setClient] = useState<MultiChannelTimeseriesClient | null>(
    null,
  );

  useEffect(() => {
    let canceled = false;
    const createClient = async () => {
      const c = await MultiChannelTimeseriesClient.create(zarrGroup);
      if (canceled) return;
      setClient(c);
    };
    createClient();
    return () => {
      canceled = true;
    };
  }, [zarrGroup]);

  return client;
};
