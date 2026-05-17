"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { loadKakaoMapSdk } from "@/lib/kakao-map-loader";
import type { RestaurantRow } from "@/lib/supabase/types";

type MapRestaurant = RestaurantRow & {
  latitude: number;
  longitude: number;
};

type MapInstance = {
  setCenter: (latLng: { getLat: () => number; getLng: () => number }) => void;
};

type MapMarker = {
  setMap: (map: MapInstance | null) => void;
  setPosition: (position: { getLat: () => number; getLng: () => number }) => void;
};

type MapInfoWindow = {
  open: (map: MapInstance, marker: MapMarker) => void;
  close: () => void;
};

export function KakaoMap({
  restaurants,
  heightClassName = "h-[62vh] min-h-80",
  showRestaurantList = true,
  defaultToCurrentLocation = false,
  level = 5,
}: {
  restaurants: RestaurantRow[];
  heightClassName?: string;
  showRestaurantList?: boolean;
  defaultToCurrentLocation?: boolean;
  level?: number;
}) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<MapInstance | null>(null);
  const markerRefs = useRef<Record<string, MapMarker>>({});
  const infoWindowRefs = useRef<Record<string, MapInfoWindow>>({});
  const [status, setStatus] = useState<"idle" | "loading" | "ready" | "error">("idle");
  const [selectedRestaurantId, setSelectedRestaurantId] = useState("");
  const [currentLocation, setCurrentLocation] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null);
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
    if (!defaultToCurrentLocation || !navigator.geolocation) {
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setCurrentLocation({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        });
      },
      () => {
        setCurrentLocation(null);
      },
      { enableHighAccuracy: true, maximumAge: 60_000, timeout: 5_000 },
    );
  }, [defaultToCurrentLocation]);

  useEffect(() => {
    if (
      !appKey ||
      (!defaultToCurrentLocation && mappedRestaurants.length === 0) ||
      !containerRef.current
    ) {
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
        const center = currentLocation ??
          (firstRestaurant
            ? {
                latitude: firstRestaurant.latitude,
                longitude: firstRestaurant.longitude,
              }
            : {
                latitude: 37.566826,
                longitude: 126.9786567,
              });
        const map = new window.kakao.maps.Map(containerRef.current, {
          center: new window.kakao.maps.LatLng(
            center.latitude,
            center.longitude,
          ),
          level,
        });
        mapRef.current = map;
        markerRefs.current = {};
        infoWindowRefs.current = {};

        for (const restaurant of mappedRestaurants) {
          const marker = new window.kakao.maps.Marker({
            map,
            position: new window.kakao.maps.LatLng(
              restaurant.latitude,
              restaurant.longitude,
            ),
          });
          const infoWindow = new window.kakao.maps.InfoWindow({
            content: `<div style="padding:8px 10px;font-size:13px;line-height:1.35;white-space:nowrap;"><strong>${escapeHtml(restaurant.name)}</strong>${restaurant.branch_name ? `<br><span>${escapeHtml(restaurant.branch_name)}</span>` : ""}<br><a href="/restaurants/${restaurant.id}" style="color:#267a59;text-decoration:underline;">상세 보기</a></div>`,
          });
          markerRefs.current[restaurant.id] = marker;
          infoWindowRefs.current[restaurant.id] = infoWindow;

          window.kakao.maps.event.addListener(marker, "click", () => {
            focusRestaurant(restaurant);
          });
        }

        setStatus("ready");
      });
    }

    initializeMap();

    return () => {
      cancelled = true;
    };
  }, [appKey, currentLocation, defaultToCurrentLocation, level, mappedRestaurants]);

  function focusRestaurant(restaurant: MapRestaurant) {
    if (!window.kakao || !mapRef.current) {
      return;
    }

    const marker = markerRefs.current[restaurant.id];
    const infoWindow = infoWindowRefs.current[restaurant.id];

    if (!marker || !infoWindow) {
      return;
    }

    Object.values(infoWindowRefs.current).forEach((window) => window.close());
    mapRef.current.setCenter(
      new window.kakao.maps.LatLng(restaurant.latitude, restaurant.longitude),
    );
    infoWindow.open(mapRef.current, marker);
    setSelectedRestaurantId(restaurant.id);
  }

  if (!appKey) {
    return (
      <MapNotice
        title="Kakao Maps 키가 필요합니다."
        body=".env.local에 NEXT_PUBLIC_KAKAO_MAP_APP_KEY를 설정하고 서버를 다시 시작하세요."
      />
    );
  }

  if (mappedRestaurants.length === 0 && !defaultToCurrentLocation) {
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
        <div className="grid gap-1.5 sm:grid-cols-2">
          {mappedRestaurants.map((restaurant) => (
            <div
              key={restaurant.id}
              className={`flex items-center justify-between gap-2 border bg-white/75 px-2.5 py-2 ${
                selectedRestaurantId === restaurant.id ? "border-leaf" : "border-line"
              }`}
            >
              <button
                type="button"
                onClick={() => focusRestaurant(restaurant)}
                className="min-w-0 flex-1 text-left"
              >
                <span className="block truncate text-sm font-medium">{restaurant.name}</span>
                {restaurant.branch_name ? (
                  <span className="block truncate text-xs text-ink/55">
                    {restaurant.branch_name}
                  </span>
                ) : null}
              </button>
              <Link
                href={`/restaurants/${restaurant.id}`}
                className="shrink-0 text-xs font-medium text-leaf underline"
              >
                상세
              </Link>
            </div>
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
