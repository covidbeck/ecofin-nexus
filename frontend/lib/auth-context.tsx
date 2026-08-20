"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

import type { BillingCycle, TierId } from "@/lib/types";

export type AuthUser = {
  name: string;
  email: string;
  companyName: string;
  role: string;
};

export type Subscription = {
  tierId: TierId;
  tierLabel: string;
  cycle: BillingCycle;
  activatedAt: string;
};

// Demo credentials shown to the jury on the login screen. Local-only session,
// no real JWTs or secrets — see task brief.
export const DEMO_CREDENTIALS = {
  email: "demo@nexus.kz",
  password: "NexusDemo2026!",
  companyName: "Tandyr & Co",
  role: "Владелец бизнеса",
  name: "Азамат Тандыр",
};

const SESSION_KEY = "nexus.session";
const SUBSCRIPTION_KEY = "nexus.subscription";

type RegisterInput = {
  name: string;
  companyName: string;
  email: string;
  password: string;
};

type AuthContextValue = {
  user: AuthUser | null;
  subscription: Subscription | null;
  isAuthenticated: boolean;
  isHydrated: boolean;
  login: (email: string, password: string) => AuthUser;
  loginAsDemo: () => AuthUser;
  register: (input: RegisterInput) => AuthUser;
  logout: () => void;
  setSubscription: (subscription: Subscription) => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

function readJson<T>(key: string): T | null {
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [subscription, setSubscriptionState] = useState<Subscription | null>(null);
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    setUser(readJson<AuthUser>(SESSION_KEY));
    setSubscriptionState(readJson<Subscription>(SUBSCRIPTION_KEY));
    setIsHydrated(true);
  }, []);

  const persistUser = useCallback((next: AuthUser) => {
    window.localStorage.setItem(SESSION_KEY, JSON.stringify(next));
    setUser(next);
    return next;
  }, []);

  const login = useCallback(
    (email: string, password: string) => {
      const normalized = email.trim().toLowerCase();
      if (
        normalized !== DEMO_CREDENTIALS.email.toLowerCase() ||
        password !== DEMO_CREDENTIALS.password
      ) {
        throw new Error("Неверный email или пароль. Используйте демо-доступ для жюри.");
      }
      return persistUser({
        name: DEMO_CREDENTIALS.name,
        email: DEMO_CREDENTIALS.email,
        companyName: DEMO_CREDENTIALS.companyName,
        role: DEMO_CREDENTIALS.role,
      });
    },
    [persistUser],
  );

  const loginAsDemo = useCallback(
    () =>
      persistUser({
        name: DEMO_CREDENTIALS.name,
        email: DEMO_CREDENTIALS.email,
        companyName: DEMO_CREDENTIALS.companyName,
        role: DEMO_CREDENTIALS.role,
      }),
    [persistUser],
  );

  const register = useCallback(
    (input: RegisterInput) =>
      persistUser({
        name: input.name.trim(),
        email: input.email.trim(),
        companyName: input.companyName.trim(),
        role: "Владелец бизнеса",
      }),
    [persistUser],
  );

  const logout = useCallback(() => {
    window.localStorage.removeItem(SESSION_KEY);
    setUser(null);
  }, []);

  const setSubscription = useCallback((next: Subscription) => {
    window.localStorage.setItem(SUBSCRIPTION_KEY, JSON.stringify(next));
    setSubscriptionState(next);
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      subscription,
      isAuthenticated: user !== null,
      isHydrated,
      login,
      loginAsDemo,
      register,
      logout,
      setSubscription,
    }),
    [user, subscription, isHydrated, login, loginAsDemo, register, logout, setSubscription],
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
