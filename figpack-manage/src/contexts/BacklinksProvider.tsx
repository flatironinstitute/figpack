import { useEffect, useState } from "react";
import type { BacklinkEntry } from "./backlinksTypes";
import { BacklinksContext } from "./backlinksContext";

export function BacklinksProvider({ children }: { children: React.ReactNode }) {
  const [backlinks, setBacklinks] = useState<BacklinkEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchBacklinks = async () => {
      try {
        const response = await fetch(
          `https://magland.github.io/figpack-url-refs/figpack-url-refs.json?cb=${Date.now()}`
        );
        if (!response.ok) {
          throw new Error("Failed to fetch backlinks");
        }
        const data = await response.json();
        setBacklinks(data);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to load backlinks"
        );
      } finally {
        setLoading(false);
      }
    };

    fetchBacklinks();
  }, []);

  return (
    <BacklinksContext.Provider value={{ backlinks, loading, error }}>
      {children}
    </BacklinksContext.Provider>
  );
}
