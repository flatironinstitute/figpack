import { createContext } from "react";
import type { BacklinksContextType } from "./backlinksTypes";

export const BacklinksContext = createContext<BacklinksContextType>({
  backlinks: [],
  loading: true,
  error: null,
});
