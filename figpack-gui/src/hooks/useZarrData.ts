import { useState, useEffect } from "react";
import RemoteZarr from "../remote-zarr/RemoteZarrImpl";
import { ZarrGroup } from "src/plugin-interface/ZarrTypes";

export const useZarrData = () => {
  const [zarrData, setZarrData] = useState<ZarrGroup | null | undefined>(null);
  useEffect(() => {
    let canceled = false;
    const load = async () => {
      const queryParams = new URLSearchParams(window.location.search);
      const dataUrl = queryParams.get("data") || "data.zarr";
      const a = await RemoteZarr.createFromZarr(dataUrl);
      const g = await a.getGroup("/");
      if (canceled) return;
      setZarrData(g);
    };
    load();
    return () => {
      canceled = true;
    };
  }, []);
  return zarrData;
};
