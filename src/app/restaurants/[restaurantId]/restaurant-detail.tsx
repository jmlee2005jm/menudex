"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useMemo, useState } from "react";
import {
  LoadingState,
  LoginRequired,
  SetupRequired,
} from "@/components/app-state";
import { Field, SubmitButton, TextInput } from "@/components/form-fields";
import { KakaoMap } from "@/components/kakao-map";
import { MenuPhotoCard } from "@/components/menu-photo-annotator";
import { formatMultiValue } from "@/components/multi-select-field";
import { PageShell, PrimaryLink, SecondaryLink } from "@/components/page-shell";
import { PasteImageInput } from "@/components/paste-image-input";
import { PhotoLightbox } from "@/components/photo-lightbox";
import { RatingDisplay, RatingField } from "@/components/rating-field";
import { clearCachedJson, getCachedJson } from "@/lib/client-cache";
import type {
  MenuItemRow,
  MenuPhotoRow,
  RestaurantRow,
  VisitWithMenu,
} from "@/lib/supabase/types";
import { useAppSession } from "@/lib/use-app-session";

const mealLabels = {
  breakfast: "아침",
  lunch: "점심",
  dinner: "저녁",
  other: "기타",
};

function hasRestaurantCoordinates(restaurant: RestaurantRow) {
  return (
    typeof restaurant.latitude === "number" &&
    typeof restaurant.longitude === "number"
  );
}

function RestaurantLocationCard({
  restaurant,
  restaurantId,
}: {
  restaurant: RestaurantRow;
  restaurantId: string;
}) {
  return (
    <section className="border border-line bg-white/60 p-3">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-base font-semibold">위치</h2>
        {!hasRestaurantCoordinates(restaurant) ? (
          <Link
            href={`/restaurants/${restaurantId}/edit`}
            className="text-sm font-medium text-leaf underline"
          >
            위치 추가
          </Link>
        ) : null}
      </div>
      <div className="mt-2">
        {hasRestaurantCoordinates(restaurant) ? (
          <KakaoMap
            restaurants={[restaurant]}
            heightClassName="h-48 min-h-48 sm:h-56"
            showRestaurantList={false}
          />
        ) : (
          <p className="text-sm text-ink/60">
            식당 수정에서 장소를 검색하거나 지도에서 위치를 선택하세요.
          </p>
        )}
      </div>
    </section>
  );
}

function RestaurantHeaderBody({
  restaurant,
  restaurantId,
}: {
  restaurant: RestaurantRow;
  restaurantId: string;
}) {
  return (
    <div className="grid gap-5">
      <div className="flex items-start gap-3">
        {restaurant.iconUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={restaurant.iconUrl}
            alt=""
            className="h-14 w-14 shrink-0 border border-line bg-white object-contain"
          />
        ) : null}
        <div className="min-w-0 space-y-1 text-sm leading-tight text-ink/65">
          {restaurant.branch_name ? (
            <p className="text-base font-medium leading-tight text-ink/70">
              {restaurant.branch_name}
            </p>
          ) : null}
          {restaurant.cuisine_category || restaurant.food_type ? (
            <p>
              {[
                formatMultiValue(restaurant.cuisine_category),
                formatMultiValue(restaurant.food_type),
              ]
                .filter(Boolean)
                .join(" · ")}
            </p>
          ) : null}
          {restaurant.notes ? <p>{restaurant.notes}</p> : null}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:flex sm:flex-wrap">
        <Link
          href={`/restaurants/${restaurantId}/visits/new`}
          className="col-span-2 inline-flex min-h-12 items-center justify-center bg-leaf px-5 text-sm font-semibold text-white sm:col-span-1 sm:order-none"
        >
          방문 기록 추가
        </Link>
        <PrimaryLink href={`/restaurants/${restaurantId}/menus/new`}>
          메뉴 추가
        </PrimaryLink>
        <PrimaryLink href={`/restaurants/${restaurantId}/edit`}>
          식당 수정
        </PrimaryLink>
      </div>

    </div>
  );
}

