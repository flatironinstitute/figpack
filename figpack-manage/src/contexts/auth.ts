import { createContext } from "react";

export interface User {
  email: string;
  name: string;
  researchDescription: string;
  apiKey: string;
  isAdmin: boolean;
  createdAt: string;
}

export interface AuthContextType {
  apiKey: string;
  isLoggedIn: boolean;
  user: User | null;
  loading: boolean;
  login: (key: string) => void;
  logout: () => void;
  requireAuth: () => boolean;
  refreshUser: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextType | undefined>(
  undefined
);
