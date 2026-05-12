import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import {
  appSessionCookieName,
  createSessionToken,
  getAppConfigStatus,
  getAppSession,
  getOwnerId,
  getSessionMaxAgeSeconds,
  verifyAppPassword,
} from "@/lib/app-auth";

export async function GET() {
  const status = getAppConfigStatus();
  const session = await getAppSession();

  return NextResponse.json({
    configured: status.configured,
    missing: status.missing,
    authenticated: Boolean(session),
  });
}

export async function POST(request: Request) {
  const status = getAppConfigStatus();

  if (!status.configured) {
    return NextResponse.json(
      { error: "MenuDex 설정이 필요합니다.", missing: status.missing },
      { status: 503 },
    );
  }

  const body = (await request.json().catch(() => null)) as { password?: string } | null;
  const password = body?.password ?? "";

  if (!verifyAppPassword(password)) {
    return NextResponse.json(
      { error: "비밀번호가 맞지 않습니다." },
      { status: 401 },
    );
  }

  const response = NextResponse.json({ ok: true });
  response.cookies.set(appSessionCookieName, createSessionToken(getOwnerId()), {
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
