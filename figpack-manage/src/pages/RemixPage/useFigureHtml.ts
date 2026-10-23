import { useEffect, useState } from "react";

// Fetch the original page of a figure (its index.html or another page)
const useFigureHtml = (pageUrl: string | null) => {
  const [html, setHtml] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!pageUrl) return;
    let canceled = false;
    setHtml(null);
    setError(null);
    (async () => {
      try {
        const response = await fetch(pageUrl, {
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
            `Error loading ${pageUrl}: ${err instanceof Error ? err.message : err}`,
          );
        }
      }
    })();
    return () => {
      canceled = true;
    };
  }, [pageUrl]);

  return { html, error };
};

export default useFigureHtml;
