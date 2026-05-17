"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import {
  LoadingState,
  LoginRequired,
  SetupRequired,
} from "@/components/app-state";
import { DateSelectInput, Field, SubmitButton, TextInput } from "@/components/form-fields";
import { PageShell, SecondaryLink } from "@/components/page-shell";
import { PasteImageInput } from "@/components/paste-image-input";
import { clearCachedJson } from "@/lib/client-cache";
import { todayDateValue } from "@/lib/date";
import { useAppSession } from "@/lib/use-app-session";

export function NewMenuForm({ restaurantId }: { restaurantId: string }) {
  const router = useRouter();
  const { authenticated, loading, configured } = useAppSession();
  const [previewUrl, setPreviewUrl] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [converting, setConverting] = useState(false);
  const [photoError, setPhotoError] = useState("");
  const [photoSubmitError, setPhotoSubmitError] = useState("");
  const [photoSubmitting, setPhotoSubmitting] = useState(false);
  const [nameError, setNameError] = useState("");
  const [menuSubmitError, setMenuSubmitError] = useState("");
  const [menuSubmitting, setMenuSubmitting] = useState(false);

  async function handleImageFile(file: File | undefined) {
    if (!file) {
      setPreviewUrl("");
      setSelectedFile(null);
      return;
    }

    setPhotoError("");
    setPhotoSubmitError("");
    setConverting(true);

    try {
      const imageFile = isHeicFile(file) ? await convertHeicToJpeg(file) : file;
      setSelectedFile(imageFile);
      setPreviewUrl(URL.createObjectURL(imageFile));
    } catch {
      setSelectedFile(null);
      setPreviewUrl("");
      setPhotoError("HEIC 사진을 JPEG로 변환하지 못했습니다. 다른 사진을 선택하세요.");
    } finally {
      setConverting(false);
    }
  }

  async function handlePhotoSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!authenticated || photoSubmitting) {
      return;
    }

    const form = new FormData(event.currentTarget);
    const file = selectedFile ?? form.get("menuPhoto");

    if (!(file instanceof File) || file.size === 0) {
      setPhotoError("메뉴 사진을 선택하세요.");
      return;
    }

    setPhotoError("");
    setPhotoSubmitError("");
    setPhotoSubmitting(true);
    form.set("menuPhoto", file);

    const response = await fetch(`/api/restaurants/${restaurantId}/menu-photos`, {
      method: "POST",
      body: form,
    });
    const data = (await response.json()) as { error?: string };

    if (!response.ok) {
      setPhotoSubmitError(data.error ?? "메뉴 사진을 저장하지 못했습니다.");
      setPhotoSubmitting(false);
      return;
    }

    clearCachedJson(`/api/restaurants/${restaurantId}`);
    clearCachedJson("/api/restaurants");
    router.push(`/restaurants/${restaurantId}`);
  }

  async function handleManualMenuSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!authenticated || menuSubmitting) {
      return;
    }

    const form = new FormData(event.currentTarget);
    const name = String(form.get("name") ?? "").trim();
    const priceRaw = String(form.get("price") ?? "").trim();

    if (!name) {
      setNameError("메뉴 이름을 입력하세요.");
      return;
    }

    setNameError("");
    setMenuSubmitError("");
    setMenuSubmitting(true);

    const response = await fetch(`/api/restaurants/${restaurantId}/menu-items`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name,
        price: priceRaw,
      }),
    });
    const data = (await response.json()) as { error?: string };

    if (!response.ok) {
      setMenuSubmitError(data.error ?? "메뉴를 저장하지 못했습니다.");
      setMenuSubmitting(false);
      return;
    }

    clearCachedJson(`/api/restaurants/${restaurantId}`);
    router.push(`/restaurants/${restaurantId}`);
  }

  return (
    <PageShell
      eyebrow="추가"
      title="메뉴 추가"
      action={<SecondaryLink href={`/restaurants/${restaurantId}`}>뒤로</SecondaryLink>}
    >
      {!configured ? <SetupRequired /> : null}
      {configured && loading ? <LoadingState /> : null}
      {configured && !loading && !authenticated ? <LoginRequired /> : null}
      {configured && authenticated ? (
        <div className="mt-6 grid max-w-xl gap-8">
          <form noValidate onSubmit={handlePhotoSubmit} className="grid gap-4">
            <div>
              <h2 className="text-lg font-semibold">메뉴 사진</h2>
              <p className="mt-1 text-sm leading-6 text-ink/65">
                기본 방식입니다. 휴대폰 갤러리나 컴퓨터에서 메뉴 사진을 선택하세요.
              </p>
            </div>
            <Field label="메뉴 사진" required error={photoError}>
              <PasteImageInput
                name="menuPhoto"
                accept="image/*,.heic,.heif,image/heic,image/heif"
                onFile={handleImageFile}
                cropMenuPhoto
              />
            </Field>
            {converting ? (
              <p className="text-sm text-ink/60">HEIC 사진을 JPEG로 변환하는 중...</p>
            ) : null}
            {previewUrl ? (
              <div className="border border-line bg-white/70 p-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={previewUrl}
                  alt="선택한 메뉴 미리보기"
                  className="h-auto w-full bg-white object-contain"
                />
              </div>
            ) : null}
            <Field label="촬영일" required>
              <DateSelectInput name="takenAt" defaultValue={todayDateValue()} />
            </Field>
            <SubmitButton disabled={converting || photoSubmitting}>
              {photoSubmitting ? "저장 중..." : converting ? "변환 중..." : "메뉴 사진 추가"}
            </SubmitButton>
            {photoSubmitError ? (
              <p className="text-sm text-red-700">{photoSubmitError}</p>
            ) : null}
          </form>

          <form
            noValidate
            onSubmit={handleManualMenuSubmit}
            className="grid gap-4 border-t border-line pt-6"
          >
            <div>
              <h2 className="text-lg font-semibold">직접 추가</h2>
              <p className="mt-1 text-sm leading-6 text-ink/65">
                메뉴 사진 없이 이름만 먼저 저장할 때 사용하세요.
              </p>
            </div>
            <Field label="메뉴 이름" required error={nameError}>
              <TextInput name="name" placeholder="메뉴 이름" />
            </Field>
            <Field label="가격">
              <TextInput name="price" inputMode="numeric" placeholder="가격" />
            </Field>
            <SubmitButton disabled={menuSubmitting}>
              {menuSubmitting ? "저장 중..." : "직접 메뉴 추가"}
            </SubmitButton>
            {menuSubmitError ? (
              <p className="text-sm text-red-700">{menuSubmitError}</p>
            ) : null}
          </form>
        </div>
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
