import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";

export const appSessionCookieName = "menudex_session";

const sessionMaxAgeSeconds = 60 * 60 * 24 * 30;

export type AppSession = {
  ownerId: string;
  profileId: string;
};

export type AppConfigStatus = {
  configured: boolean;
  missing: string[];
};

const requiredEnvVars = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "SUPABASE_SERVICE_ROLE_KEY",
  "MENUDEX_OWNER_ID",
  "MENUDEX_SESSION_SECRET",
] as const;

export function getAppConfigStatus(): AppConfigStatus {
  const missing = requiredEnvVars.filter((name) => !process.env[name]);

  return {
    configured: missing.length === 0,
    missing,
  };
}

export function getOwnerId() {
  return process.env.MENUDEX_OWNER_ID ?? "";
}

export function createSessionToken(profileId: string) {
  const expiresAt = Math.floor(Date.now() / 1000) + sessionMaxAgeSeconds;
  const payload = `${profileId}.${expiresAt}`;
  const signature = sign(payload);

  return `${payload}.${signature}`;
}

export async function getAppSession(): Promise<AppSession | null> {
  const token = (await cookies()).get(appSessionCookieName)?.value;

  if (!token) {
    return null;
  }

  const [profileId, expiresAtRaw, signature] = token.split(".");
  const expiresAt = Number(expiresAtRaw);

  if (!profileId || !expiresAt || !signature) {
    return null;
  }

  if (expiresAt < Math.floor(Date.now() / 1000)) {
    return null;
  }

  if (!safeEqual(signature, sign(`${profileId}.${expiresAt}`))) {
    return null;
  }

  return { ownerId: getOwnerId(), profileId };
}

export function getSessionMaxAgeSeconds() {
  return sessionMaxAgeSeconds;
}

function sign(value: string) {
  const secret = process.env.MENUDEX_SESSION_SECRET ?? "";

  return createHmac("sha256", secret).update(value).digest("base64url");
}

function safeEqual(left: string, right: string) {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);

  if (leftBuffer.byteLength !== rightBuffer.byteLength) {
    return false;
  }

  return timingSafeEqual(leftBuffer, rightBuffer);
}
