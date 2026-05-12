import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import {
  appSessionCookieName,
  createSessionToken,
  getAppConfigStatus,
  getAppSession,
  getSessionMaxAgeSeconds,
} from "@/lib/app-auth";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET() {
  const status = getAppConfigStatus();
  const session = await getAppSession();
  let profile = null;

  if (session) {
    const supabase = createAdminClient();
    const { data } = await supabase
      .from("profiles")
      .select("id, display_name, icon_storage_path")
      .eq("id", session.profileId)
      .maybeSingle();
    profile = data
      ? {
          id: data.id,
          displayName: data.display_name,
          iconUrl: await createSignedIconUrl(supabase, data.icon_storage_path),
        }
      : null;
  }

  return NextResponse.json({
    configured: status.configured,
    missing: status.missing,
    authenticated: Boolean(profile),
    profile,
  });
}

async function createSignedIconUrl(
  supabase: ReturnType<typeof createAdminClient>,
  path: string | null,
) {
  if (!path) {
    return undefined;
  }

  const { data } = await supabase.storage.from("menu-photos").createSignedUrl(path, 60 * 60);

  return data?.signedUrl;
}

export async function POST(request: Request) {
  const status = getAppConfigStatus();

  if (!status.configured) {
    return NextResponse.json(
      { error: "MenuDex 설정이 필요합니다.", missing: status.missing },
      { status: 503 },
    );
  }

  const body = (await request.json().catch(() => null)) as { profileId?: string } | null;
  const profileId = body?.profileId ?? "";

  if (!profileId) {
    return NextResponse.json(
      { error: "프로필을 선택하세요." },
      { status: 400 },
    );
  }

  const supabase = createAdminClient();
  const { data: profile, error } = await supabase
    .from("profiles")
    .select("id")
    .eq("id", profileId)
    .maybeSingle();

  if (error || !profile) {
    return NextResponse.json(
      { error: "프로필을 찾을 수 없습니다." },
      { status: 404 },
    );
  }

  const response = NextResponse.json({ ok: true });
  response.cookies.set(appSessionCookieName, createSessionToken(profile.id), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: getSessionMaxAgeSeconds(),
  });

  return response;
}

export async function DELETE() {
  const response = NextResponse.json({ ok: true });
  (await cookies()).delete(appSessionCookieName);

  return response;
}
