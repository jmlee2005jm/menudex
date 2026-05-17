"use client";

import { KeyboardEvent, useEffect, useRef, useState } from "react";
import { loadKakaoMapSdk } from "@/lib/kakao-map-loader";

const DEFAULT_CENTER = {
  latitude: 37.566826,
  longitude: 126.9786567,
};

type PlaceResult = {
  id: string;
  place_name: string;
  road_address_name?: string;
  address_name?: string;
  x: string;
  y: string;
};

type SelectedLocation = {
  latitude: number | null;
  longitude: number | null;
  label: string;
};

type PickerLatLng = {
  getLat: () => number;
  getLng: () => number;
};

type PickerMap = {
  setCenter: (latLng: PickerLatLng) => void;
};

type PickerMarker = {
  setMap: (map: PickerMap | null) => void;
  setPosition: (position: PickerLatLng) => void;
};

export function KakaoPlacePicker({
  defaultLatitude,
  defaultLongitude,
  defaultQuery = "",
}: {
  defaultLatitude?: number | null;
  defaultLongitude?: number | null;
  defaultQuery?: string;
}) {
  const appKey = process.env.NEXT_PUBLIC_KAKAO_MAP_APP_KEY;
  const mapRef = useRef<HTMLDivElement | null>(null);
  const markerRef = useRef<PickerMarker | null>(null);
  const mapInstanceRef = useRef<PickerMap | null>(null);
  const [query, setQuery] = useState(defaultQuery);
  const [places, setPlaces] = useState<PlaceResult[]>([]);
  const [status, setStatus] = useState<"idle" | "loading" | "ready" | "error">("idle");
  const [searchMessage, setSearchMessage] = useState("");
  const [selected, setSelected] = useState<SelectedLocation>({
    latitude: defaultLatitude ?? null,
    longitude: defaultLongitude ?? null,
    label:
      typeof defaultLatitude === "number" && typeof defaultLongitude === "number"
        ? "저장된 위치"
        : "",
  });

  useEffect(() => {
    if (!appKey || !mapRef.current) {
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

      if (cancelled || !mapRef.current || !window.kakao) {
        return;
      }

      window.kakao.maps.load(() => {
        if (cancelled || !mapRef.current || !window.kakao) {
          return;
        }

        const latitude = defaultLatitude ?? DEFAULT_CENTER.latitude;
        const longitude = defaultLongitude ?? DEFAULT_CENTER.longitude;
        const center = new window.kakao.maps.LatLng(latitude, longitude);
        const map = new window.kakao.maps.Map(mapRef.current, {
          center,
          level: defaultLatitude && defaultLongitude ? 3 : 7,
        });
        mapInstanceRef.current = map;

        if (typeof defaultLatitude === "number" && typeof defaultLongitude === "number") {
          markerRef.current = new window.kakao.maps.Marker({
            map,
            position: center,
          });
        }

        window.kakao.maps.event.addListener(map, "click", (event) => {
          const next = event.latLng;
          selectCoordinates(next.getLat(), next.getLng(), "지도에서 선택한 위치");
        });

        setStatus("ready");
      });
    }

    initializeMap();

    return () => {
      cancelled = true;
    };
  }, [appKey, defaultLatitude, defaultLongitude]);

  function selectCoordinates(latitude: number, longitude: number, label: string) {
    setSelected({ latitude, longitude, label });

    if (!window.kakao || !mapInstanceRef.current) {
      return;
    }

    const position = new window.kakao.maps.LatLng(latitude, longitude);
    mapInstanceRef.current.setCenter(position);

    if (!markerRef.current) {
      markerRef.current = new window.kakao.maps.Marker({
        map: mapInstanceRef.current,
        position,
      });
      return;
    }

    markerRef.current.setPosition(position);
    markerRef.current.setMap(mapInstanceRef.current);
  }

  function handleSearch() {
    const keyword = query.trim();

    if (!keyword || !window.kakao?.maps.services) {
      return;
    }

    setSearchMessage("");
    const placesService = new window.kakao.maps.services.Places();
    placesService.keywordSearch(
      keyword,
      (result, searchStatus) => {
        if (searchStatus === window.kakao?.maps.services.Status.OK) {
          setPlaces(result);
          return;
        }

        setPlaces([]);
        setSearchMessage(
          searchStatus === window.kakao?.maps.services.Status.ZERO_RESULT
            ? "검색 결과가 없습니다. 지도를 눌러 위치를 선택할 수 있습니다."
            : "장소 검색에 실패했습니다.",
        );
      },
      { size: 8 },
    );
  }

  function selectPlace(place: PlaceResult) {
    selectCoordinates(Number(place.y), Number(place.x), place.place_name);
    setPlaces([]);
    setSearchMessage("");
  }

  function handleSearchKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key !== "Enter") {
      return;
    }

    event.preventDefault();
    handleSearch();
  }

  if (!appKey) {
    return (
      <div className="border border-dashed border-line bg-white/55 p-3 text-sm text-ink/60">
        Kakao Maps 키를 설정하면 장소 검색과 지도 선택을 사용할 수 있습니다.
        <input name="latitude" type="hidden" value="" />
        <input name="longitude" type="hidden" value="" />
      </div>
    );
  }

  return (
    <div className="grid gap-3">
      <input name="latitude" type="hidden" value={selected.latitude ?? ""} />
      <input name="longitude" type="hidden" value={selected.longitude ?? ""} />
      <div className="grid gap-2 sm:grid-cols-[1fr_auto]">
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          onKeyDown={handleSearchKeyDown}
          className="min-h-11 w-full border border-line bg-white px-3 text-base outline-none focus:border-leaf"
          placeholder="식당 이름으로 검색"
        />
        <button
          type="button"
          onClick={handleSearch}
          disabled={status !== "ready"}
          className="inline-flex min-h-11 items-center justify-center bg-ink px-4 text-sm font-medium text-white disabled:bg-ink/35"
        >
          검색
        </button>
      </div>
      {places.length > 0 ? (
        <div className="max-h-56 overflow-auto border border-line bg-white">
          {places.map((place) => (
            <button
              key={place.id}
              type="button"
              onClick={() => selectPlace(place)}
              className="block w-full border-b border-line px-3 py-2 text-left last:border-b-0"
            >
              <span className="block text-sm font-medium">{place.place_name}</span>
              <span className="block truncate text-xs text-ink/55">
                {place.road_address_name || place.address_name || "주소 없음"}
              </span>
            </button>
          ))}
        </div>
      ) : null}
      {searchMessage ? <p className="text-sm text-ink/60">{searchMessage}</p> : null}
      <div
        ref={mapRef}
        className="h-60 min-h-60 w-full border border-line bg-white"
        aria-label="식당 위치 선택 지도"
      />
      {status === "loading" ? <p className="text-sm text-ink/60">지도를 불러오는 중입니다.</p> : null}
      {status === "error" ? (
        <p className="text-sm text-red-700">
          Kakao 지도를 불러오지 못했습니다. Kakao Developers에서 지도/로컬
          서비스를 켜고 등록 도메인을 확인하세요.
        </p>
      ) : null}
      {typeof selected.latitude === "number" && typeof selected.longitude === "number" ? (
        <p className="text-sm text-ink/60">
          선택됨: {selected.label}
        </p>
      ) : (
        <p className="text-sm text-ink/55">
          검색 결과를 선택하거나 지도를 눌러 위치를 지정하세요.
        </p>
      )}
    </div>
  );
}
