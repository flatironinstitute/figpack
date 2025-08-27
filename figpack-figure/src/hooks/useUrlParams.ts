import { useMemo } from "react";

export const useUrlParams = () => {
  return useMemo(() => {
    const params = new URLSearchParams(window.location.search);
    return {
      embedded: params.get("embedded") === "1",
    };
  }, []);
};
