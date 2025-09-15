import { useEffect, useState } from "react";
import { ZarrGroup } from "../figpack-interface";
import RemoteZarr from "../remote-zarr/RemoteZarrImpl";

export const useZarrData = (figureUrl: string) => {
  const [zarrData, setZarrData] = useState<ZarrGroup | null | undefined>(null);

  const [refreshCode, setRefreshCode] = useState(0);
  const refreshZarrData = () => {
    setRefreshCode((c) => c + 1);
  };

  useEffect(() => {
    let canceled = false;
    const load = async () => {
      const figureUrlWithoutIndexHtml = figureUrl.endsWith("/index.html")
        ? figureUrl.slice(0, -"index.html".length)
        : figureUrl;
      const figureUrlWithoutTrailingSlash = figureUrlWithoutIndexHtml.endsWith(
        "/",
      )
        ? figureUrlWithoutIndexHtml.slice(0, -1)
        : figureUrlWithoutIndexHtml;
      const dataUrl = figureUrlWithoutTrailingSlash + "/data.zarr";
      const a = await RemoteZarr.createFromZarr(dataUrl);
      const g = await a.getGroup("/");
      if (canceled) return;
      setZarrData(g);
    };
    load();
    return () => {
      canceled = true;
    };
  }, [figureUrl, refreshCode]);

  return { zarrData, refreshZarrData };
};
