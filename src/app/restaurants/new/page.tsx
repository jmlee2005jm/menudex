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
  SubmitButton,
  TextArea,
  TextInput,
} from "@/components/form-fields";
import { KakaoPlacePicker } from "@/components/kakao-place-picker";
import { MultiSelectField } from "@/components/multi-select-field";
import { PageShell, SecondaryLink } from "@/components/page-shell";
import { PasteImageInput } from "@/components/paste-image-input";
import { clearCachedJson } from "@/lib/client-cache";
import { todayDateValue } from "@/lib/date";
import { cuisineOptions, foodTypeOptions } from "@/lib/restaurant-options";
import { useAppSession } from "@/lib/use-app-session";

export default function NewRestaurantPage() {
  const router = useRouter();
  const { authenticated, loading, configured } = useAppSession();
  const [nameError, setNameError] = useState("");
  const [submitError, setSubmitError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [initialMenuPreviewUrl, setInitialMenuPreviewUrl] = useState("");
  const [initialMenuFile, setInitialMenuFile] = useState<File | null>(null);
  const [initialMenuConverting, setInitialMenuConverting] = useState(false);
  const [initialMenuPhotoError, setInitialMenuPhotoError] = useState("");

  async function handleInitialMenuFile(file: File | undefined) {
    if (!file) {
      setInitialMenuPreviewUrl("");
      setInitialMenuFile(null);
      return;
    }

    setInitialMenuPhotoError("");
    setInitialMenuConverting(true);

    try {
      const imageFile = isHeicFile(file) ? await convertHeicToJpeg(file) : file;
      setInitialMenuFile(imageFile);
      setInitialMenuPreviewUrl(URL.createObjectURL(imageFile));
    } catch {
      setInitialMenuFile(null);
      setInitialMenuPreviewUrl("");
      setInitialMenuPhotoError("HEIC 사진을 JPEG로 변환하지 못했습니다. 다른 사진을 선택하세요.");
    } finally {
      setInitialMenuConverting(false);
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!authenticated || submitting || initialMenuConverting) {
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
    setSubmitting(true);

    if (initialMenuFile) {
      form.set("initialMenuPhoto", initialMenuFile);
    }

    const response = await fetch("/api/restaurants", { method: "POST", body: form });
    const data = (await response.json()) as { id?: string; error?: string };

    if (!response.ok || !data.id) {
      setSubmitError(data.error ?? "식당을 저장하지 못했습니다.");
      setSubmitting(false);
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
          <div className="border-t border-line pt-4">
            <h2 className="text-lg font-semibold">메뉴도 바로 추가</h2>
            <p className="mt-1 text-sm leading-6 text-ink/65">
              선택 사항입니다. 식당을 만든 뒤에도 메뉴를 추가할 수 있습니다.
            </p>
          </div>
          <Field label="메뉴 사진">
            <PasteImageInput
              name="initialMenuPhoto"
              accept="image/*,.heic,.heif,image/heic,image/heif"
              onFile={handleInitialMenuFile}
              preprocessFile={preprocessMenuPhotoFile}
              cropMenuPhoto
            />
          </Field>
          {initialMenuConverting ? (
            <p className="text-sm text-ink/60">HEIC 사진을 JPEG로 변환하는 중...</p>
          ) : null}
          {initialMenuPhotoError ? (
            <p className="text-sm text-red-700">{initialMenuPhotoError}</p>
          ) : null}
          {initialMenuPreviewUrl ? (
            <div className="border border-line bg-white/70 p-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={initialMenuPreviewUrl}
                alt="선택한 메뉴 미리보기"
                className="h-auto w-full bg-white object-contain"
              />
            </div>
          ) : null}
          <Field label="촬영일">
            <DateSelectInput name="initialMenuTakenAt" defaultValue={todayDateValue()} />
          </Field>
          <SubmitButton disabled={submitting || initialMenuConverting}>
            {submitting ? "저장 중..." : "식당 만들기"}
          </SubmitButton>
          {submitError ? <p className="text-sm text-red-700">{submitError}</p> : null}
        </form>
      ) : null}
    </PageShell>
  );
}

function isHeicFile(file: File) {
  const name = file.name.toLowerCase();

  return (
    file.type === "image/heic" ||
    file.type === "image/heif" ||
    name.endsWith(".heic") ||
    name.endsWith(".heif")
  );
}

async function preprocessMenuPhotoFile(file: File) {
  return isHeicFile(file) ? convertHeicToJpeg(file) : file;
}

async function convertHeicToJpeg(file: File) {
  const { default: heic2any } = await import("heic2any");
  const converted = await heic2any({
    blob: file,
    toType: "image/jpeg",
    quality: 0.9,
  });
  const blob = Array.isArray(converted) ? converted[0] : converted;
  const name = file.name.replace(/\.(heic|heif)$/i, ".jpg");

  return new File([blob], name, { type: "image/jpeg" });
}
