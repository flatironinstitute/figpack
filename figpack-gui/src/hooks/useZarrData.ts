import { useState, useEffect } from "react";
import { RemoteH5FileLindi, RemoteH5Group } from "../remote-h5-file";

export const useZarrData = () => {
  const [zarrData, setZarrData] = useState<RemoteH5Group | null | undefined>(
    null,
  );
  useEffect(() => {
    let canceled = false;
    const load = async () => {
      const queryParams = new URLSearchParams(window.location.search);
      const dataUrl = queryParams.get("data") || "data.zarr";
      const a = await RemoteH5FileLindi.createFromZarr(dataUrl);
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
