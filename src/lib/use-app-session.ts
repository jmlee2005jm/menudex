"use client";

import { useEffect, useState } from "react";

export type AppSessionState = {
  authenticated: boolean;
  configured: boolean;
  loading: boolean;
};

export function useAppSession(): AppSessionState {
  const [state, setState] = useState<AppSessionState>({
    authenticated: false,
    configured: true,
    loading: true,
  });

  useEffect(() => {
    let mounted = true;

    async function loadSession() {
      const response = await fetch("/api/session", { cache: "no-store" });
      const data = (await response.json()) as {
        configured?: boolean;
        authenticated?: boolean;
      };

      if (!mounted) {
        return;
      }

      setState({
        configured: Boolean(data.configured),
        authenticated: Boolean(data.authenticated),
        loading: false,
      });
    }

    loadSession().catch(() => {
      if (mounted) {
        setState({ authenticated: false, configured: false, loading: false });
      }
    });

    return () => {
      mounted = false;
    };
  }, []);

  return state;
}
