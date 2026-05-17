"use client";

import { FormEvent, useEffect, useState } from "react";
import { SetupRequired } from "@/components/app-state";
import { Field, SubmitButton, TextInput } from "@/components/form-fields";
import { PageShell } from "@/components/page-shell";
import { PasteImageInput } from "@/components/paste-image-input";
import { clearCachedJson, getCachedJson } from "@/lib/client-cache";
import type { ProfileRow } from "@/lib/supabase/types";

const defaultProfileIcon = "/defaulticon.png";

export default function ProfilesPage() {
  const [profiles, setProfiles] = useState<ProfileRow[]>([]);
  const [configured, setConfigured] = useState(true);
  const [loading, setLoading] = useState(true);
  const [nameError, setNameError] = useState("");
  const [submitError, setSubmitError] = useState("");
  const [createSubmitting, setCreateSubmitting] = useState(false);
  const [editingProfileId, setEditingProfileId] = useState("");
  const [editNameError, setEditNameError] = useState("");
  const [editSubmitError, setEditSubmitError] = useState("");
  const [editSubmitting, setEditSubmitting] = useState(false);

  useEffect(() => {
    loadProfiles();
  }, []);

  async function loadProfiles() {
    setLoading(true);
    const data = await getCachedJson<{
      configured?: boolean;
      profiles?: ProfileRow[];
      error?: string;
    }>("/api/profiles", 30_000);

    setConfigured(Boolean(data.configured));
    setProfiles(data.profiles ?? []);
    setLoading(false);
  }

  async function selectProfile(profileId: string) {
    const response = await fetch("/api/session", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ profileId }),
    });

    if (response.ok) {
      clearCachedJson("/api/session");
      clearCachedJson("/api/restaurants");
      clearCachedJson("/api/visits");
      window.location.href = "/restaurants";
    }
  }

  async function createProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (createSubmitting) {
      return;
    }

    const form = new FormData(event.currentTarget);
    const displayName = String(form.get("displayName") ?? "").trim();

    if (!displayName) {
      setNameError("프로필 이름을 입력하세요.");
      return;
    }

    setNameError("");
    setSubmitError("");
    setCreateSubmitting(true);

    const response = await fetch("/api/profiles", {
      method: "POST",
      body: form,
    });
    const data = (await response.json()) as { id?: string; error?: string };

    if (!response.ok || !data.id) {
      setSubmitError(data.error ?? "프로필을 만들지 못했습니다.");
      setCreateSubmitting(false);
      return;
    }

    clearCachedJson("/api/profiles");
    await selectProfile(data.id);
  }

  async function updateProfile(event: FormEvent<HTMLFormElement>, profileId: string) {
    event.preventDefault();
    if (editSubmitting) {
      return;
    }

    const form = new FormData(event.currentTarget);
    const displayName = String(form.get("displayName") ?? "").trim();

    if (!displayName) {
      setEditNameError("프로필 이름을 입력하세요.");
      return;
    }

    setEditNameError("");
    setEditSubmitError("");
    setEditSubmitting(true);

    const response = await fetch(`/api/profiles/${profileId}`, {
      method: "PATCH",
      body: form,
    });
    const data = (await response.json()) as { error?: string };

    if (!response.ok) {
      setEditSubmitError(data.error ?? "프로필을 수정하지 못했습니다.");
      setEditSubmitting(false);
      return;
    }

    clearCachedJson("/api/profiles");
    clearCachedJson("/api/session");
    setEditingProfileId("");
    setEditSubmitting(false);
    await loadProfiles();
  }

  async function deleteProfile(profileId: string, displayName: string) {
    const confirmed = window.confirm(
      `${displayName} 프로필을 삭제할까요?\n이 프로필의 방문 기록, 하이라이트, 업로드한 메뉴 사진도 함께 삭제됩니다.`,
    );

    if (!confirmed) {
      return;
    }

    setEditNameError("");
    setEditSubmitError("");
    setEditSubmitting(true);

    const response = await fetch(`/api/profiles/${profileId}`, {
      method: "DELETE",
    });
    const data = (await response.json()) as { error?: string };

    if (!response.ok) {
      setEditSubmitError(data.error ?? "프로필을 삭제하지 못했습니다.");
      setEditSubmitting(false);
      return;
    }

    clearCachedJson("/api/profiles");
    clearCachedJson("/api/session");
    clearCachedJson("/api/visits");
    await fetch("/api/session", { method: "DELETE" });
    setEditingProfileId("");
    setEditSubmitting(false);
    await loadProfiles();
  }

  return (
    <PageShell eyebrow="MenuDex" title="프로필 선택" showProfile={false}>
      {!configured ? <SetupRequired /> : null}
      {configured && loading ? (
        <p className="mt-6 text-sm text-ink/60">불러오는 중...</p>
      ) : null}
      {configured && !loading ? (
        <div className="mt-6 grid gap-8">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {profiles.map((profile) => (
              <div key={profile.id} className="border border-line bg-white/75 p-4">
                {editingProfileId === profile.id ? (
                  <form
                    noValidate
                    onSubmit={(event) => updateProfile(event, profile.id)}
                    className="grid gap-3"
                  >
                    <Field label="프로필 이름" required error={editNameError}>
                      <TextInput name="displayName" defaultValue={profile.display_name} />
                    </Field>
                    <Field label="아이콘">
                      <PasteImageInput
                        name="icon"
                        accept="image/*"
                        compact
                        preview
                        cropSquare
                        currentPreviewUrl={profile.iconUrl}
                      />
                    </Field>
                    <div className="flex flex-wrap items-center gap-2">
                      <div className="flex flex-wrap gap-2">
                        <SubmitButton disabled={editSubmitting}>
                          {editSubmitting ? "저장 중..." : "저장"}
                        </SubmitButton>
                        <button
                          type="button"
                          disabled={editSubmitting}
                          onClick={() => {
                            setEditingProfileId("");
                            setEditNameError("");
                            setEditSubmitError("");
                            setEditSubmitting(false);
                          }}
                          className="inline-flex min-h-11 items-center justify-center border border-line bg-white px-4 text-sm font-medium text-ink disabled:cursor-not-allowed disabled:bg-ink/5 disabled:text-ink/35"
                        >
                          취소
                        </button>
                      </div>
                      <button
                        type="button"
                        disabled={editSubmitting}
                        onClick={() => deleteProfile(profile.id, profile.display_name)}
                        className="inline-flex min-h-11 items-center justify-center border border-red-200 bg-red-50 px-4 text-sm font-medium text-red-700 disabled:cursor-not-allowed disabled:bg-red-50/40 disabled:text-red-700/35"
                      >
                        프로필 삭제
                      </button>
                    </div>
                    {editSubmitError ? (
                      <p className="text-sm text-red-700">{editSubmitError}</p>
                    ) : null}
                  </form>
                ) : (
                  <div className="flex min-h-28 items-center gap-3">
                    <button
                      type="button"
                      onClick={() => selectProfile(profile.id)}
                      className="shrink-0 text-left"
                      aria-label={`${profile.display_name} 프로필 선택`}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={profile.iconUrl ?? defaultProfileIcon}
                        alt=""
                        className="h-20 w-20 shrink-0 border border-line bg-white object-contain"
                      />
                    </button>
                    <div className="grid min-w-0 flex-1 gap-2">
                      <button
                        type="button"
                        onClick={() => selectProfile(profile.id)}
                        className="min-w-0 text-left"
                      >
                        <span className="block truncate text-lg font-semibold">
                          {profile.display_name}
                        </span>
                      </button>
                    <button
                      type="button"
                      onClick={() => {
                        setEditingProfileId(profile.id);
                        setEditNameError("");
                        setEditSubmitError("");
                      }}
                      className="min-h-10 justify-self-start border border-line bg-white px-3 text-sm font-medium text-ink"
                    >
                      수정
                    </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>

          <form noValidate onSubmit={createProfile} className="grid max-w-xl gap-4 border-t border-line pt-6">
            <h2 className="text-lg font-semibold">프로필 추가</h2>
            <Field label="프로필 이름" required error={nameError}>
              <TextInput name="displayName" placeholder="이름" />
            </Field>
            <Field label="아이콘">
              <PasteImageInput name="icon" accept="image/*" compact preview cropSquare />
            </Field>
            <SubmitButton disabled={createSubmitting}>
              {createSubmitting ? "저장 중..." : "프로필 만들기"}
            </SubmitButton>
            {submitError ? <p className="text-sm text-red-700">{submitError}</p> : null}
          </form>
        </div>
      ) : null}
    </PageShell>
  );
}
