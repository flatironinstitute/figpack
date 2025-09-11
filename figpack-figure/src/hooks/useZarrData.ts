/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useMemo, useReducer, useState } from "react";
import { ZarrGroup } from "../figpack-interface";
import RemoteZarr from "../remote-zarr/RemoteZarrImpl";
import EditableZarrGroup, {
  emptyZarrEdits,
  zarrEditsReducer,
} from "./EditableZarrGroup";
import { useFigureUrl } from "./useFigureUrl";

export const useZarrData = () => {
  const [zarrData, setZarrData] = useState<ZarrGroup | null | undefined>(null);
  const [zarrEdits, zarrEditsDispatch] = useReducer(
    zarrEditsReducer,
    emptyZarrEdits,
  );
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

  const zarrDataCombined = useMemo(() => {
    if (!zarrData) {
      return zarrData;
    }
    return new EditableZarrGroup(zarrData, zarrEdits, zarrEditsDispatch);
  }, [zarrData, zarrEdits]);

  return zarrDataCombined;
};
