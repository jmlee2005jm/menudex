"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import type { ReactNode } from "react";

export type AppSessionState = {
  authenticated: boolean;
  configured: boolean;
  loading: boolean;
  profile: { id: string; displayName: string; iconUrl?: string } | null;
};

const initialSessionState: AppSessionState = {
  authenticated: false,
  configured: true,
  loading: true,
  profile: null,
};

const AppSessionContext = createContext<AppSessionState>(initialSessionState);

export function AppSessionProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AppSessionState>(initialSessionState);

  useEffect(() => {
    let mounted = true;

    async function loadSession() {
      const response = await fetch("/api/session", { cache: "no-store" });
      const data = (await response.json()) as {
        configured?: boolean;
        authenticated?: boolean;
        profile?: { id: string; displayName: string; iconUrl?: string } | null;
      };

      if (!mounted) {
        return;
      }

      setState({
        configured: Boolean(data.configured),
        authenticated: Boolean(data.authenticated),
        profile: data.profile ?? null,
        loading: false,
      });
    }

    loadSession().catch(() => {
      if (mounted) {
        setState({
          authenticated: false,
          configured: false,
          loading: false,
          profile: null,
        });
      }
    });

    return () => {
      mounted = false;
    };
  }, []);

  const value = useMemo(() => state, [state]);

  return (
    <AppSessionContext.Provider value={value}>{children}</AppSessionContext.Provider>
  );
}

export function useAppSessionContext() {
  return useContext(AppSessionContext);
}
