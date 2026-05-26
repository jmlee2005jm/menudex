"use client";

import { SlidersHorizontal } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import {
  LoadingState,
  LoginRequired,
  SetupRequired,
} from "@/components/app-state";
import { SelectInput } from "@/components/form-fields";
import { KakaoMap } from "@/components/kakao-map";
import {
  MultiSelectField,
  formatMultiValue,
  parseMultiValue,
} from "@/components/multi-select-field";
import { PageShell, PrimaryLink, SecondaryLink } from "@/components/page-shell";
import { PhotoLightbox } from "@/components/photo-lightbox";
import { RatingDisplay } from "@/components/rating-field";
import { clearCachedJson, getCachedJson } from "@/lib/client-cache";
import { cuisineOptions, foodTypeOptions } from "@/lib/restaurant-options";
import type { RestaurantRow } from "@/lib/supabase/types";
import { useAppSession } from "@/lib/use-app-session";

type RestaurantListVisit = {
  restaurant_id: string;
  visited_at: string;
  created_at?: string;
};

type RecentVisit = {
  id: string;
  restaurant_id: string;
  profile_id: string;
  visited_at: string;
  created_at: string;
  meal_type: "breakfast" | "lunch" | "dinner" | "other";
  profiles?: { display_name: string | null } | Array<{ display_name: string | null }> | null;
  visit_photos?: Array<{ visit_menu_item_id?: string | null; signedUrl?: string }>;
  visit_menu_items?: Array<{
    id: string;
    manual_menu_name: string | null;
    rating: number | null;
    menu_items?: { name: string | null } | Array<{ name: string | null }> | null;
  }>;
};

const mealLabels = {
  breakfast: "아침",
  lunch: "점심",
  dinner: "저녁",
  other: "기타",
};

const visitFilterOptions = [
  { value: "all", label: "전체" },
  { value: "visited", label: "방문한 곳" },
  { value: "unvisited", label: "미방문" },
] as const;

const locationFilterOptions = [
  { value: "all", label: "전체" },
  { value: "located", label: "지도 위치 있음" },
  { value: "unlocated", label: "지도 위치 없음" },
] as const;

const restaurantNameCollator = new Intl.Collator("ko-KR", {
  numeric: true,
  sensitivity: "base",
});

function compareVisitRecency(left: RestaurantListVisit, right: RestaurantListVisit) {
  return visitSortValue(right) - visitSortValue(left);
}

function visitSortValue(visit: RestaurantListVisit) {
  const visitedAt = new Date(visit.visited_at).getTime();
  const createdAt = visit.created_at ? new Date(visit.created_at).getTime() : 0;

  return visitedAt + createdAt / 10 ** 15;
}

