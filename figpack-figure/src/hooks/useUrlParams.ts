import { useMemo } from "react";

export const useUrlParams = () => {
  return useMemo(() => {
    const params = new URLSearchParams(window.location.search);
    const tStart = params.get("t_start");
    const tEnd = params.get("t_end");
    return {
      embedded: params.get("embedded") === "1",
      tStart: tStart !== null ? parseFloat(tStart) : undefined,
      tEnd: tEnd !== null ? parseFloat(tEnd) : undefined,
    };
  }, []);
};
