"use client";

const cachePrefix = "menudex:cache:v1:";

type CacheEntry<T> = {
  expiresAt: number;
  data: T;
};

export async function getCachedJson<T>(url: string, ttlMs: number): Promise<T> {
  const cached = readCache<T>(url);

  if (cached && cached.expiresAt > Date.now()) {
    return cached.data;
  }

  const response = await fetch(url, { cache: "no-store" });
  const data = (await response.json()) as T;

  if (response.ok) {
    writeCache(url, data, ttlMs);
  }

  return data;
}

export function clearCachedJson(urlPrefix?: string) {
  if (typeof window === "undefined") {
    return;
  }

  const fullPrefix = `${cachePrefix}${urlPrefix ?? ""}`;

  for (let index = window.sessionStorage.length - 1; index >= 0; index -= 1) {
    const key = window.sessionStorage.key(index);

    if (key?.startsWith(fullPrefix)) {
      window.sessionStorage.removeItem(key);
    }
  }
}

function readCache<T>(url: string): CacheEntry<T> | null {
  if (typeof window === "undefined") {
    return null;
  }

  const raw = window.sessionStorage.getItem(`${cachePrefix}${url}`);

  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw) as CacheEntry<T>;
  } catch {
    window.sessionStorage.removeItem(`${cachePrefix}${url}`);
    return null;
  }
}

function writeCache<T>(url: string, data: T, ttlMs: number) {
  if (typeof window === "undefined") {
    return;
  }

  window.sessionStorage.setItem(
    `${cachePrefix}${url}`,
    JSON.stringify({
      expiresAt: Date.now() + ttlMs,
      data,
    } satisfies CacheEntry<T>),
  );
}
