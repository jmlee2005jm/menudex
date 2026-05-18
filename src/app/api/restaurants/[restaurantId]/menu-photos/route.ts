import { NextResponse } from "next/server";
import { assertRestaurantOwner, requireAppSession } from "@/lib/api";
import { createAdminClient } from "@/lib/supabase/admin";
import { todayDateValue } from "@/lib/date";

export async function POST(
  request: Request,
  context: { params: Promise<{ restaurantId: string }> },
) {
  const auth = await requireAppSession();

  if ("response" in auth) {
    return auth.response;
  }

  const { restaurantId } = await context.params;
  const supabase = createAdminClient();
  const ownsRestaurant = await assertRestaurantOwner(
    supabase,
    restaurantId,
    auth.session.ownerId,
  );

  if (!ownsRestaurant) {
    return NextResponse.json({ error: "식당을 찾을 수 없습니다." }, { status: 404 });
  }

  const form = await request.formData();
  const files = form
    .getAll("menuPhoto")
    .filter((file): file is File => file instanceof File && file.size > 0);

  if (files.length === 0) {
    return NextResponse.json(
      { error: "메뉴 사진을 선택하세요." },
      { status: 400 },
    );
  }

  const uploadedPhotos: Array<{ storagePath: string; takenAt: string }> = [];
  const takenAt = String(form.get("takenAt") ?? "").trim() || todayDateValue();

  for (const file of files) {
    const extension = file.name.split(".").pop() || "jpg";
    const storagePath = `${auth.session.ownerId}/${restaurantId}/${crypto.randomUUID()}.${extension}`;
    const upload = await supabase.storage.from("menu-photos").upload(storagePath, file, {
      upsert: false,
      contentType: file.type || undefined,
    });

    if (upload.error) {
      if (uploadedPhotos.length > 0) {
        await supabase.storage
          .from("menu-photos")
          .remove(uploadedPhotos.map((photo) => photo.storagePath));
      }

      return NextResponse.json({ error: upload.error.message }, { status: 500 });
    }

    uploadedPhotos.push({ storagePath, takenAt });
  }

  const { error } = await supabase.from("menu_photos").insert(
    uploadedPhotos.map((photo) => ({
      restaurant_id: restaurantId,
      owner_profile_id: auth.session.profileId,
      storage_path: photo.storagePath,
      taken_at: photo.takenAt,
    })),
  );

  if (error) {
    await supabase.storage
      .from("menu-photos")
      .remove(uploadedPhotos.map((photo) => photo.storagePath));

    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, count: uploadedPhotos.length }, { status: 201 });
}

export async function DELETE(
  request: Request,
  context: { params: Promise<{ restaurantId: string }> },
) {
  const auth = await requireAppSession();

  if ("response" in auth) {
    return auth.response;
  }

  const { restaurantId } = await context.params;
  const body = (await request.json().catch(() => null)) as
    | { menuPhotoId?: string }
    | null;

  if (!body?.menuPhotoId) {
    return NextResponse.json(
      { error: "삭제할 메뉴 사진을 찾을 수 없습니다." },
      { status: 400 },
    );
  }

  const supabase = createAdminClient();
  const ownsRestaurant = await assertRestaurantOwner(
    supabase,
    restaurantId,
    auth.session.ownerId,
  );

  if (!ownsRestaurant) {
    return NextResponse.json({ error: "식당을 찾을 수 없습니다." }, { status: 404 });
  }

  const { data: photo, error: photoError } = await supabase
    .from("menu_photos")
    .select("storage_path, owner_profile_id")
    .eq("id", body.menuPhotoId)
    .eq("restaurant_id", restaurantId)
    .maybeSingle();

  if (photoError) {
    return NextResponse.json({ error: photoError.message }, { status: 500 });
  }

  if (!photo) {
    return NextResponse.json(
      { error: "메뉴 사진을 찾을 수 없습니다." },
      { status: 404 },
    );
  }

  if (photo.owner_profile_id !== auth.session.profileId) {
    return NextResponse.json(
      { error: "사진을 올린 프로필만 삭제할 수 있습니다." },
      { status: 403 },
    );
  }

  await supabase.storage.from("menu-photos").remove([photo.storage_path]);

  const { error } = await supabase
    .from("menu_photos")
    .delete()
    .eq("id", body.menuPhotoId)
    .eq("restaurant_id", restaurantId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
