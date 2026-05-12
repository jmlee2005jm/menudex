import { NextResponse } from "next/server";
import { getAppConfigStatus } from "@/lib/app-auth";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET() {
  const status = getAppConfigStatus();

  if (!status.configured) {
    return NextResponse.json({
      configured: false,
      missing: status.missing,
      profiles: [],
    });
  }

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .order("created_at", { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const profiles = await Promise.all(
    (data ?? []).map(async (profile) => ({
      ...profile,
      iconUrl: await createSignedIconUrl(supabase, profile.icon_storage_path),
    })),
  );

  return NextResponse.json({ configured: true, profiles });
}

export async function POST(request: Request) {
  const status = getAppConfigStatus();

  if (!status.configured) {
    return NextResponse.json(
      { error: "MenuDex 설정이 필요합니다.", missing: status.missing },
      { status: 503 },
    );
  }

  const form = await request.formData();
  const displayName = String(form.get("displayName") ?? "").trim();

  if (!displayName) {
    return NextResponse.json(
      { error: "프로필 이름을 입력하세요." },
      { status: 400 },
    );
  }

  const supabase = createAdminClient();
  const iconStoragePath = await uploadProfileIcon(supabase, form.get("icon"));
  const { data, error } = await supabase
    .from("profiles")
    .insert({
      display_name: displayName,
      icon_storage_path: iconStoragePath,
    })
    .select("id")
    .single();

  if (error || !data) {
    return NextResponse.json(
      { error: error?.message ?? "프로필을 만들지 못했습니다." },
      { status: 500 },
    );
  }

  return NextResponse.json({ id: data.id }, { status: 201 });
}

async function uploadProfileIcon(
  supabase: ReturnType<typeof createAdminClient>,
  value: FormDataEntryValue | null,
) {
  if (!(value instanceof File) || value.size === 0) {
    return null;
  }

  const extension = value.name.split(".").pop() || "jpg";
  const path = `profiles/${crypto.randomUUID()}.${extension}`;
  const upload = await supabase.storage.from("menu-photos").upload(path, value, {
    upsert: false,
    contentType: value.type || undefined,
  });

  if (upload.error) {
    throw upload.error;
  }

  return path;
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