export function RestaurantDetail({ restaurantId }: { restaurantId: string }) {
  const router = useRouter();
  const { authenticated, loading, configured, profile } = useAppSession();
  const [restaurant, setRestaurant] = useState<RestaurantRow | null>(null);
  const [menuPhotos, setMenuPhotos] = useState<MenuPhotoRow[]>([]);
  const [menuItems, setMenuItems] = useState<MenuItemRow[]>([]);
  const [visits, setVisits] = useState<VisitWithMenu[]>([]);
  const [dataLoading, setDataLoading] = useState(true);
  const [deleteError, setDeleteError] = useState("");
  const [editingReviewId, setEditingReviewId] = useState("");
  const [editingRating, setEditingRating] = useState("");
  const [editError, setEditError] = useState("");
  const [editSubmitting, setEditSubmitting] = useState(false);
  const [visitScope, setVisitScope] = useState<"mine" | "all">("mine");
  const [lightboxPhotoUrl, setLightboxPhotoUrl] = useState("");

  useEffect(() => {
    if (!authenticated) {
      setDataLoading(false);
      return;
    }

    let mounted = true;

    async function loadData() {
      setDataLoading(true);
      const url = `/api/restaurants/${restaurantId}${visitScope === "all" ? "?visits=all" : ""}`;

      const data = await getCachedJson<{
        restaurant: RestaurantRow | null;
        menuPhotos: MenuPhotoRow[];
        menuItems: MenuItemRow[];
        visits: VisitWithMenu[];
      }>(url, 10_000);

      if (!mounted) {
        return;
      }

      setRestaurant(data.restaurant ?? null);
      setMenuPhotos(data.menuPhotos ?? []);
      setMenuItems(data.menuItems ?? []);
      setVisits(data.visits ?? []);
      setDataLoading(false);
    }

    loadData().catch(() => {
      if (mounted) {
        setDataLoading(false);
      }
    });

    return () => {
      mounted = false;
    };
  }, [authenticated, restaurantId, visitScope]);

  const visitCards = useMemo(
    () =>
      visits.flatMap((visit) =>
        visit.visit_menu_items.map((item) => ({
          id: `${visit.id}-${item.id}`,
          visitId: visit.id,
          visitMenuItemId: item.id,
          visitedAt: visit.visited_at.slice(0, 10),
          mealType: visit.meal_type,
          menuName: item.manual_menu_name ?? "이름 없는 메뉴",
          rating: item.rating,
          review: item.review,
          profileId: visit.profile_id,
          profileName: visit.profiles?.display_name ?? "프로필",
          photoUrls: photosForVisitMenuItem(visit, item.id),
        })),
      ),
    [visits],
  );

  async function deleteRestaurant() {
    if (!window.confirm("이 식당과 연결된 메뉴 사진, 메뉴, 방문 기록을 모두 삭제할까요?")) {
      return;
    }

    setDeleteError("");
    const response = await fetch(`/api/restaurants/${restaurantId}`, {
      method: "DELETE",
    });
    const data = (await response.json()) as { error?: string };

    if (!response.ok) {
      setDeleteError(data.error ?? "식당을 삭제하지 못했습니다.");
      return;
    }

    clearCachedJson("/api/restaurants");
    router.push("/restaurants");
  }

  async function deleteMenuPhoto(menuPhotoId: string) {
    if (!window.confirm("이 메뉴 사진을 삭제할까요?")) {
      return;
    }

    const ok = await deleteChildEntry("/menu-photos", { menuPhotoId });

    if (ok) {
      setMenuPhotos((current) => current.filter((photo) => photo.id !== menuPhotoId));
    }
  }

  async function deleteMenuItem(menuItemId: string) {
    if (!window.confirm("이 메뉴를 삭제할까요?")) {
      return;
    }

    const ok = await deleteChildEntry("/menu-items", { menuItemId });

    if (ok) {
      setMenuItems((current) => current.filter((item) => item.id !== menuItemId));
    }
  }

  async function deleteVisit(visitId: string) {
    if (!window.confirm("이 방문 기록을 삭제할까요?")) {
      return;
    }

    const ok = await deleteChildEntry("/visits", { visitId });

    if (ok) {
      setVisits((current) => current.filter((visit) => visit.id !== visitId));
    }
  }

  async function deleteChildEntry(path: string, body: Record<string, string>) {
    setDeleteError("");

    const response = await fetch(`/api/restaurants/${restaurantId}${path}`, {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });
    const data = (await response.json()) as { error?: string };

    if (!response.ok) {
      setDeleteError(data.error ?? "삭제하지 못했습니다.");
      return false;
    }

    clearCachedJson(`/api/restaurants/${restaurantId}`);
    clearCachedJson("/api/restaurants");
    clearCachedJson("/api/visits");
    return true;
  }

  function startEditingReview(visit: (typeof visitCards)[number]) {
    setEditingReviewId(visit.id);
    setEditingRating(visit.rating ? String(visit.rating) : "");
    setEditError("");
  }

  function cancelEditingReview() {
    setEditingReviewId("");
    setEditingRating("");
    setEditError("");
    setEditSubmitting(false);
  }

  async function editReview(
    event: FormEvent<HTMLFormElement>,
    visit: (typeof visitCards)[number],
  ) {
    event.preventDefault();
    if (editSubmitting) {
      return;
    }

    const form = new FormData(event.currentTarget);
    const menuName = String(form.get("menuName") ?? "").trim();
    const rating = String(form.get("rating") ?? "").trim();

    if (!menuName) {
      setEditError("먹은 메뉴를 입력하세요.");
      return;
    }

    if (!rating) {
      setEditError("별점을 선택하세요.");
      return;
    }

    setEditError("");
    setEditSubmitting(true);
    form.set("visitId", visit.visitId);
    form.set("visitMenuItemId", visit.visitMenuItemId);
    form.set("menuName", menuName);
    form.set("rating", rating);
    form.set("review", String(form.get("review") ?? "").trim());

    const response = await fetch(`/api/restaurants/${restaurantId}/visits`, {
      method: "PATCH",
      body: form,
    });
    const data = (await response.json()) as { error?: string };

    if (!response.ok) {
      setEditError(data.error ?? "방문 기록을 수정하지 못했습니다.");
      setEditSubmitting(false);
      return;
    }

    clearCachedJson(`/api/restaurants/${restaurantId}`);
    clearCachedJson("/api/restaurants");
    clearCachedJson("/api/visits");
    setVisits((current) =>
      current.map((currentVisit) => {
        if (currentVisit.id !== visit.visitId) {
          return currentVisit;
        }

        return {
          ...currentVisit,
          visit_photos: updateLocalVisitPhotos(
            currentVisit.visit_photos,
            form,
            visit.visitMenuItemId,
          ),
          visit_menu_items: currentVisit.visit_menu_items.map((item) =>
            item.id === visit.visitMenuItemId
              ? {
                  ...item,
                  manual_menu_name: menuName,
                  rating: Number(rating),
                  review: String(form.get("review") ?? "").trim() || null,
                }
              : item,
          ),
        };
      }),
    );
    cancelEditingReview();
  }

  function updateLocalVisitPhotos(
    photos: VisitWithMenu["visit_photos"],
    form: FormData,
    visitMenuItemId: string,
  ) {
    const newPhoto = form.get("visitPhoto");
    const otherPhotos = (photos ?? []).filter(
      (photo) => photo.visit_menu_item_id !== visitMenuItemId,
    );

    if (newPhoto instanceof File && newPhoto.size > 0) {
      return [
        ...otherPhotos,
        {
          id: "local-preview",
          visit_id: "",
          visit_menu_item_id: visitMenuItemId,
          profile_id: "",
          storage_path: "",
          signedUrl: URL.createObjectURL(newPhoto),
          created_at: "",
        },
      ];
    }

    if (form.get("deleteVisitPhoto") === "true") {
      return otherPhotos;
    }

    return photos;
  }

  if (!configured) {
    return (
      <PageShell title="식당" action={<SecondaryLink href="/restaurants">뒤로</SecondaryLink>}>
        <SetupRequired />
      </PageShell>
    );
  }

  if (loading) {
    return (
      <PageShell title="식당" action={<SecondaryLink href="/restaurants">뒤로</SecondaryLink>}>
        <LoadingState />
      </PageShell>
    );
  }

  if (!authenticated) {
    return (
      <PageShell title="식당" action={<SecondaryLink href="/restaurants">뒤로</SecondaryLink>}>
        <LoginRequired />
      </PageShell>
    );
  }

  if (!dataLoading && !restaurant) {
    return (
      <PageShell title="식당을 찾을 수 없음" action={<SecondaryLink href="/restaurants">뒤로</SecondaryLink>}>
        <p className="mt-6 text-ink/65">이 식당 기록이 없습니다.</p>
      </PageShell>
    );
  }

  return (
    <PageShell
      eyebrow="식당"
      title={restaurant?.name ?? "식당 불러오는 중"}
      action={<SecondaryLink href="/restaurants">전체 식당</SecondaryLink>}
      titleAction={
        restaurant ? (
          <button
            type="button"
            onClick={deleteRestaurant}
            className="inline-flex min-h-8 items-center justify-center border border-red-200 bg-white px-2 text-xs font-medium text-red-700"
          >
            식당 삭제
          </button>
        ) : null
      }
      titleAside={
        restaurant ? (
          <RestaurantLocationCard restaurant={restaurant} restaurantId={restaurantId} />
        ) : null
      }
      titleBody={
        restaurant ? (
          <RestaurantHeaderBody
            restaurant={restaurant}
            restaurantId={restaurantId}
          />
        ) : null
      }
    >
      {dataLoading ? <LoadingState /> : null}
      {deleteError ? <p className="mt-4 text-sm text-red-700">{deleteError}</p> : null}
      {restaurant ? (
        <>
          <section className="mt-3">
            <div className="mb-3 flex flex-wrap items-center gap-3">
              <h2 className="text-xl font-semibold">방문 기록</h2>
              <div className="inline-flex border border-line bg-white">
                <button
                  type="button"
                  onClick={() => setVisitScope("mine")}
                  className={`min-h-10 px-4 text-sm font-medium ${
                    visitScope === "mine" ? "bg-ink text-white" : "text-ink"
                  }`}
                >
                  내 기록
                </button>
                <button
                  type="button"
                  onClick={() => setVisitScope("all")}
                  className={`min-h-10 px-4 text-sm font-medium ${
                    visitScope === "all" ? "bg-ink text-white" : "text-ink"
                  }`}
                >
                  전체 기록
                </button>
              </div>
            </div>
            <div className="mt-3 grid gap-2">
              {visitCards.map((visit) => (
                <div
                  key={visit.id}
                  className="flex flex-col gap-2 border border-line bg-white/70 px-3 py-2 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0 flex-1 self-stretch sm:self-auto">
                    {editingReviewId === visit.id ? (
                      <form
                        noValidate
                        onSubmit={(event) => editReview(event, visit)}
                        className="grid gap-3"
                      >
                        <Field label="먹은 메뉴" required>
                          <TextInput name="menuName" defaultValue={visit.menuName} />
                        </Field>
                        <Field label="별점" required>
                          <RatingField
                            name="rating"
                            value={editingRating}
                            onChange={(nextRating) => {
                              setEditingRating(nextRating);
                              setEditError("");
                            }}
                          />
                        </Field>
                        <Field label="짧은 리뷰">
                          <TextInput name="review" defaultValue={visit.review ?? ""} />
                        </Field>
                        <Field label="메뉴 사진">
                          <div className="grid gap-2">
                            {visit.photoUrls[0] ? (
                              <div className="flex items-center gap-3">
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img
                                  src={visit.photoUrls[0]}
                                  alt=""
                                  className="h-14 w-14 border border-line bg-white object-cover"
                                />
                                <label className="flex min-h-10 items-center gap-2 text-sm text-ink/70">
                                  <input
                                    type="checkbox"
                                    name="deleteVisitPhoto"
                                    value="true"
                                    className="h-4 w-4"
                                  />
                                  사진 삭제
                                </label>
                              </div>
                            ) : null}
                            <PasteImageInput
                              name="visitPhoto"
                              accept="image/*"
                              compact
                              preview
                            />
                          </div>
                        </Field>
                        <div className="flex flex-wrap gap-2">
                          <SubmitButton disabled={editSubmitting}>
                            {editSubmitting ? "저장 중..." : "수정 저장"}
                          </SubmitButton>
                          <button
                            type="button"
                            onClick={cancelEditingReview}
                            className="inline-flex min-h-11 items-center justify-center border border-line bg-white px-4 text-sm font-medium text-ink"
                          >
                            취소
                          </button>
                        </div>
                        {editError ? (
                          <p className="text-sm text-red-700">{editError}</p>
                        ) : null}
                      </form>
                    ) : (
                      <div className="flex min-h-10 flex-col justify-center">
                        <div className="flex flex-col gap-1 sm:flex-row sm:flex-wrap sm:items-center sm:gap-x-2 sm:gap-y-1">
                          <p className="break-words font-medium leading-tight">{visit.menuName}</p>
                          <div className="flex flex-wrap items-center gap-x-1 gap-y-1 text-sm leading-tight text-ink/60">
                            <span className="hidden sm:inline">·</span>
                            <span>{visit.visitedAt}</span>
                            <span>·</span>
                            <span>{mealLabels[visit.mealType]}</span>
                            {visitScope === "all" ? (
                              <>
                                <span>·</span>
                                <span>{visit.profileName}</span>
                              </>
                            ) : null}
                            <span>·</span>
                            <RatingDisplay value={visit.rating} />
                          </div>
                        </div>
                        {visit.review ? (
                          <p className="mt-2 break-words text-sm">{visit.review}</p>
                        ) : null}
                      </div>
                    )}
                  </div>
                  {editingReviewId !== visit.id && visit.photoUrls.length > 0 ? (
                    <div className="flex max-w-44 shrink-0 gap-1 overflow-hidden self-start sm:self-center">
                      {visit.photoUrls.slice(0, 3).map((photoUrl) => (
                        <button
                          key={photoUrl}
                          type="button"
                          onClick={() => setLightboxPhotoUrl(photoUrl)}
                          className="shrink-0"
                        >
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={photoUrl}
                            alt=""
                            className="h-14 w-14 border border-line bg-white object-cover"
                          />
                        </button>
                      ))}
                    </div>
                  ) : null}
                  {editingReviewId === visit.id || visit.profileId !== profile?.id ? null : (
                    <div className="flex shrink-0 justify-end gap-2 self-start sm:self-center">
                      <button
                        type="button"
                        onClick={() => startEditingReview(visit)}
                        className="min-h-10 whitespace-nowrap border border-line bg-white px-3 text-sm font-medium text-ink"
                      >
                        수정
                      </button>
                      <button
                        type="button"
                        onClick={() => deleteVisit(visit.visitId)}
                        className="min-h-10 whitespace-nowrap border border-red-200 bg-white px-3 text-sm font-medium text-red-700"
                      >
                        삭제
                      </button>
                    </div>
                  )}
                </div>
              ))}
              {visitCards.length === 0 ? (
                <p className="border border-dashed border-line bg-white/50 p-4 text-sm text-ink/60">
                  아직 방문 기록이 없습니다. 먹은 메뉴를 기록하세요.
                </p>
              ) : null}
            </div>
          </section>

          <section className="mt-8">
            <h2 className="text-xl font-semibold">메뉴 사진</h2>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              {menuPhotos.map((photo) => (
                <MenuPhotoCard
                  key={photo.id}
                  restaurantId={restaurantId}
                  photo={photo}
                  onDeletePhoto={deleteMenuPhoto}
                  currentProfileId={profile?.id}
                />
              ))}
              {menuPhotos.length === 0 ? (
                <p className="border border-dashed border-line bg-white/50 p-4 text-sm text-ink/60">
                  아직 메뉴 사진이 없습니다. 갤러리나 컴퓨터에서 사진을 추가하세요.
                </p>
              ) : null}
            </div>
          </section>

          <section className="mt-8">
            <h2 className="text-xl font-semibold">직접 추가한 메뉴</h2>
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              {menuItems.map((item) => (
                <div
                  key={item.id}
                  className="flex items-start justify-between gap-3 border border-line bg-white/70 p-3"
                >
                  <div className="min-w-0">
                    <p className="break-words font-medium">{item.name}</p>
                    <p className="mt-1 text-sm text-ink/60">
                      {item.price ?? "가격 없음"} · {item.is_active ? "판매 중" : "판매 중지"}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => deleteMenuItem(item.id)}
                    className="min-h-10 shrink-0 border border-red-200 bg-white px-3 text-sm font-medium text-red-700"
                  >
                    삭제
                  </button>
                </div>
              ))}
              {menuItems.length === 0 ? (
                <p className="border border-dashed border-line bg-white/50 p-4 text-sm text-ink/60">
                  아직 직접 추가한 메뉴가 없습니다. 메뉴 사진만으로도 기록할 수 있습니다.
                </p>
              ) : null}
            </div>
          </section>
        </>
      ) : null}
      {lightboxPhotoUrl ? (
        <PhotoLightbox
          imageUrl={lightboxPhotoUrl}
          onClose={() => setLightboxPhotoUrl("")}
        />
      ) : null}
    </PageShell>
  );
}

function photosForVisitMenuItem(visit: VisitWithMenu, visitMenuItemId: string) {
  const photos = visit.visit_photos ?? [];
  const matchedPhotos = photos.filter(
    (photo) => photo.visit_menu_item_id === visitMenuItemId,
  );
  const legacyPhotos =
    visit.visit_menu_items.length === 1
      ? photos.filter((photo) => !photo.visit_menu_item_id)
      : [];

  return [...matchedPhotos, ...legacyPhotos]
    .map((photo) => photo.signedUrl)
    .filter((url): url is string => Boolean(url));
}
