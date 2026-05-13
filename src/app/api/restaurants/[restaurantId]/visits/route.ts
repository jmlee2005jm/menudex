import { NextResponse } from "next/server";
import { assertRestaurantOwner, requireAppSession } from "@/lib/api";
import { todayDateValue } from "@/lib/date";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(
  request: Request,
  context: { params: Promise<{ restaurantId: string }> },
) {
  const auth = await requireAppSession();

  if ("response" in auth) {
    return auth.response;
  }

  const { restaurantId } = await context.params;
  const form = await request.formData();
  const menuName = String(form.get("menuName") ?? "").trim();
  const rating = String(form.get("rating") ?? "").trim();

  if (!menuName) {
    return NextResponse.json(
      { error: "먹은 메뉴를 입력하세요." },
      { status: 400 },
    );
  }

  if (!rating) {
    return NextResponse.json(
      { error: "별점을 선택하세요." },
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

  const { data: visit, error: visitError } = await supabase
    .from("visits")
    .insert({
      restaurant_id: restaurantId,
      user_id: auth.session.ownerId,
      profile_id: auth.session.profileId,
      visited_at: String(form.get("visitedAt") ?? "").trim() || todayDateValue(),
      meal_type: String(form.get("mealType") ?? "other"),
    })
    .select("id")
    .single();

  if (visitError || !visit) {
    return NextResponse.json(
      { error: visitError?.message ?? "방문 기록을 저장하지 못했습니다." },
      { status: 500 },
    );
  }

  const { error: itemError } = await supabase.from("visit_menu_items").insert({
    visit_id: visit.id,
    manual_menu_name: menuName,
    rating: Number(rating),
    review: String(form.get("review") ?? "").trim() || null,
  });

  if (itemError) {
    return NextResponse.json({ error: itemError.message }, { status: 500 });
  }

  const photoStoragePath = await uploadVisitPhoto(
    supabase,
    auth.session.profileId,
    form.get("visitPhoto"),
  );

  if (photoStoragePath) {
    const { error: photoError } = await supabase.from("visit_photos").insert({
      visit_id: visit.id,
      profile_id: auth.session.profileId,
      storage_path: photoStoragePath,
    });

    if (photoError) {
      await supabase.storage.from("menu-photos").remove([photoStoragePath]);
      return NextResponse.json({ error: photoError.message }, { status: 500 });
    }
  }

  return NextResponse.json({ ok: true }, { status: 201 });
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
    | { visitId?: string }
    | null;

  if (!body?.visitId) {
    return NextResponse.json(
      { error: "삭제할 방문 기록을 찾을 수 없습니다." },
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

  const { data: photos, error: photosError } = await supabase
    .from("visit_photos")
    .select("storage_path, visits!inner(id, restaurant_id, user_id, profile_id)")
    .eq("visit_id", body.visitId)
    .eq("visits.restaurant_id", restaurantId)
    .eq("visits.user_id", auth.session.ownerId)
    .eq("visits.profile_id", auth.session.profileId);

  if (photosError) {
    return NextResponse.json({ error: photosError.message }, { status: 500 });
  }

  const { error } = await supabase
    .from("visits")
    .delete()
    .eq("id", body.visitId)
    .eq("restaurant_id", restaurantId)
    .eq("user_id", auth.session.ownerId)
    .eq("profile_id", auth.session.profileId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const storagePaths = (photos ?? []).map((photo) => photo.storage_path);

  if (storagePaths.length > 0) {
    await supabase.storage.from("menu-photos").remove(storagePaths);
  }

  return NextResponse.json({ ok: true });
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ restaurantId: string }> },
) {
  const auth = await requireAppSession();

  if ("response" in auth) {
    return auth.response;
  }

  const { restaurantId } = await context.params;
  const form = await request.formData();
  const visitId = String(form.get("visitId") ?? "");
  const visitMenuItemId = String(form.get("visitMenuItemId") ?? "");
  const menuName = String(form.get("menuName") ?? "").trim();
  const rating = String(form.get("rating") ?? "").trim();

  if (!visitId || !visitMenuItemId) {
    return NextResponse.json(
      { error: "수정할 방문 기록을 찾을 수 없습니다." },
      { status: 400 },
    );
  }

  if (!menuName) {
    return NextResponse.json(
      { error: "먹은 메뉴를 입력하세요." },
      { status: 400 },
    );
  }

  if (!rating) {
    return NextResponse.json(
      { error: "별점을 선택하세요." },
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

  const { data: visit, error: visitError } = await supabase
    .from("visits")
    .select("id")
    .eq("id", visitId)
    .eq("restaurant_id", restaurantId)
    .eq("user_id", auth.session.ownerId)
    .eq("profile_id", auth.session.profileId)
    .maybeSingle();

  if (visitError) {
    return NextResponse.json({ error: visitError.message }, { status: 500 });
  }

  if (!visit) {
    return NextResponse.json(
      { error: "방문 기록을 찾을 수 없습니다." },
      { status: 404 },
    );
  }

  const { error } = await supabase
    .from("visit_menu_items")
    .update({
      manual_menu_name: menuName,
      rating: Number(rating),
      review: String(form.get("review") ?? "").trim() || null,
    })
    .eq("id", visitMenuItemId)
    .eq("visit_id", visitId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const existingPhotos = await supabase
    .from("visit_photos")
    .select("id, storage_path")
    .eq("visit_id", visitId)
    .eq("profile_id", auth.session.profileId);

  if (existingPhotos.error) {
    return NextResponse.json({ error: existingPhotos.error.message }, { status: 500 });
  }

  const deletePhoto = String(form.get("deleteVisitPhoto") ?? "") === "true";
  const newPhotoStoragePath = await uploadVisitPhoto(
    supabase,
    auth.session.profileId,
    form.get("visitPhoto"),
  );

  if (deletePhoto || newPhotoStoragePath) {
    const oldStoragePaths = (existingPhotos.data ?? []).map((photo) => photo.storage_path);

    if ((existingPhotos.data ?? []).length > 0) {
      const deletePhotoRows = await supabase
        .from("visit_photos")
        .delete()
        .eq("visit_id", visitId)
        .eq("profile_id", auth.session.profileId);

      if (deletePhotoRows.error) {
        if (newPhotoStoragePath) {
          await supabase.storage.from("menu-photos").remove([newPhotoStoragePath]);
        }
        return NextResponse.json({ error: deletePhotoRows.error.message }, { status: 500 });
      }
    }

    if (oldStoragePaths.length > 0) {
      await supabase.storage.from("menu-photos").remove(oldStoragePaths);
    }
  }

  if (newPhotoStoragePath) {
    const insertPhoto = await supabase.from("visit_photos").insert({
      visit_id: visitId,
      profile_id: auth.session.profileId,
      storage_path: newPhotoStoragePath,
    });

    if (insertPhoto.error) {
      await supabase.storage.from("menu-photos").remove([newPhotoStoragePath]);
      return NextResponse.json({ error: insertPhoto.error.message }, { status: 500 });
    }
  }

  return NextResponse.json({ ok: true });
}

async function uploadVisitPhoto(
  supabase: ReturnType<typeof createAdminClient>,
  profileId: string,
  value: FormDataEntryValue | null,
) {
  if (!(value instanceof File) || value.size === 0) {
    return null;
  }

  const extension = value.name.split(".").pop() || "jpg";
  const path = `profiles/${profileId}/visit-photos/${crypto.randomUUID()}.${extension}`;
  const upload = await supabase.storage.from("menu-photos").upload(path, value, {
    upsert: false,
    contentType: value.type || undefined,
  });

  if (upload.error) {
    throw upload.error;
  }

  return path;
}
