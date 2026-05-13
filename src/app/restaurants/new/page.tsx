"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import {
  LoadingState,
  LoginRequired,
  SetupRequired,
} from "@/components/app-state";
import { Field, SubmitButton, TextArea, TextInput } from "@/components/form-fields";
import { KakaoPlacePicker } from "@/components/kakao-place-picker";
import { MultiSelectField } from "@/components/multi-select-field";
import { PageShell, SecondaryLink } from "@/components/page-shell";
import { PasteImageInput } from "@/components/paste-image-input";
import { clearCachedJson } from "@/lib/client-cache";
import { cuisineOptions, foodTypeOptions } from "@/lib/restaurant-options";
import { useAppSession } from "@/lib/use-app-session";

export default function NewRestaurantPage() {
  const router = useRouter();
  const { authenticated, loading, configured } = useAppSession();
  const [nameError, setNameError] = useState("");
  const [submitError, setSubmitError] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!authenticated) {
      return;
    }

    const form = new FormData(event.currentTarget);
    const name = String(form.get("name") ?? "").trim();

    if (!name) {
      setNameError("식당 이름을 입력하세요.");
      return;
    }

    setNameError("");
    setSubmitError("");

    const response = await fetch("/api/restaurants", { method: "POST", body: form });
    const data = (await response.json()) as { id?: string; error?: string };

    if (!response.ok || !data.id) {
      setSubmitError(data.error ?? "식당을 저장하지 못했습니다.");
      return;
    }

    clearCachedJson("/api/restaurants");
    router.push(`/restaurants/${data.id}`);
  }

  return (
    <PageShell
      eyebrow="추가"
      title="새 식당"
      action={<SecondaryLink href="/restaurants">뒤로</SecondaryLink>}
    >
      {!configured ? <SetupRequired /> : null}
      {configured && loading ? <LoadingState /> : null}
      {configured && !loading && !authenticated ? <LoginRequired /> : null}
      {configured && authenticated ? (
        <form noValidate onSubmit={handleSubmit} className="mt-6 grid max-w-xl gap-4">
          <Field label="식당 이름" required error={nameError}>
            <TextInput name="name" placeholder="식당 이름" />
          </Field>
          <Field label="지점">
            <TextInput name="branchName" placeholder="지점 또는 구분 이름" />
          </Field>
          <Field label="음식 종류">
            <MultiSelectField
              name="cuisineCategory"
              options={cuisineOptions}
              placeholder="음식 종류 선택"
            />
          </Field>
          <Field label="메뉴/형태">
            <MultiSelectField
              name="foodType"
              options={foodTypeOptions}
              placeholder="메뉴/형태 선택"
            />
          </Field>
          <Field label="목표 메뉴 수">
            <TextInput
              name="totalMenuGoal"
              type="number"
              min="0"
              inputMode="numeric"
            />
          </Field>
          <Field label="아이콘">
            <p className="mb-1 text-sm text-ink/55">선택 사항입니다. 없으면 이름 첫 글자를 보여줍니다.</p>
            <PasteImageInput
              name="icon"
              accept="image/*"
              compact
              preview
              cropSquare
            />
          </Field>
          <Field label="위치">
            <KakaoPlacePicker />
          </Field>
          <Field label="메모">
            <TextArea name="notes" placeholder="영업시간, 주문 방식, 좌석 등 기억할 내용" />
          </Field>
          <SubmitButton>식당 만들기</SubmitButton>
          {submitError ? <p className="text-sm text-red-700">{submitError}</p> : null}
        </form>
      ) : null}
    </PageShell>
  );
}
