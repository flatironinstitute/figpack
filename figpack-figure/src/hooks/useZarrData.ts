import { useState, useEffect } from "react";
import RemoteZarr from "../remote-zarr/RemoteZarrImpl";
import { ZarrGroup } from "@figpack/plugin-sdk";
import { useFigureUrl } from "./useFigureUrl";

export const useZarrData = () => {
  const [zarrData, setZarrData] = useState<ZarrGroup | null | undefined>(null);
  const figureUrl = useFigureUrl();

  useEffect(() => {
    let canceled = false;
    const load = async () => {
      const dataUrl = figureUrl + "data.zarr";
      const a = await RemoteZarr.createFromZarr(dataUrl);
      const g = await a.getGroup("/");
      if (canceled) return;
      setZarrData(g);
    };
    load();
    return () => {
      canceled = true;
    };
  }, [figureUrl]);
  return zarrData;
};