export default function RestaurantsPage() {
  const router = useRouter();
  const { authenticated, loading, configured } = useAppSession();
  const [restaurants, setRestaurants] = useState<RestaurantRow[]>([]);
  const [visits, setVisits] = useState<RestaurantListVisit[]>([]);
  const [recentVisits, setRecentVisits] = useState<RecentVisit[]>([]);
  const [allRecentVisits, setAllRecentVisits] = useState<RecentVisit[]>([]);
  const [recentScope, setRecentScope] = useState<"mine" | "all">("mine");
  const [unlockedMenuCounts, setUnlockedMenuCounts] = useState<Record<string, number>>({});
  const [pendingReviewCount, setPendingReviewCount] = useState(0);
  const [query, setQuery] = useState("");
  const [sortBy, setSortBy] = useState<"name" | "lastVisit" | "visitCount">("lastVisit");
  const [sortDirection, setSortDirection] = useState<"desc" | "asc">("desc");
  const [selectedCuisines, setSelectedCuisines] = useState<string[]>([]);
  const [selectedFoodTypes, setSelectedFoodTypes] = useState<string[]>([]);
  const [visitFilter, setVisitFilter] =
    useState<(typeof visitFilterOptions)[number]["value"]>("all");
  const [locationFilter, setLocationFilter] =
    useState<(typeof locationFilterOptions)[number]["value"]>("all");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [dataLoading, setDataLoading] = useState(false);
  const [dataError, setDataError] = useState("");
  const [lightboxPhotoUrl, setLightboxPhotoUrl] = useState("");

  useEffect(() => {
    if (!authenticated) {
      return;
    }

    let mounted = true;

    async function loadData() {
      setDataLoading(true);
      setDataError("");

      const data = await getCachedJson<{
        restaurants?: RestaurantRow[];
        unlockedMenuCounts?: Record<string, number>;
        pendingReviewCount?: number;
        recentVisits?: RecentVisit[];
        allRecentVisits?: RecentVisit[];
        visits?: RestaurantListVisit[];
        error?: string;
      }>("/api/restaurants", 15_000);

      if (!mounted) {
        return;
      }

      if (data.error) {
        setDataError(data.error ?? "식당 목록을 불러오지 못했습니다.");
        setDataLoading(false);
        return;
      }

      setRestaurants(data.restaurants ?? []);
      setUnlockedMenuCounts(data.unlockedMenuCounts ?? {});
      setPendingReviewCount(data.pendingReviewCount ?? 0);
      setRecentVisits(data.recentVisits ?? []);
      setAllRecentVisits(data.allRecentVisits ?? []);
      setVisits(data.visits ?? []);
      setDataLoading(false);
    }

    loadData().catch(() => {
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
    const countVisits = (restaurantId: string) =>
      visits.filter((visit) => visit.restaurant_id === restaurantId).length;
    const latestVisitSortValue = (restaurantId: string) => {
      const latest = visits
        .filter((visit) => visit.restaurant_id === restaurantId)
        .sort(compareVisitRecency)[0];

      return latest ? visitSortValue(latest) : 0;
    };
    const normalized = query.trim().toLowerCase();
    const filtered = !normalized
      ? restaurants
      : restaurants.filter((restaurant) =>
          `${restaurant.name} ${restaurant.branch_name ?? ""} ${restaurant.notes ?? ""} ${restaurant.cuisine_category ?? ""} ${restaurant.food_type ?? ""}`
            .toLowerCase()
            .includes(normalized),
        );
    const filteredByOptions = filtered.filter((restaurant) => {
      const restaurantCuisines = parseMultiValue(restaurant.cuisine_category ?? "");
      const restaurantFoodTypes = parseMultiValue(restaurant.food_type ?? "");
      const restaurantVisitCount = countVisits(restaurant.id);
      const hasLocation =
        typeof restaurant.latitude === "number" &&
        typeof restaurant.longitude === "number";

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

      if (visitFilter === "visited" && restaurantVisitCount === 0) {
        return false;
      }

      if (visitFilter === "unvisited" && restaurantVisitCount > 0) {
        return false;
      }

      if (locationFilter === "located" && !hasLocation) {
        return false;
      }

      if (locationFilter === "unlocated" && hasLocation) {
        return false;
      }

      return true;
    });

    return [...filteredByOptions].sort((left, right) => {
      const direction = sortDirection === "asc" ? 1 : -1;
      const nameOrder = restaurantNameCollator.compare(left.name, right.name);

      if (sortBy === "name") {
        return nameOrder * direction;
      }

      if (sortBy === "visitCount") {
        return (
          (countVisits(left.id) - countVisits(right.id) || nameOrder) *
          direction
        );
      }

      return (
        (latestVisitSortValue(left.id) - latestVisitSortValue(right.id) || nameOrder) *
        direction
      );
    });
  }, [
    locationFilter,
    query,
    restaurants,
    selectedCuisines,
    selectedFoodTypes,
    sortBy,
    sortDirection,
    visitFilter,
    visits,
  ]);
  const displayedRecentVisits = (
    recentScope === "mine" ? recentVisits : allRecentVisits
  ).slice(0, 4);

  function visitCount(restaurantId: string) {
    return visits.filter((visit) => visit.restaurant_id === restaurantId).length;
  }

  function lastVisitTime(restaurantId: string) {
    const latest = visits
      .filter((visit) => visit.restaurant_id === restaurantId)
      .sort(compareVisitRecency)[0];

    return latest ? new Date(latest.visited_at).getTime() : 0;
  }

  function resetFilters() {
    setSelectedCuisines([]);
    setSelectedFoodTypes([]);
    setVisitFilter("all");
    setLocationFilter("all");
  }

  const hasActiveFilters =
    selectedCuisines.length > 0 ||
    selectedFoodTypes.length > 0 ||
    visitFilter !== "all" ||
    locationFilter !== "all";
  const activeFilterCount =
    selectedCuisines.length +
    selectedFoodTypes.length +
    (visitFilter !== "all" ? 1 : 0) +
    (locationFilter !== "all" ? 1 : 0);

  function restaurantLabel(restaurantId: string) {
    const restaurant = restaurants.find((item) => item.id === restaurantId);

    if (!restaurant) {
      return "식당";
    }

    return [restaurant.name, restaurant.branch_name].filter(Boolean).join(" ");
  }

  function menuName(item: NonNullable<RecentVisit["visit_menu_items"]>[number]) {
    const linkedMenuName = Array.isArray(item.menu_items)
      ? item.menu_items[0]?.name
      : item.menu_items?.name;

    return item.manual_menu_name ?? linkedMenuName ?? "메뉴";
  }

  function profileName(visit: RecentVisit) {
    const profile = Array.isArray(visit.profiles) ? visit.profiles[0] : visit.profiles;

    return profile?.display_name ?? "프로필";
  }

  async function handleProfileChange() {
    clearCachedJson("/api/session");
    clearCachedJson("/api/restaurants");
    clearCachedJson("/api/visits");
    await fetch("/api/session", { method: "DELETE" });
    router.refresh();
    window.location.href = "/profiles";
  }

  return (
    <PageShell
      eyebrow="MenuDex"
      title="식당 목록"
      action={
        authenticated ? (
          <button
            type="button"
            onClick={handleProfileChange}
            className="inline-flex min-h-11 shrink-0 items-center justify-center border border-line bg-white px-3 text-sm font-medium text-ink sm:px-4"
          >
            프로필 변경
          </button>
        ) : null
      }
      titleAction={
        authenticated ? (
          <div className="flex flex-wrap items-center justify-end gap-2">
            <SecondaryLink href="/map">지도</SecondaryLink>
            <PrimaryLink href="/restaurants/new">식당 추가</PrimaryLink>
          </div>
        ) : null
      }
    >
      {!configured ? <SetupRequired /> : null}
      {configured && loading ? <LoadingState /> : null}
      {configured && !loading && !authenticated ? <LoginRequired /> : null}
      {configured && authenticated ? (
        <>
          <div className="mt-6 grid max-w-4xl gap-3 sm:grid-cols-[1fr_180px_44px_auto]">
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="식당 검색"
              className="min-h-12 w-full border border-line bg-white px-3 text-base outline-none focus:border-leaf"
            />
            <div className="grid grid-cols-[1fr_44px_44px] gap-3 sm:contents">
              <SelectInput
                value={sortBy}
                onChange={(event) => {
                  const nextSortBy = event.target.value as
                    | "name"
                    | "lastVisit"
                    | "visitCount";
                  setSortBy(nextSortBy);
                  setSortDirection(nextSortBy === "name" ? "asc" : "desc");
                }}
              >
                <option value="lastVisit">최근 방문</option>
                <option value="visitCount">최다 방문</option>
                <option value="name">이름</option>
              </SelectInput>
              <button
                type="button"
                aria-label={sortDirection === "desc" ? "내림차순" : "오름차순"}
                title={sortDirection === "desc" ? "내림차순" : "오름차순"}
                onClick={() =>
                  setSortDirection((current) => (current === "desc" ? "asc" : "desc"))
                }
                className="inline-flex min-h-11 items-center justify-center border border-line bg-white text-xl font-medium text-ink"
              >
                {sortDirection === "desc" ? "↓" : "↑"}
              </button>
              <button
                type="button"
                onClick={() => setFiltersOpen((current) => !current)}
                aria-label={filtersOpen ? "필터 닫기" : "필터 열기"}
                title={filtersOpen ? "필터 닫기" : "필터 열기"}
                className={`relative inline-flex min-h-11 w-11 items-center justify-center border ${
                  filtersOpen || hasActiveFilters
                    ? "border-leaf bg-white text-leaf"
                    : "border-line bg-white text-ink"
                }`}
              >
                <SlidersHorizontal size={19} strokeWidth={2.2} aria-hidden="true" />
                {activeFilterCount > 0 ? (
                  <span className="absolute right-0 top-0 grid h-4 min-w-4 translate-x-1/3 -translate-y-1/3 place-items-center bg-leaf px-1 text-[10px] font-semibold leading-none text-white">
                    {activeFilterCount}
                  </span>
                ) : null}
              </button>
            </div>
          </div>

          {filtersOpen ? (
            <div className="mt-3 grid max-w-5xl gap-3 border border-line bg-white/60 p-3 md:grid-cols-2 xl:grid-cols-[1fr_1fr_160px_180px_auto]">
              <MultiSelectField
                name="cuisineFilter"
                options={cuisineOptions}
                value={selectedCuisines}
                onChange={setSelectedCuisines}
                placeholder="음식권 전체"
              />
              <MultiSelectField
                name="foodTypeFilter"
                options={foodTypeOptions}
                value={selectedFoodTypes}
                onChange={setSelectedFoodTypes}
                placeholder="메뉴 유형 전체"
              />
              <SelectInput
                value={visitFilter}
                onChange={(event) =>
                  setVisitFilter(
                    event.target.value as (typeof visitFilterOptions)[number]["value"],
                  )
                }
              >
                {visitFilterOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </SelectInput>
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
          ) : null}

          {pendingReviewCount > 0 ? (
            <Link
              href="/visits"
              className="mt-4 flex items-center justify-between gap-3 border-2 border-yellow-400 bg-yellow-200 px-4 py-3 text-ink shadow-[0_0_0_3px_rgba(250,204,21,0.25)]"
            >
              <span className="font-bold">평가 대기 {pendingReviewCount}개</span>
              <span className="text-sm font-semibold underline">별점 남기기</span>
            </Link>
          ) : null}

          {dataLoading ? <LoadingState /> : null}
          {dataError ? <p className="mt-4 text-sm text-red-700">{dataError}</p> : null}

          <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem] lg:items-start">
            <div className="grid gap-3">
              {visibleRestaurants.map((restaurant) => {
                const triedCount = visitCount(restaurant.id);
                const unlockedMenus = unlockedMenuCounts[restaurant.id] ?? 0;
                const lastVisit = lastVisitTime(restaurant.id);

                return (
                  <Link
                    key={restaurant.id}
                    href={`/restaurants/${restaurant.id}`}
                    className="flex items-start gap-3 border border-line bg-white/75 p-4"
                  >
                    {restaurant.iconUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={restaurant.iconUrl}
                        alt=""
                        className="h-12 w-12 shrink-0 border border-line bg-white object-contain"
                      />
                    ) : null}
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
                        <h2 className="break-words text-lg font-semibold">{restaurant.name}</h2>
                        {restaurant.branch_name ? (
                          <p className="text-sm text-ink/55">{restaurant.branch_name}</p>
                        ) : null}
                      </div>
                      <p className="mt-1 text-sm text-ink/60">
                        {triedCount}회 방문 · 해금된 메뉴{" "}
                        {restaurant.total_menu_goal !== null && restaurant.total_menu_goal > 0
                          ? `${unlockedMenus}/${restaurant.total_menu_goal}`
                          : `${unlockedMenus}/?`}
                        {lastVisit
                          ? ` · 최근 방문 ${new Date(lastVisit).toISOString().slice(0, 10)}`
                          : ""}
                      </p>
                      {restaurant.cuisine_category || restaurant.food_type ? (
                        <p className="mt-1 text-sm text-ink/60">
                          {[
                            formatMultiValue(restaurant.cuisine_category),
                            formatMultiValue(restaurant.food_type),
                          ]
                            .filter(Boolean)
                            .join(" · ")}
                        </p>
                      ) : null}
                      {restaurant.notes ? (
                        <p className="mt-2 text-sm text-ink/60">{restaurant.notes}</p>
                      ) : null}
                    </div>
                  </Link>
                );
              })}
            </div>

            <aside className="order-first grid gap-4 lg:sticky lg:top-5 lg:order-none lg:max-h-[calc(100vh-2.5rem)] lg:grid-rows-[auto_minmax(0,1fr)]">
              <section className="border border-line bg-white/60 p-4">
                <h2 className="text-base font-semibold">식당 위치</h2>
                <div className="mt-3">
                  <KakaoMap
                    restaurants={restaurants}
                    heightClassName="h-64 min-h-64"
                    showRestaurantList={false}
                    defaultToCurrentLocation
                    level={3}
                  />
                </div>
              </section>

              <section className="flex max-h-[calc(100vh-2rem)] min-h-0 flex-col border border-line bg-white/60 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h2 className="text-base font-semibold">최근 방문</h2>
                    <div className="mt-2 inline-flex border border-line bg-white text-sm">
                      <button
                        type="button"
                        onClick={() => setRecentScope("mine")}
                        className={`min-h-9 px-3 ${
                          recentScope === "mine" ? "bg-ink text-white" : "text-ink"
                        }`}
                      >
                        내 최근
                      </button>
                      <button
                        type="button"
                        onClick={() => setRecentScope("all")}
                        className={`min-h-9 px-3 ${
                          recentScope === "all" ? "bg-ink text-white" : "text-ink"
                        }`}
                      >
                        전체 최근
                      </button>
                    </div>
                  </div>
                  <Link
                    href={`/visits?scope=${recentScope}`}
                    className="shrink-0 text-sm font-medium text-leaf underline"
                  >
                    더 보기
                  </Link>
                </div>
                <div className="mt-3 grid min-h-0 gap-3 overflow-y-auto pr-1">
                  {displayedRecentVisits.map((visit) => (
                    <div
                      key={visit.id}
                      className="border border-line bg-white/75 p-3"
                    >
                      <Link
                        href={`/restaurants/${visit.restaurant_id}`}
                        className="block truncate font-medium"
                      >
                        {restaurantLabel(visit.restaurant_id)}
                      </Link>
                      <p className="mt-1 text-sm text-ink/55">
                        {visit.visited_at.slice(0, 10)} · {mealLabels[visit.meal_type]}
                        {" · "}
                        {profileName(visit)}
                      </p>
                      <div className="mt-2 grid gap-1">
                        {(visit.visit_menu_items ?? []).map((item, index) => (
                          <div
                            key={`${visit.id}-${index}`}
                            className="flex min-w-0 items-center justify-between gap-2 text-sm"
                          >
                            <div className="flex min-w-0 items-center gap-2">
                              {visitPhotoUrlForMenu(visit, item.id) ? (
                                <button
                                  type="button"
                                  onClick={() =>
                                    setLightboxPhotoUrl(visitPhotoUrlForMenu(visit, item.id) ?? "")
                                  }
                                  className="shrink-0"
                                  aria-label="방문 사진 크게 보기"
                                >
                                  {/* eslint-disable-next-line @next/next/no-img-element */}
                                  <img
                                    src={visitPhotoUrlForMenu(visit, item.id)}
                                    alt=""
                                    className="h-9 w-9 border border-line bg-white object-cover"
                                  />
                                </button>
                              ) : null}
                              <span className="truncate">{menuName(item)}</span>
                              {!item.rating ? (
                                <span className="shrink-0 bg-yellow-300 px-1.5 py-0.5 text-xs font-bold text-ink">
                                  평가 대기
                                </span>
                              ) : null}
                            </div>
                            <RatingDisplay value={item.rating} />
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                  {displayedRecentVisits.length === 0 ? (
                    <p className="text-sm text-ink/60">아직 방문 기록이 없습니다.</p>
                  ) : null}
                </div>
              </section>
            </aside>
          </div>

          {!dataLoading && visibleRestaurants.length === 0 ? (
            <div className="mt-6 border border-dashed border-line bg-white/50 p-4">
              <p className="text-ink/65">
                {query.trim() ? "검색 결과가 없습니다." : "아직 식당이 없습니다."}
              </p>
              {!query.trim() ? (
                <div className="mt-4">
                  <PrimaryLink href="/restaurants/new">첫 식당 추가</PrimaryLink>
                </div>
              ) : null}
            </div>
          ) : null}
          {lightboxPhotoUrl ? (
            <PhotoLightbox
              imageUrl={lightboxPhotoUrl}
              onClose={() => setLightboxPhotoUrl("")}
            />
          ) : null}
        </>
      ) : null}
    </PageShell>
  );
}

function visitPhotoUrlForMenu(visit: RecentVisit, visitMenuItemId: string) {
  return visit.visit_photos?.find((photo) => {
    if (photo.visit_menu_item_id === visitMenuItemId) {
      return Boolean(photo.signedUrl);
    }

    return (
      !photo.visit_menu_item_id &&
      (visit.visit_menu_items ?? []).length === 1 &&
      Boolean(photo.signedUrl)
    );
  })?.signedUrl;
}
