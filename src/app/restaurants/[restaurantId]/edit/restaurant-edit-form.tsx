"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  LoadingState,
  LoginRequired,
  SetupRequired,
} from "@/components/app-state";
import {
  Field,
  SubmitButton,
  TextArea,
  TextInput,
} from "@/components/form-fields";
import { KakaoPlacePicker } from "@/components/kakao-place-picker";
import { MultiSelectField } from "@/components/multi-select-field";
import { PageShell, SecondaryLink } from "@/components/page-shell";
import { PasteImageInput } from "@/components/paste-image-input";
import { clearCachedJson, getCachedJson } from "@/lib/client-cache";
import { cuisineOptions, foodTypeOptions } from "@/lib/restaurant-options";
import type { RestaurantRow } from "@/lib/supabase/types";
import { useAppSession } from "@/lib/use-app-session";

export function EditRestaurantForm({ restaurantId }: { restaurantId: string }) {
  const router = useRouter();
  const { authenticated, loading, configured } = useAppSession();
  const [restaurant, setRestaurant] = useState<RestaurantRow | null>(null);
  const [dataLoading, setDataLoading] = useState(false);
  const [nameError, setNameError] = useState("");
  const [submitError, setSubmitError] = useState("");

  useEffect(() => {
    if (!authenticated) {
      return;
    }

    let mounted = true;

    async function loadRestaurant() {
      setDataLoading(true);
      const data = await getCachedJson<{
        restaurant?: RestaurantRow | null;
        error?: string;
      }>(`/api/restaurants/${restaurantId}`, 10_000);

      if (mounted) {
        setRestaurant(data.restaurant ?? null);
        setDataLoading(false);
      }
    }

    loadRestaurant().catch(() => {
      if (mounted) {
        setDataLoading(false);
      }
    });

    return () => {
      mounted = false;
    };
  }, [authenticated, restaurantId]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const name = String(form.get("name") ?? "").trim();

    if (!name) {
      setNameError("식당 이름을 입력하세요.");
      return;
    }

    setNameError("");
    setSubmitError("");

    const response = await fetch(`/api/restaurants/${restaurantId}`, {
      method: "PATCH",
      body: form,
    });
    const data = (await response.json()) as { error?: string };

    if (!response.ok) {
      setSubmitError(data.error ?? "식당을 수정하지 못했습니다.");
      return;
    }

    clearCachedJson(`/api/restaurants/${restaurantId}`);
    clearCachedJson("/api/restaurants");
    router.push(`/restaurants/${restaurantId}`);
  }

  return (
    <PageShell
      eyebrow="수정"
      title="식당 수정"
      action={<SecondaryLink href={`/restaurants/${restaurantId}`}>뒤로</SecondaryLink>}
    >
      {!configured ? <SetupRequired /> : null}
      {configured && loading ? <LoadingState /> : null}
      {configured && !loading && !authenticated ? <LoginRequired /> : null}
      {configured && authenticated && dataLoading ? <LoadingState /> : null}
      {configured && authenticated && restaurant ? (
        <form noValidate onSubmit={handleSubmit} className="mt-6 grid max-w-xl gap-4">
          <Field label="식당 이름" required error={nameError}>
            <TextInput name="name" defaultValue={restaurant.name} />
          </Field>
          <Field label="지점">
            <TextInput name="branchName" defaultValue={restaurant.branch_name ?? ""} />
          </Field>
          <Field label="음식 종류">
            <MultiSelectField
              name="cuisineCategory"
              options={cuisineOptions}
              defaultValue={restaurant.cuisine_category ?? ""}
              placeholder="음식 종류 선택"
            />
          </Field>
          <Field label="메뉴/형태">
            <MultiSelectField
              name="foodType"
              options={foodTypeOptions}
              defaultValue={restaurant.food_type ?? ""}
              placeholder="메뉴/형태 선택"
            />
          </Field>
          <Field label="목표 메뉴 수">
            <TextInput
              name="totalMenuGoal"
              defaultValue={restaurant.total_menu_goal ?? ""}
              type="number"
              min="0"
              inputMode="numeric"
            />
          </Field>
          <Field label="아이콘">
            <p className="mb-1 text-sm text-ink/55">
              선택 사항입니다. 새 파일을 선택할 때만 아이콘이 바뀝니다.
            </p>
            <PasteImageInput
              name="icon"
              accept="image/*"
              compact
              preview
              cropSquare
              currentPreviewUrl={restaurant.iconUrl}
            />
          </Field>
          <Field label="위치">
            <KakaoPlacePicker
              defaultLatitude={restaurant.latitude}
              defaultLongitude={restaurant.longitude}
              defaultQuery={restaurant.name}
            />
          </Field>
          <Field label="메모">
            <TextArea name="notes" defaultValue={restaurant.notes ?? ""} />
          </Field>
          <SubmitButton>식당 수정</SubmitButton>
          {submitError ? <p className="text-sm text-red-700">{submitError}</p> : null}
        </form>
      ) : null}
    </PageShell>
  );
}
