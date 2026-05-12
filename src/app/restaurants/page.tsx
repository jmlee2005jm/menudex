"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import {
  LoadingState,
  LoginRequired,
  SetupRequired,
} from "@/components/app-state";
import { SelectInput } from "@/components/form-fields";
import { formatMultiValue } from "@/components/multi-select-field";
import { PageShell, PrimaryLink } from "@/components/page-shell";
import type { MenuItemRow, RestaurantRow, VisitRow } from "@/lib/supabase/types";
import { useAppSession } from "@/lib/use-app-session";

const defaultProfileIcon = "/defaulticon.png";

export default function RestaurantsPage() {
  const router = useRouter();
  const { authenticated, loading, configured, profile } = useAppSession();
  const [restaurants, setRestaurants] = useState<RestaurantRow[]>([]);
  const [menuItems, setMenuItems] = useState<MenuItemRow[]>([]);
  const [visits, setVisits] = useState<VisitRow[]>([]);
  const [query, setQuery] = useState("");
  const [sortBy, setSortBy] = useState<"name" | "lastVisit" | "visitCount">("lastVisit");
  const [sortDirection, setSortDirection] = useState<"desc" | "asc">("desc");
  const [dataLoading, setDataLoading] = useState(false);
  const [dataError, setDataError] = useState("");

  useEffect(() => {
    if (!authenticated) {
      return;
    }

    let mounted = true;

    async function loadData() {
      setDataLoading(true);
      setDataError("");

      const response = await fetch("/api/restaurants", { cache: "no-store" });
      const data = (await response.json()) as {
        restaurants?: RestaurantRow[];
        menuItems?: MenuItemRow[];
        visits?: VisitRow[];
        error?: string;
      };

      if (!mounted) {
        return;
      }

      if (!response.ok) {
        setDataError(data.error ?? "식당 목록을 불러오지 못했습니다.");
        setDataLoading(false);
        return;
      }

      setRestaurants(data.restaurants ?? []);
      setMenuItems(data.menuItems ?? []);
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
    const latestVisit = (restaurantId: string) => {
      const times = visits
        .filter((visit) => visit.restaurant_id === restaurantId)
        .map((visit) => new Date(visit.visited_at).getTime());

      return times.length ? Math.max(...times) : 0;
    };
    const normalized = query.trim().toLowerCase();
    const filtered = !normalized
      ? restaurants
      : restaurants.filter((restaurant) =>
          `${restaurant.name} ${restaurant.branch_name ?? ""} ${restaurant.notes ?? ""} ${restaurant.cuisine_category ?? ""} ${restaurant.food_type ?? ""}`
            .toLowerCase()
            .includes(normalized),
        );

    return [...filtered].sort((left, right) => {
      const direction = sortDirection === "asc" ? 1 : -1;

      if (sortBy === "name") {
        return left.name.localeCompare(right.name, "ko") * direction;
      }

      if (sortBy === "visitCount") {
        return (
          (countVisits(left.id) - countVisits(right.id) ||
            left.name.localeCompare(right.name, "ko")) *
          direction
        );
      }

      return (
        (latestVisit(left.id) - latestVisit(right.id) ||
          left.name.localeCompare(right.name, "ko")) * direction
      );
    });
  }, [restaurants, query, sortBy, sortDirection, visits]);

  function visitCount(restaurantId: string) {
    return visits.filter((visit) => visit.restaurant_id === restaurantId).length;
  }

  function lastVisitTime(restaurantId: string) {
    const times = visits
      .filter((visit) => visit.restaurant_id === restaurantId)
      .map((visit) => new Date(visit.visited_at).getTime());

    return times.length ? Math.max(...times) : 0;
  }

  async function handleProfileChange() {
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
          <div className="flex items-center justify-end gap-2">
            {profile ? (
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
            ) : null}
            <button
              type="button"
              onClick={handleProfileChange}
              className="inline-flex min-h-11 shrink-0 items-center justify-center border border-line bg-white px-3 text-sm font-medium text-ink sm:px-4"
            >
              프로필 변경
            </button>
          </div>
        ) : null
      }
      titleAction={authenticated ? <PrimaryLink href="/restaurants/new">식당 추가</PrimaryLink> : null}
    >
      {!configured ? <SetupRequired /> : null}
      {configured && loading ? <LoadingState /> : null}
      {configured && !loading && !authenticated ? <LoginRequired /> : null}
      {configured && authenticated ? (
        <>
          <div className="mt-6 grid max-w-3xl gap-3 sm:grid-cols-[1fr_180px_44px]">
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="식당 검색"
              className="min-h-12 w-full border border-line bg-white px-3 text-base outline-none focus:border-leaf"
            />
            <div className="grid grid-cols-[1fr_44px] gap-3 sm:contents">
              <SelectInput
                value={sortBy}
                onChange={(event) =>
                  setSortBy(event.target.value as "name" | "lastVisit" | "visitCount")
                }
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
            </div>
          </div>

          {dataLoading ? <LoadingState /> : null}
          {dataError ? <p className="mt-4 text-sm text-red-700">{dataError}</p> : null}

          <div className="mt-6 grid gap-3">
            {visibleRestaurants.map((restaurant) => {
              const triedCount = visitCount(restaurant.id);
              const knownItems = menuItems.filter(
                (item) => item.restaurant_id === restaurant.id && item.is_active,
              ).length;
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
                  ) : (
                    <div className="grid h-12 w-12 shrink-0 place-items-center border border-line bg-white text-sm font-semibold text-ink/50">
                      {restaurant.name.slice(0, 1)}
                    </div>
                  )}
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
                      <h2 className="break-words text-lg font-semibold">{restaurant.name}</h2>
                      {restaurant.branch_name ? (
                        <p className="text-sm text-ink/55">{restaurant.branch_name}</p>
                      ) : null}
                    </div>
                    <p className="mt-1 text-sm text-ink/60">
                      방문 {triedCount}회 · 알려진 메뉴 {knownItems}개
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
        </>
      ) : null}
    </PageShell>
  );
}
