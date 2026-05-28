"use client";

import { useRouter } from "next/navigation";
import { ChangeEvent, FormEvent, useEffect, useRef, useState } from "react";
import {
  LoadingState,
  LoginRequired,
  SetupRequired,
} from "@/components/app-state";
import {
  DateSelectInput,
  Field,
  SelectInput,
  SubmitButton,
  TextInput,
} from "@/components/form-fields";
import { PageShell, SecondaryLink } from "@/components/page-shell";
import { RatingField } from "@/components/rating-field";
import { clearCachedJson, getCachedJson } from "@/lib/client-cache";
import {
  defaultMealType,
  todayDateValue,
} from "@/lib/date";
import type { MenuPhotoRow } from "@/lib/supabase/types";
import { useAppSession } from "@/lib/use-app-session";

export function NewVisitForm({ restaurantId }: { restaurantId: string }) {
  const router = useRouter();
  const { authenticated, loading, configured } = useAppSession();
  const [menuNameError, setMenuNameError] = useState("");
  const [menuRows, setMenuRows] = useState([{ id: crypto.randomUUID(), rating: "" }]);
  const [submitError, setSubmitError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [photoPreviews, setPhotoPreviews] = useState<Record<string, string[]>>({});
  const [menuPhotos, setMenuPhotos] = useState<MenuPhotoRow[]>([]);
  const photoPreviewsRef = useRef(photoPreviews);

  useEffect(() => {
    photoPreviewsRef.current = photoPreviews;
  }, [photoPreviews]);

  useEffect(
    () => () => {
      Object.values(photoPreviewsRef.current)
        .flat()
        .forEach((url) => URL.revokeObjectURL(url));
    },
    [],
  );

  useEffect(() => {
    if (!authenticated) {
      return;
    }

    let mounted = true;

    async function loadMenuPhotos() {
      const data = await getCachedJson<{
        menuPhotos?: MenuPhotoRow[];
      }>(`/api/restaurants/${restaurantId}`, 10_000);

      if (mounted) {
        setMenuPhotos(data.menuPhotos ?? []);
      }
    }

    loadMenuPhotos().catch(() => {
      if (mounted) {
        setMenuPhotos([]);
      }
    });

    return () => {
      mounted = false;
    };
  }, [authenticated, restaurantId]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!authenticated || submitting) {
      return;
    }

    const form = new FormData(event.currentTarget);
    const menuNames = form.getAll("menuName").map((value) => String(value).trim());
    const hasMenuName = menuNames.some(Boolean);

    if (!hasMenuName) {
      setMenuNameError("먹은 메뉴를 입력하세요.");
      return;
    }

    setMenuNameError("");
    setSubmitError("");
    setSubmitting(true);

    form.set("visitedAt", String(form.get("visitedAt") ?? "").trim() || todayDateValue());
    form.set("mealType", String(form.get("mealType") ?? "other"));

    const response = await fetch(`/api/restaurants/${restaurantId}/visits`, {
      method: "POST",
      body: form,
    });
    const data = (await response.json()) as { error?: string };

    if (!response.ok) {
      setSubmitError(data.error ?? "방문 기록을 저장하지 못했습니다.");
      setSubmitting(false);
      return;
    }

    clearCachedJson(`/api/restaurants/${restaurantId}`);
    clearCachedJson("/api/restaurants");
    clearCachedJson("/api/visits");
    router.push(`/restaurants/${restaurantId}`);
  }

  function updateRating(rowId: string, rating: string) {
    setMenuRows((current) =>
      current.map((row) => (row.id === rowId ? { ...row, rating } : row)),
    );
  }

  function addMenuRow() {
    setMenuRows((current) => [...current, { id: crypto.randomUUID(), rating: "" }]);
  }

  function removeMenuRow(rowId: string) {
    setPhotoPreviews((current) => {
      current[rowId]?.forEach((url) => URL.revokeObjectURL(url));
      const { [rowId]: _removed, ...rest } = current;
      void _removed;

      return rest;
    });
    setMenuRows((current) =>
      current.length === 1 ? current : current.filter((row) => row.id !== rowId),
    );
  }

  function updatePhotoPreviews(rowId: string, event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []);

    setPhotoPreviews((current) => {
      current[rowId]?.forEach((url) => URL.revokeObjectURL(url));

      return {
        ...current,
        [rowId]: files.map((file) => URL.createObjectURL(file)),
      };
    });
  }

  return (
    <PageShell
      eyebrow="기록"
      title="방문 기록"
      action={<SecondaryLink href={`/restaurants/${restaurantId}`}>뒤로</SecondaryLink>}
    >
      {!configured ? <SetupRequired /> : null}
      {configured && loading ? <LoadingState /> : null}
      {configured && !loading && !authenticated ? <LoginRequired /> : null}
      {configured && authenticated ? (
        <form noValidate onSubmit={handleSubmit} className="mt-6 grid max-w-xl gap-4">
          {menuPhotos.length > 0 ? (
            <section className="grid gap-2 border border-line bg-white/60 p-3">
              <h2 className="text-base font-semibold">메뉴 사진</h2>
              <div className="flex gap-2 overflow-x-auto">
                {menuPhotos.map((photo) =>
                  photo.signedUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      key={photo.id}
                      src={photo.signedUrl}
                      alt=""
                      className="h-32 w-24 shrink-0 border border-line bg-white object-cover"
                    />
                  ) : null,
                )}
              </div>
            </section>
          ) : null}
          <Field label="날짜" required>
            <DateSelectInput name="visitedAt" defaultValue={todayDateValue()} />
          </Field>
          <Field label="식사" required>
            <SelectInput name="mealType" defaultValue={defaultMealType()}>
              <option value="breakfast">아침</option>
              <option value="lunch">점심</option>
              <option value="dinner">저녁</option>
              <option value="other">기타</option>
            </SelectInput>
          </Field>
          <Field label="먹은 메뉴" required error={menuNameError}>
            <div className="grid gap-3">
              {menuRows.map((row, index) => (
                <div key={row.id} className="grid gap-3 border border-line bg-white/60 p-3">
                  <input name="menuRowId" type="hidden" value={row.id} />
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-medium text-ink/65">메뉴 {index + 1}</p>
                    {menuRows.length > 1 ? (
                      <button
                        type="button"
                        onClick={() => removeMenuRow(row.id)}
                        className="min-h-9 border border-line bg-white px-3 text-sm font-medium text-ink"
                      >
                        삭제
                      </button>
                    ) : null}
                  </div>
                  <TextInput name="menuName" placeholder="메뉴 이름" />
                  <RatingField
                    name="rating"
                    value={row.rating}
                    onChange={(nextRating) => updateRating(row.id, nextRating)}
                  />
                  <p className="text-sm font-semibold text-leaf">
                    별점은 나중에 남겨도 됩니다.
                  </p>
                  <TextInput name="review" placeholder="짧은 리뷰" />
                  <div>
                    <p className="text-sm font-medium text-ink/70">메뉴 사진</p>
                    <div className="mt-1 grid gap-2">
                      <input
                        name={`visitPhoto:${row.id}`}
                        type="file"
                        accept="image/*"
                        multiple
                        onChange={(event) => updatePhotoPreviews(row.id, event)}
                        className="text-sm text-ink/70"
                      />
                      <p className="text-sm text-ink/55">
                        이 메뉴에 연결할 사진만 선택하세요.
                      </p>
                      {photoPreviews[row.id]?.length ? (
                        <div className="flex max-w-full gap-2 overflow-x-auto">
                          {photoPreviews[row.id].map((url) => (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              key={url}
                              src={url}
                              alt=""
                              className="h-14 w-14 shrink-0 border border-line bg-white object-cover"
                            />
                          ))}
                        </div>
                      ) : null}
                    </div>
                  </div>
                </div>
              ))}
              <button
                type="button"
                onClick={addMenuRow}
                className="min-h-10 justify-self-start border border-line bg-white px-3 text-sm font-medium text-ink"
              >
                메뉴 더 추가
              </button>
            </div>
          </Field>
          <SubmitButton disabled={submitting}>
            {submitting ? "저장 중..." : "방문 기록 저장"}
          </SubmitButton>
          {submitError ? <p className="text-sm text-red-700">{submitError}</p> : null}
        </form>
      ) : null}
    </PageShell>
  );
}
