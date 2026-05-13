"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { loadKakaoMapSdk } from "@/lib/kakao-map-loader";
import type { RestaurantRow } from "@/lib/supabase/types";

type MapRestaurant = RestaurantRow & {
  latitude: number;
  longitude: number;
};

export function KakaoMap({
  restaurants,
  heightClassName = "h-[62vh] min-h-80",
  showRestaurantList = true,
}: {
  restaurants: RestaurantRow[];
  heightClassName?: string;
  showRestaurantList?: boolean;
}) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [status, setStatus] = useState<"idle" | "loading" | "ready" | "error">("idle");
  const appKey = process.env.NEXT_PUBLIC_KAKAO_MAP_APP_KEY;
  const mappedRestaurants = useMemo(
    () =>
      restaurants.filter(
        (restaurant): restaurant is MapRestaurant =>
          typeof restaurant.latitude === "number" &&
          typeof restaurant.longitude === "number",
      ),
    [restaurants],
  );

  useEffect(() => {
    if (!appKey || mappedRestaurants.length === 0 || !containerRef.current) {
      return;
    }

    let cancelled = false;
    const kakaoAppKey = appKey;

    async function initializeMap() {
      setStatus("loading");

      try {
        await loadKakaoMapSdk(kakaoAppKey);
      } catch {
        if (!cancelled) {
          setStatus("error");
        }
        return;
      }

      if (cancelled || !containerRef.current || !window.kakao) {
        return;
      }

      window.kakao.maps.load(() => {
        if (cancelled || !containerRef.current || !window.kakao) {
          return;
        }

        const firstRestaurant = mappedRestaurants[0];
        const map = new window.kakao.maps.Map(containerRef.current, {
          center: new window.kakao.maps.LatLng(
            firstRestaurant.latitude,
            firstRestaurant.longitude,
          ),
          level: 5,
        });

        for (const restaurant of mappedRestaurants) {
          const marker = new window.kakao.maps.Marker({
            map,
            position: new window.kakao.maps.LatLng(
              restaurant.latitude,
              restaurant.longitude,
            ),
          });
          const infoWindow = new window.kakao.maps.InfoWindow({
            content: `<div style="padding:8px 10px;font-size:13px;line-height:1.35;white-space:nowrap;"><strong>${escapeHtml(restaurant.name)}</strong>${restaurant.branch_name ? `<br><span>${escapeHtml(restaurant.branch_name)}</span>` : ""}</div>`,
          });

          window.kakao.maps.event.addListener(marker, "click", () => {
            infoWindow.open(map, marker);
          });
        }

        setStatus("ready");
      });
    }

    initializeMap();

    return () => {
      cancelled = true;
    };
  }, [appKey, mappedRestaurants]);

  if (!appKey) {
    return (
      <MapNotice
        title="Kakao Maps 키가 필요합니다."
        body=".env.local에 NEXT_PUBLIC_KAKAO_MAP_APP_KEY를 설정하고 서버를 다시 시작하세요."
      />
    );
  }

  if (mappedRestaurants.length === 0) {
    return (
      <MapNotice
        title="지도에 표시할 식당이 없습니다."
        body="식당 수정 화면에서 장소를 검색하거나 지도에서 위치를 선택하면 이 지도에 표시됩니다."
      />
    );
  }

  return (
    <div className="grid gap-4">
      <div
        ref={containerRef}
        className={`${heightClassName} w-full border border-line bg-white`}
        aria-label="식당 지도"
      />
      {status === "loading" ? (
        <p className="text-sm text-ink/60">지도를 불러오는 중입니다.</p>
      ) : null}
      {status === "error" ? (
        <p className="text-sm text-red-700">
          Kakao 지도를 불러오지 못했습니다. Kakao Developers에서 지도/로컬
          서비스를 켜고 등록 도메인을 확인하세요.
        </p>
      ) : null}
      {showRestaurantList ? (
        <div className="grid gap-2 sm:grid-cols-2">
          {mappedRestaurants.map((restaurant) => (
            <Link
              key={restaurant.id}
              href={`/restaurants/${restaurant.id}`}
              className="border border-line bg-white/75 p-3"
            >
              <p className="font-medium">{restaurant.name}</p>
              {restaurant.branch_name ? (
                <p className="mt-0.5 text-sm text-ink/55">{restaurant.branch_name}</p>
              ) : null}
            </Link>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function MapNotice({ title, body }: { title: string; body: string }) {
  return (
    <div className="border border-dashed border-line bg-white/55 p-4">
      <p className="font-medium">{title}</p>
      <p className="mt-1 text-sm text-ink/60">{body}</p>
    </div>
  );
}

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (character) => {
    const entities: Record<string, string> = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;",
    };

    return entities[character] ?? character;
  });
}
