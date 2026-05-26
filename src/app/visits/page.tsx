"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  LoadingState,
  LoginRequired,
  SetupRequired,
} from "@/components/app-state";
import { PageShell, SecondaryLink } from "@/components/page-shell";
import { PhotoLightbox } from "@/components/photo-lightbox";
import { RatingDisplay } from "@/components/rating-field";
import { getCachedJson } from "@/lib/client-cache";
import { useAppSession } from "@/lib/use-app-session";

type RecentVisit = {
  id: string;
  restaurant_id: string;
  profile_id: string;
  visited_at: string;
  created_at: string;
  meal_type: "breakfast" | "lunch" | "dinner" | "other";
  profiles?: { display_name: string | null } | Array<{ display_name: string | null }> | null;
  restaurants?: { name: string | null; branch_name: string | null } | Array<{
    name: string | null;
    branch_name: string | null;
  }> | null;
  visit_photos?: Array<{ visit_menu_item_id?: string | null; signedUrl?: string }>;
  visit_menu_items?: Array<{
    id: string;
    manual_menu_name: string | null;
    rating: number | null;
    review: string | null;
    menu_items?: { name: string | null } | Array<{ name: string | null }> | null;
  }>;
};

const mealLabels = {
  breakfast: "아침",
  lunch: "점심",
  dinner: "저녁",
  other: "기타",
};

export default function VisitsPage() {
  const { authenticated, loading, configured } = useAppSession();
  const [visitScope, setVisitScope] = useState<"mine" | "all">(() =>
    typeof window !== "undefined" &&
    new URLSearchParams(window.location.search).get("scope") === "all"
      ? "all"
      : "mine",
  );
  const [visits, setVisits] = useState<RecentVisit[]>([]);
  const [dataLoading, setDataLoading] = useState(false);
  const [dataError, setDataError] = useState("");
  const [lightboxPhotoUrl, setLightboxPhotoUrl] = useState("");

  useEffect(() => {
    if (!authenticated) {
      return;
    }

    let mounted = true;

    async function loadVisits() {
      setDataLoading(true);
      setDataError("");

      const data = await getCachedJson<{
        visits?: RecentVisit[];
        error?: string;
      }>(`/api/visits?scope=${visitScope}`, 15_000);

      if (!mounted) {
        return;
      }

      if (data.error) {
        setDataError(data.error);
        setDataLoading(false);
        return;
      }

      setVisits(data.visits ?? []);
      setDataLoading(false);
    }

    loadVisits().catch(() => {
      if (mounted) {
        setDataError("방문 기록을 불러오지 못했습니다.");
        setDataLoading(false);
      }
    });

    return () => {
      mounted = false;
    };
  }, [authenticated, visitScope]);

  return (
    <PageShell
      eyebrow="기록"
      title="최근 방문"
      action={<SecondaryLink href="/restaurants">식당 목록</SecondaryLink>}
    >
      {!configured ? <SetupRequired /> : null}
      {configured && loading ? <LoadingState /> : null}
      {configured && !loading && !authenticated ? <LoginRequired /> : null}
      {configured && authenticated ? (
        <div className="mt-6 grid gap-3">
          <div className="inline-flex justify-self-start border border-line bg-white text-sm">
            <button
              type="button"
              onClick={() => setVisitScope("mine")}
              className={`min-h-10 px-3 ${
                visitScope === "mine" ? "bg-ink text-white" : "text-ink"
              }`}
            >
              내 최근
            </button>
            <button
              type="button"
              onClick={() => setVisitScope("all")}
              className={`min-h-10 px-3 ${
                visitScope === "all" ? "bg-ink text-white" : "text-ink"
              }`}
            >
              전체 최근
            </button>
          </div>
          {dataLoading ? <LoadingState /> : null}
          {dataError ? <p className="text-sm text-red-700">{dataError}</p> : null}
          {visits.map((visit) => (
            <div
              key={visit.id}
              className="border border-line bg-white/75 p-4"
            >
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <Link
                  href={`/restaurants/${visit.restaurant_id}`}
                  className="break-words text-lg font-semibold"
                >
                  {restaurantLabel(visit)}
                </Link>
                <p className="text-sm text-ink/55">
                  {visit.visited_at.slice(0, 10)} · {mealLabels[visit.meal_type]}
                  {" · "}
                  {profileName(visit)}
                </p>
              </div>
              <div className="mt-3 grid gap-2">
                {(visit.visit_menu_items ?? []).map((item, index) => (
                  <div
                    key={`${visit.id}-${index}`}
                    className="grid gap-2 border-t border-line pt-2 first:border-t-0 first:pt-0 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center"
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
                            className="h-14 w-14 border border-line bg-white object-cover"
                          />
                        </button>
                      ) : null}
                      <div className="min-w-0">
                        <div className="flex min-w-0 flex-wrap items-center gap-2">
                          <p className="truncate font-medium">{menuName(item)}</p>
                          {!item.rating ? (
                            <span className="shrink-0 bg-yellow-300 px-2 py-1 text-xs font-bold text-ink shadow-[0_0_0_2px_rgba(234,179,8,0.25)]">
                              평가 대기
                            </span>
                          ) : null}
                        </div>
                        {item.review ? (
                          <p className="mt-1 break-words text-sm text-ink/65">
                            {item.review}
                          </p>
                        ) : null}
                      </div>
                    </div>
                    <RatingDisplay value={item.rating} />
                  </div>
                ))}
              </div>
            </div>
          ))}
          {!dataLoading && visits.length === 0 ? (
            <p className="border border-dashed border-line bg-white/50 p-4 text-ink/65">
              아직 방문 기록이 없습니다.
            </p>
          ) : null}
          {lightboxPhotoUrl ? (
            <PhotoLightbox
              imageUrl={lightboxPhotoUrl}
              onClose={() => setLightboxPhotoUrl("")}
            />
          ) : null}
        </div>
      ) : null}
    </PageShell>
  );
}

function restaurantLabel(visit: RecentVisit) {
  const restaurant = Array.isArray(visit.restaurants)
    ? visit.restaurants[0]
    : visit.restaurants;

  return [restaurant?.name ?? "식당", restaurant?.branch_name].filter(Boolean).join(" ");
}

function profileName(visit: RecentVisit) {
  const profile = Array.isArray(visit.profiles) ? visit.profiles[0] : visit.profiles;

  return profile?.display_name ?? "프로필";
}

function menuName(item: NonNullable<RecentVisit["visit_menu_items"]>[number]) {
  const linkedMenuName = Array.isArray(item.menu_items)
    ? item.menu_items[0]?.name
    : item.menu_items?.name;

  return item.manual_menu_name ?? linkedMenuName ?? "메뉴";
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
