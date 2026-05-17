"use client";

import { useEffect, useState } from "react";
import {
  LoadingState,
  LoginRequired,
  SetupRequired,
} from "@/components/app-state";
import { KakaoMap } from "@/components/kakao-map";
import { PageShell, SecondaryLink } from "@/components/page-shell";
import { getCachedJson } from "@/lib/client-cache";
import type { RestaurantRow } from "@/lib/supabase/types";
import { useAppSession } from "@/lib/use-app-session";

export default function MapPage() {
  const { authenticated, loading, configured } = useAppSession();
  const [restaurants, setRestaurants] = useState<RestaurantRow[]>([]);
  const [dataLoading, setDataLoading] = useState(false);
  const [dataError, setDataError] = useState("");

  useEffect(() => {
    if (!authenticated) {
      return;
    }

    let mounted = true;

    async function loadRestaurants() {
      setDataLoading(true);
      setDataError("");

      const data = await getCachedJson<{
        restaurants?: RestaurantRow[];
        error?: string;
      }>("/api/restaurants", 15_000);

      if (!mounted) {
        return;
      }

      if (data.error) {
        setDataError(data.error);
        setDataLoading(false);
        return;
      }

      setRestaurants(data.restaurants ?? []);
      setDataLoading(false);
    }

    loadRestaurants().catch(() => {
      if (mounted) {
        setDataError("식당 목록을 불러오지 못했습니다.");
        setDataLoading(false);
      }
    });

    return () => {
      mounted = false;
    };
  }, [authenticated]);

  return (
    <PageShell
      eyebrow="지도"
      title="식당 지도"
      action={<SecondaryLink href="/restaurants">식당 목록</SecondaryLink>}
    >
      {!configured ? <SetupRequired /> : null}
      {configured && loading ? <LoadingState /> : null}
      {configured && !loading && !authenticated ? <LoginRequired /> : null}
      {configured && authenticated && dataLoading ? <LoadingState /> : null}
      {dataError ? <p className="mt-4 text-sm text-red-700">{dataError}</p> : null}
      {configured && authenticated && !dataLoading ? (
        <div className="mt-6">
          <KakaoMap restaurants={restaurants} level={2} />
        </div>
      ) : null}
    </PageShell>
  );
}
