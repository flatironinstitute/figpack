import React, { useCallback, useEffect, useState } from "react";
import type { ReactNode } from "react";
import { AuthContext, type AuthContextType, type User } from "./auth";
import { getUserProfile } from "../pages/UserProfilePage/userProfileApi";

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [apiKey, setApiKeyInternal] = useState<string>("");
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(false);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(false);

  const refreshUser = useCallback(async () => {
    if (!apiKey) {
      setUser(null);
      return;
    }

    setLoading(true);
    try {
      const result = await getUserProfile(apiKey);
      if (result.success && result.user) {
        setUser(result.user);
      } else {
        setUser(null);
      }
    } catch (error) {
      console.error("Error loading user profile:", error);
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, [apiKey]);

  const login = useCallback((key: string) => {
    const trimmedKey = key.trim();
    setApiKeyInternal(trimmedKey);
    setIsLoggedIn(!!trimmedKey);
    if (trimmedKey) {
      localStorage.setItem("figpack-api-key", trimmedKey);
    } else {
      localStorage.removeItem("figpack-api-key");
      setUser(null);
    }
  }, []);

  const logout = useCallback(() => {
    setApiKeyInternal("");
    setIsLoggedIn(false);
    setUser(null);
    localStorage.removeItem("figpack-api-key");
  }, []);

  const requireAuth = useCallback(() => {
    return isLoggedIn;
  }, [isLoggedIn]);

  // Load API key from localStorage on mount
  useEffect(() => {
    const storedApiKey = localStorage.getItem("figpack-api-key");
    if (storedApiKey) {
      setApiKeyInternal(storedApiKey);
      setIsLoggedIn(true);
    }
  }, []);

  // Load user profile when API key changes
  useEffect(() => {
    if (apiKey && isLoggedIn) {
      refreshUser();
    } else {
      setUser(null);
    }
  }, [apiKey, isLoggedIn, refreshUser]);

  const value: AuthContextType = {
    apiKey,
    isLoggedIn,
    user,
    loading,
    login,
    logout,
    requireAuth,
    refreshUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
