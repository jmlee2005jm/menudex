"use client";

import { useAppSession } from "@/lib/use-app-session";

const defaultProfileIcon = "/defaulticon.png";

export function HeaderProfile() {
  const { authenticated, loading, profile } = useAppSession();

  if (loading || !authenticated || !profile) {
    return null;
  }

  return (
    <div className="flex min-w-0 items-center gap-2">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={profile.iconUrl ?? defaultProfileIcon}
        alt=""
        className="h-9 w-9 shrink-0 border border-line bg-white object-contain"
      />
      <span className="hidden max-w-28 truncate text-sm font-medium text-ink sm:inline">
        {profile.displayName}
      </span>
    </div>
  );
}
