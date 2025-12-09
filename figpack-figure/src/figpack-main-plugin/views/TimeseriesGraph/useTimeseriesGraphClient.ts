import { useEffect, useState } from "react";
import { ZarrGroup } from "../../figpack-interface";
import { TimeseriesGraphClient } from "./TimeseriesGraphClient";

export const useTimeseriesGraphClient = (zarrGroup: ZarrGroup) => {
  const [client, setClient] = useState<TimeseriesGraphClient | null>(null);
  useEffect(() => {
    let canceled = false;
    const createClient = async () => {
      const c = await TimeseriesGraphClient.create(zarrGroup);
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
