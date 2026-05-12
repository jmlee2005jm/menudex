"use client";

import { FormEvent, useState } from "react";
import { SetupRequired } from "@/components/app-state";
import { Field, SubmitButton, TextInput } from "@/components/form-fields";
import { PageShell, SecondaryLink } from "@/components/page-shell";
import { useAppSession } from "@/lib/use-app-session";

export default function LoginPage() {
  const { configured, loading, authenticated } = useAppSession();
  const [passwordError, setPasswordError] = useState("");
  const [message, setMessage] = useState("");
  const [passwordLoading, setPasswordLoading] = useState(false);

  async function handlePasswordLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const password = String(form.get("password") ?? "");

    if (!password) {
      setPasswordError("비밀번호를 입력하세요.");
      return;
    }

    setPasswordError("");
    setMessage("");
    setPasswordLoading(true);

    const response = await fetch("/api/session", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ password }),
    });
    const data = (await response.json()) as { error?: string };

    setPasswordLoading(false);

    if (!response.ok) {
      setMessage(data.error ?? "로그인에 실패했습니다.");
      return;
    }

    window.location.href = "/restaurants";
  }

  return (
    <PageShell
      eyebrow="MenuDex"
      title="로그인"
      action={<SecondaryLink href="/restaurants">식당 목록</SecondaryLink>}
    >
      {loading ? (
        <p className="mt-6 text-sm text-ink/60">확인하는 중...</p>
      ) : !configured ? (
        <SetupRequired />
      ) : authenticated ? (
        <div className="mt-6 max-w-xl border border-line bg-white/70 p-4">
          <p className="text-sm text-ink/65">이미 로그인되어 있습니다.</p>
          <div className="mt-4">
            <SecondaryLink href="/restaurants">식당 목록으로</SecondaryLink>
          </div>
        </div>
      ) : (
        <div className="mt-6 grid max-w-xl gap-4">
          <p className="text-sm leading-6 text-ink/65">
            지금은 개인용 앱 비밀번호 하나로 사용합니다. 데이터는 Supabase DB에
            owner UUID로 저장되어 나중에 사용자 계정 방식으로 바꾸기 쉽습니다.
          </p>
          <form noValidate onSubmit={handlePasswordLogin} className="grid gap-4">
            <Field label="비밀번호" required error={passwordError}>
              <TextInput name="password" type="password" placeholder="앱 비밀번호" />
            </Field>
            <SubmitButton disabled={passwordLoading}>
              {passwordLoading ? "로그인 중..." : "열기"}
            </SubmitButton>
          </form>

          {message ? <p className="text-sm text-ink/65">{message}</p> : null}
        </div>
      )}
    </PageShell>
  );
}
