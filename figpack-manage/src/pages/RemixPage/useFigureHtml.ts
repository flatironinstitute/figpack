import { useEffect, useState } from "react";

// Fetch the original page (index.html) of a figure
const useFigureHtml = (figureDirUrl: string | null) => {
  const [html, setHtml] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!figureDirUrl) return;
    let canceled = false;
    setHtml(null);
    setError(null);
    (async () => {
      try {
        const response = await fetch(figureDirUrl + "index.html", {
          cache: "no-store",
        });
        if (!response.ok) {
          throw new Error(`HTTP ${response.status} ${response.statusText}`);
        }
        const text = await response.text();
        if (!canceled) setHtml(text);
      } catch (err) {
        if (!canceled) {
          setError(
            `Error loading ${figureDirUrl}index.html: ${err instanceof Error ? err.message : err}`,
          );
        }
      }
    })();
    return () => {
      canceled = true;
    };
  }, [figureDirUrl]);

  return { html, error };
};

export default useFigureHtml;
