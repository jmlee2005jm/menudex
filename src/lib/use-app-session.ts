"use client";

import { useEffect, useState } from "react";

export type AppSessionState = {
  authenticated: boolean;
  configured: boolean;
  loading: boolean;
  profile: { id: string; displayName: string; iconUrl?: string } | null;
};

export function useAppSession(): AppSessionState {
  const [state, setState] = useState<AppSessionState>({
    authenticated: false,
    configured: true,
    loading: true,
    profile: null,
  });

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
        setState({ authenticated: false, configured: false, loading: false, profile: null });
      }
    });

    return () => {
      mounted = false;
    };
  }, []);

  return state;
}
