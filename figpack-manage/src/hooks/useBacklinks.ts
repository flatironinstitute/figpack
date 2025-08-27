import { useContext } from "react";
import { BacklinksContext } from "../contexts/backlinksContext";

export function useBacklinks() {
  const context = useContext(BacklinksContext);
  if (context === undefined) {
    throw new Error("useBacklinks must be used within a BacklinksProvider");
  }
  return context;
}
