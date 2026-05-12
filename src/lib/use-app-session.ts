"use client";

export type { AppSessionState } from "@/components/app-session-provider";
import { useAppSessionContext } from "@/components/app-session-provider";

export function useAppSession() {
  return useAppSessionContext();
}
