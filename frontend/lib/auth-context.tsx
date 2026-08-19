"use client";

import { createContext, useContext, useMemo, useState } from "react";

export type AuthUser = {
  name: string;
  role: string;
};

type AuthContextValue = {
  isAuthenticated: boolean;
  user: AuthUser | null;
  login: () => void;
  logout: () => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

const MOCK_USER: AuthUser = {
  name: "Bakery Owner",
  role: "SME client",
};

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);

  const value = useMemo<AuthContextValue>(
    () => ({
      isAuthenticated: user !== null,
      user,
      login: () => setUser(MOCK_USER),
      logout: () => setUser(null),
    }),
    [user],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
}
