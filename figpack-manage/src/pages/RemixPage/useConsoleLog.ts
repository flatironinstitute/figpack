import { useCallback, useRef, useState } from "react";
import type { ConsoleEntry, ConsoleLevel } from "./consoleCapture";

const MAX_ENTRIES = 1000;

// The console log of the remix preview
const useConsoleLog = () => {
  const [entries, setEntries] = useState<ConsoleEntry[]>([]);
  const nextId = useRef(1);

  const addEntry = useCallback((level: ConsoleLevel, text: string) => {
    const entry: ConsoleEntry = {
      id: nextId.current++,
      time: Date.now(),
      level,
      text,
    };
    setEntries((prev) => [...prev.slice(-(MAX_ENTRIES - 1)), entry]);
  }, []);

  const clear = useCallback(() => setEntries([]), []);

  return { entries, addEntry, clear };
};

export default useConsoleLog;
