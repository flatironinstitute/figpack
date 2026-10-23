import { useCallback, useMemo, useRef, useState } from "react";
import type { ConsoleEntry, ConsoleLevel } from "./consoleCapture";

const MAX_ENTRIES = 1000;

// How long the page may keep logging after it loads before the agent reads
// the console
const SETTLE_MS = 2000;
const RELOAD_TIMEOUT_MS = 15000;

// The console log of the remix preview
const useConsoleLog = () => {
  const [entries, setEntries] = useState<ConsoleEntry[]>([]);
  // Kept in refs too, for the agent's tools, which run outside rendering
  const entriesRef = useRef<ConsoleEntry[]>([]);
  const pageLoadCount = useRef(0);
  const nextId = useRef(1);

  const addEntry = useCallback((level: ConsoleLevel, text: string) => {
    const entry: ConsoleEntry = {
      id: nextId.current++,
      time: Date.now(),
      level,
      text,
    };
    if (level === "page-load") pageLoadCount.current++;
    entriesRef.current = [
      ...entriesRef.current.slice(-(MAX_ENTRIES - 1)),
      entry,
    ];
    setEntries(entriesRef.current);
  }, []);

  const clear = useCallback(() => {
    entriesRef.current = [];
    setEntries([]);
  }, []);

  const getEntries = useCallback(() => entriesRef.current, []);

  // Returns a function that resolves once the page has loaded again after
  // this call and has had time to settle (false on timeout)
  const startReloadWait = useCallback(() => {
    const before = pageLoadCount.current;
    return async () => {
      const start = Date.now();
      while (pageLoadCount.current === before) {
        if (Date.now() - start > RELOAD_TIMEOUT_MS) return false;
        await new Promise((resolve) => setTimeout(resolve, 100));
      }
      await new Promise((resolve) => setTimeout(resolve, SETTLE_MS));
      return true;
    };
  }, []);

  return useMemo(
    () => ({ entries, addEntry, clear, getEntries, startReloadWait }),
    [entries, addEntry, clear, getEntries, startReloadWait],
  );
};

export default useConsoleLog;
