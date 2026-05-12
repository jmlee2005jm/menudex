import { NextResponse } from "next/server";
import { getAppConfigStatus } from "@/lib/app-auth";
import { createAdminClient } from "@/lib/supabase/admin";

export async function PATCH(
  request: Request,
  context: { params: Promise<{ profileId: string }> },
) {
  const status = getAppConfigStatus();

  if (!status.configured) {
    return NextResponse.json(
      { error: "MenuDex 설정이 필요합니다.", missing: status.missing },
      { status: 503 },
    );
  }

  const { profileId } = await context.params;
  const form = await request.formData();
  const displayName = String(form.get("displayName") ?? "").trim();

  if (!displayName) {
    return NextResponse.json(
      { error: "프로필 이름을 입력하세요." },
      { status: 400 },
    );
  }

  const supabase = createAdminClient();
  const current = await supabase
    .from("profiles")
    .select("icon_storage_path")
    .eq("id", profileId)
    .maybeSingle();

  if (current.error) {
    return NextResponse.json({ error: current.error.message }, { status: 500 });
  }

  if (!current.data) {
    return NextResponse.json(
      { error: "프로필을 찾을 수 없습니다." },
      { status: 404 },
    );
  }

  const iconStoragePath = await uploadProfileIcon(supabase, form.get("icon"));

  if (iconStoragePath && current.data.icon_storage_path) {
    await supabase.storage.from("menu-photos").remove([current.data.icon_storage_path]);
  }

  const { error } = await supabase
    .from("profiles")
    .update({
      display_name: displayName,
      ...(iconStoragePath ? { icon_storage_path: iconStoragePath } : {}),
    })
    .eq("id", profileId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ profileId: string }> },
) {
  const status = getAppConfigStatus();

  if (!status.configured) {
    return NextResponse.json(
      { error: "MenuDex 설정이 필요합니다.", missing: status.missing },
      { status: 503 },
    );
  }

  const { profileId } = await context.params;
  const supabase = createAdminClient();
  const profiles = await supabase.from("profiles").select("id", { count: "exact" });

  if (profiles.error) {
    return NextResponse.json({ error: profiles.error.message }, { status: 500 });
  }

  if ((profiles.count ?? 0) <= 1) {
    return NextResponse.json(
      { error: "마지막 프로필은 삭제할 수 없습니다." },
      { status: 400 },
    );
  }

  const current = await supabase
    .from("profiles")
    .select("id, icon_storage_path")
    .eq("id", profileId)
    .maybeSingle();

  if (current.error) {
    return NextResponse.json({ error: current.error.message }, { status: 500 });
  }

  if (!current.data) {
    return NextResponse.json(
      { error: "프로필을 찾을 수 없습니다." },
      { status: 404 },
    );
  }

  const ownedPhotos = await supabase
    .from("menu_photos")
    .select("id, storage_path")
    .eq("owner_profile_id", profileId);

  if (ownedPhotos.error) {
    return NextResponse.json({ error: ownedPhotos.error.message }, { status: 500 });
  }

  const ownedPhotoIds = (ownedPhotos.data ?? []).map((photo) => photo.id);
  const storagePaths = [
    current.data.icon_storage_path,
    ...(ownedPhotos.data ?? []).map((photo) => photo.storage_path),
  ].filter(Boolean) as string[];

  if (ownedPhotoIds.length > 0) {
    const deletePhotos = await supabase
      .from("menu_photos")
      .delete()
      .in("id", ownedPhotoIds);

    if (deletePhotos.error) {
      return NextResponse.json({ error: deletePhotos.error.message }, { status: 500 });
    }
  }

  const deletedProfile = await supabase.from("profiles").delete().eq("id", profileId);

  if (deletedProfile.error) {
    return NextResponse.json({ error: deletedProfile.error.message }, { status: 500 });
  }

  if (storagePaths.length > 0) {
    await supabase.storage.from("menu-photos").remove(storagePaths);
  }

  return NextResponse.json({ ok: true });
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
