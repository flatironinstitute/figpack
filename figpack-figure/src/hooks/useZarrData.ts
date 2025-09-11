import { useEffect, useMemo, useReducer, useState } from "react";
import { ZarrGroup } from "../figpack-interface";
import RemoteZarr from "../remote-zarr/RemoteZarrImpl";
import EditableZarrGroup, {
  emptyZarrEdits,
  zarrEditsReducer,
} from "./EditableZarrGroup";

export const useZarrData = (figureUrl: string) => {
  const [zarrData, setZarrData] = useState<ZarrGroup | null | undefined>(null);
  const [zarrEdits, zarrEditsDispatch] = useReducer(
    zarrEditsReducer,
    emptyZarrEdits,
  );

  const [refreshCode, setRefreshCode] = useState(0);
  const refreshZarrData = () => {
    setRefreshCode((c) => c + 1);
  };

  useEffect(() => {
    let canceled = false;
    const load = async () => {
      const dataUrl = figureUrl + "data.zarr";
      const a = await RemoteZarr.createFromZarr(dataUrl);
      const g = await a.getGroup("/");
      if (canceled) return;
      setZarrData(g);
      zarrEditsDispatch({ type: "clearEdits" });
    };
    load();
    return () => {
      canceled = true;
    };
  }, [figureUrl, refreshCode]);

  const zarrDataCombined = useMemo(() => {
    if (!zarrData) {
      return zarrData;
    }
    const x = new EditableZarrGroup(zarrData, zarrEdits, zarrEditsDispatch);
    return x;
  }, [zarrData, zarrEdits]);

  const editedFiles = zarrEdits.editedFiles;

  return { zarrData: zarrDataCombined, editedFiles, refreshZarrData };
};
