import { useEffect, useState } from "react";
import { ZarrGroup } from "../figpack-interface";
import { resolveFigureSpec, useFigureSpec } from "../figureSpec";
import { withInheritedStyle } from "../inheritedStyle";

// The root group to render: data.zarr's root, or, if the page called
// figpack.render(spec), the spec resolved on top of data.zarr. Either way the
// style attr cascades from each view to the views inside it.
export const useRootGroup = (zarrData: ZarrGroup | null | undefined) => {
  const { ready, spec, specError, version } = useFigureSpec();
  const [rootGroup, setRootGroup] = useState<ZarrGroup | null>(null);
  const [rootGroupError, setRootGroupError] = useState<string | null>(null);

  useEffect(() => {
    setRootGroup(null);
    setRootGroupError(null);
    if (!zarrData || !ready) return;
    if (specError) {
      setRootGroupError(specError);
      return;
    }
    if (!spec) {
      setRootGroup(withInheritedStyle(zarrData));
      return;
    }
    let canceled = false;
    resolveFigureSpec(zarrData, spec)
      .then((g) => {
        if (!canceled) setRootGroup(withInheritedStyle(g));
      })
      .catch((err) => {
        console.error("Error resolving figure spec:", err);
        if (!canceled) setRootGroupError(`${err}`);
      });
    return () => {
      canceled = true;
    };
  }, [zarrData, ready, spec, specError]);

  return { rootGroup, rootGroupError, specVersion: version };
};
