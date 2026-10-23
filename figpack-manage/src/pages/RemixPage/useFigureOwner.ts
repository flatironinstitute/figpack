import { useEffect, useState } from "react";
import { FIGPACK_API_BASE_URL } from "../../config";

// The owner of a figure, as registered with the figpack API (null if the
// figure is not found)
const useFigureOwner = (figureDirUrl: string | null) => {
  const [ownerEmail, setOwnerEmail] = useState<string | null>(null);

  useEffect(() => {
    if (!figureDirUrl) return;
    let canceled = false;
    (async () => {
      try {
        const apiUrl = new URL("/figures/get", FIGPACK_API_BASE_URL);
        apiUrl.searchParams.set("figureUrl", figureDirUrl + "index.html");
        const response = await fetch(apiUrl.toString());
        const data = await response.json();
        if (!canceled && data.success && data.figure) {
          setOwnerEmail(data.figure.ownerEmail ?? null);
        }
      } catch (err) {
        console.warn("Could not load figure info", err);
      }
    })();
    return () => {
      canceled = true;
    };
  }, [figureDirUrl]);

  return ownerEmail;
};

export default useFigureOwner;
