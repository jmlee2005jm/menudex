"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
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
import {
  defaultMealType,
  todayDateValue,
} from "@/lib/date";
import { useAppSession } from "@/lib/use-app-session";

export function NewVisitForm({ restaurantId }: { restaurantId: string }) {
  const router = useRouter();
  const { authenticated, loading, configured } = useAppSession();
  const [menuNameError, setMenuNameError] = useState("");
  const [rating, setRating] = useState("");
  const [ratingError, setRatingError] = useState("");
  const [submitError, setSubmitError] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!authenticated) {
      return;
    }

    const form = new FormData(event.currentTarget);
    const menuName = String(form.get("menuName") ?? "").trim();
    const ratingValue = String(form.get("rating") ?? "").trim();

    if (!menuName) {
      setMenuNameError("먹은 메뉴를 입력하세요.");
      return;
    }

    if (!ratingValue) {
      setMenuNameError("");
      setRatingError("별점을 선택하세요.");
      return;
    }

    setMenuNameError("");
    setRatingError("");
    setSubmitError("");

    const response = await fetch(`/api/restaurants/${restaurantId}/visits`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        visitedAt: String(form.get("visitedAt") ?? "").trim() || todayDateValue(),
        mealType: String(form.get("mealType") ?? "other"),
        menuName,
        rating: ratingValue,
        review: String(form.get("review") ?? "").trim(),
      }),
    });
    const data = (await response.json()) as { error?: string };

    if (!response.ok) {
      setSubmitError(data.error ?? "방문 기록을 저장하지 못했습니다.");
      return;
    }

    router.push(`/restaurants/${restaurantId}`);
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
            <TextInput name="menuName" placeholder="메뉴 이름" />
          </Field>
          <Field label="별점" required>
            <RatingField
              name="rating"
              value={rating}
              onChange={(nextRating) => {
                setRating(nextRating);
                setRatingError("");
              }}
              error={ratingError}
            />
          </Field>
          <Field label="짧은 리뷰">
            <TextInput name="review" placeholder="짧은 리뷰" />
          </Field>
          <SubmitButton>방문 기록 저장</SubmitButton>
          {submitError ? <p className="text-sm text-red-700">{submitError}</p> : null}
        </form>
      ) : null}
    </PageShell>
  );
}
