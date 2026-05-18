"use client";

import { useEffect, useMemo, useState } from "react";
import {
  LoadingState,
  LoginRequired,
  SetupRequired,
} from "@/components/app-state";
import { SelectInput } from "@/components/form-fields";
import { KakaoMap } from "@/components/kakao-map";
import { MultiSelectField, parseMultiValue } from "@/components/multi-select-field";
import { PageShell, SecondaryLink } from "@/components/page-shell";
import { getCachedJson } from "@/lib/client-cache";
import { cuisineOptions, foodTypeOptions } from "@/lib/restaurant-options";
import type { RestaurantRow } from "@/lib/supabase/types";
import { useAppSession } from "@/lib/use-app-session";

const locationFilterOptions = [
  { value: "all", label: "전체" },
  { value: "located", label: "지도 위치 있음" },
  { value: "unlocated", label: "지도 위치 없음" },
] as const;

const restaurantNameCollator = new Intl.Collator("ko-KR", {
  numeric: true,
  sensitivity: "base",
});

export default function MapPage() {
  const { authenticated, loading, configured } = useAppSession();
  const [restaurants, setRestaurants] = useState<RestaurantRow[]>([]);
  const [query, setQuery] = useState("");
  const [selectedCuisines, setSelectedCuisines] = useState<string[]>([]);
  const [selectedFoodTypes, setSelectedFoodTypes] = useState<string[]>([]);
  const [locationFilter, setLocationFilter] =
    useState<(typeof locationFilterOptions)[number]["value"]>("located");
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

  const visibleRestaurants = useMemo(() => {
    const normalized = query.trim().toLowerCase();

    return restaurants
      .filter((restaurant) => {
        const restaurantCuisines = parseMultiValue(restaurant.cuisine_category ?? "");
        const restaurantFoodTypes = parseMultiValue(restaurant.food_type ?? "");
        const hasLocation =
          typeof restaurant.latitude === "number" &&
          typeof restaurant.longitude === "number";

        if (
          normalized &&
          !`${restaurant.name} ${restaurant.branch_name ?? ""} ${restaurant.notes ?? ""} ${restaurant.cuisine_category ?? ""} ${restaurant.food_type ?? ""}`
            .toLowerCase()
            .includes(normalized)
        ) {
          return false;
        }

        if (
          selectedCuisines.length > 0 &&
          !selectedCuisines.some((category) => restaurantCuisines.includes(category))
        ) {
          return false;
        }

        if (
          selectedFoodTypes.length > 0 &&
          !selectedFoodTypes.some((category) => restaurantFoodTypes.includes(category))
        ) {
          return false;
        }

        if (locationFilter === "located" && !hasLocation) {
          return false;
        }

        if (locationFilter === "unlocated" && hasLocation) {
          return false;
        }

        return true;
      })
      .sort((left, right) => restaurantNameCollator.compare(left.name, right.name));
  }, [locationFilter, query, restaurants, selectedCuisines, selectedFoodTypes]);

  const hasActiveFilters = Boolean(
    query.trim() ||
      selectedCuisines.length > 0 ||
      selectedFoodTypes.length > 0 ||
      locationFilter !== "located",
  );

  function resetFilters() {
    setQuery("");
    setSelectedCuisines([]);
    setSelectedFoodTypes([]);
    setLocationFilter("located");
  }

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
          <div className="mb-4 grid gap-3 md:grid-cols-2 xl:grid-cols-[1fr_1fr_1fr_180px_auto]">
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="식당 검색"
              className="min-h-12 w-full border border-line bg-white px-3 text-base outline-none focus:border-leaf"
            />
            <MultiSelectField
              name="mapCuisineFilter"
              options={cuisineOptions}
              value={selectedCuisines}
              onChange={setSelectedCuisines}
              placeholder="음식권 전체"
            />
            <MultiSelectField
              name="mapFoodTypeFilter"
              options={foodTypeOptions}
              value={selectedFoodTypes}
              onChange={setSelectedFoodTypes}
              placeholder="메뉴 유형 전체"
            />
            <SelectInput
              value={locationFilter}
              onChange={(event) =>
                setLocationFilter(
                  event.target.value as (typeof locationFilterOptions)[number]["value"],
                )
              }
            >
              {locationFilterOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </SelectInput>
            <button
              type="button"
              onClick={resetFilters}
              disabled={!hasActiveFilters}
              className="min-h-11 border border-line bg-white px-3 text-sm font-medium text-ink disabled:cursor-not-allowed disabled:text-ink/30 md:col-span-2 xl:col-span-1"
            >
              필터 초기화
            </button>
          </div>
          <KakaoMap restaurants={visibleRestaurants} level={2} />
        </div>
      ) : null}
    </PageShell>
  );
}
