import { useEffect, useState, useSyncExternalStore } from "react";

// Counts network reads of figure data that are in progress, so the UI can
// show that data is loading.

let numPending = 0;
const listeners = new Set<() => void>();

const notify = () => {
  for (const l of listeners) l();
};

export const beginDataLoad = () => {
  numPending++;
  notify();
};

export const endDataLoad = () => {
  numPending = Math.max(0, numPending - 1);
  notify();
};

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};

const getIsLoading = () => numPending > 0;

// True while data is loading. Views often issue many short reads one after
// another, so gaps shorter than gapMs between reads count as still loading.
// Loads shorter than delayMs are not reported, so that quick fetches while
// panning do not make the indicator flicker.
export const useDataIsLoading = (delayMs = 300, gapMs = 500) => {
  const loading = useSyncExternalStore(subscribe, getIsLoading);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (loading) {
      setBusy(true);
      return;
    }
    const timer = setTimeout(() => setBusy(false), gapMs);
    return () => clearTimeout(timer);
  }, [loading, gapMs]);
  const [show, setShow] = useState(false);
  useEffect(() => {
    if (!busy) {
      setShow(false);
      return;
    }
    const timer = setTimeout(() => setShow(true), delayMs);
    return () => clearTimeout(timer);
  }, [busy, delayMs]);
  return show;
};
