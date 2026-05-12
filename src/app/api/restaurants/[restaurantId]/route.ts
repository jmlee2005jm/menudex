import { NextResponse } from "next/server";
import { assertRestaurantOwner, requireAppSession } from "@/lib/api";
import { createAdminClient } from "@/lib/supabase/admin";
import type { MenuAnnotationRow } from "@/lib/supabase/types";

export async function GET(
  request: Request,
  context: { params: Promise<{ restaurantId: string }> },
) {
  const auth = await requireAppSession();

  if ("response" in auth) {
    return auth.response;
  }

  const { restaurantId } = await context.params;
  const includeAllVisits = new URL(request.url).searchParams.get("visits") === "all";
  const supabase = createAdminClient();
  const ownerId = auth.session.ownerId;
  let visitsQuery = supabase
    .from("visits")
    .select("*, profiles(*), visit_menu_items(*)")
    .eq("restaurant_id", restaurantId)
    .eq("user_id", ownerId)
    .order("visited_at", { ascending: false });

  if (!includeAllVisits) {
    visitsQuery = visitsQuery.eq("profile_id", auth.session.profileId);
  }

  const [restaurantResult, photosResult, menuItemsResult, visitsResult] =
    await Promise.all([
      supabase
        .from("restaurants")
        .select("*")
        .eq("id", restaurantId)
        .eq("user_id", ownerId)
        .maybeSingle(),
      supabase
        .from("menu_photos")
        .select("*, restaurants!inner(user_id), menu_annotations(*)")
        .eq("restaurant_id", restaurantId)
        .eq("restaurants.user_id", ownerId)
        .order("created_at", { ascending: false }),
      supabase
        .from("menu_items")
        .select("*, restaurants!inner(user_id)")
        .eq("restaurant_id", restaurantId)
        .eq("restaurants.user_id", ownerId)
        .order("created_at", { ascending: false }),
      visitsQuery,
    ]);

  const error =
    restaurantResult.error ??
    photosResult.error ??
    menuItemsResult.error ??
    visitsResult.error;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!restaurantResult.data) {
    return NextResponse.json({ restaurant: null });
  }

  const photos = await Promise.all(
    (photosResult.data ?? []).map(async (row) => {
      const photo = stripRestaurantJoin(row);
      const { data } = await supabase.storage
        .from("menu-photos")
        .createSignedUrl(photo.storage_path, 60 * 60);

      return { ...photo, signedUrl: data?.signedUrl };
    }),
  );
  const profileFilteredPhotos = photos.map((photo) => ({
    ...photo,
    menu_annotations: ((photo as { menu_annotations?: MenuAnnotationRow[] }).menu_annotations ?? []).filter(
      (annotation: MenuAnnotationRow) => annotation.profile_id === auth.session.profileId,
    ),
  }));

  return NextResponse.json({
    restaurant: {
      ...restaurantResult.data,
      iconUrl: await createSignedIconUrl(supabase, restaurantResult.data.icon_storage_path),
    },
    menuPhotos: profileFilteredPhotos,
    menuItems: (menuItemsResult.data ?? []).map(stripRestaurantJoin),
    visits: visitsResult.data ?? [],
  });
}

function stripRestaurantJoin<T extends { restaurants?: unknown }>(row: T) {
  const { restaurants, ...rest } = row;
  void restaurants;

  return rest;
}

export async function DELETE(
  _request: Request,
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

  const { data: restaurant, error: restaurantError } = await supabase
    .from("restaurants")
    .select("icon_storage_path")
    .eq("id", restaurantId)
    .eq("user_id", auth.session.ownerId)
    .maybeSingle();

  if (restaurantError) {
    return NextResponse.json({ error: restaurantError.message }, { status: 500 });
  }

  const { data: photos, error: photosError } = await supabase
    .from("menu_photos")
    .select("storage_path")
    .eq("restaurant_id", restaurantId);

  if (photosError) {
    return NextResponse.json({ error: photosError.message }, { status: 500 });
  }

  const storagePaths = [
    ...(photos ?? []).map((photo) => photo.storage_path),
    restaurant?.icon_storage_path,
  ].filter((path): path is string => Boolean(path));

  if (storagePaths.length > 0) {
    await supabase.storage.from("menu-photos").remove(storagePaths);
  }

  const { error } = await supabase
    .from("restaurants")
    .delete()
    .eq("id", restaurantId)
    .eq("user_id", auth.session.ownerId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
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
  const name = String(form.get("name") ?? "").trim();

  if (!name) {
    return NextResponse.json(
      { error: "식당 이름을 입력하세요." },
      { status: 400 },
    );
  }

  const current = await supabase
    .from("restaurants")
    .select("icon_storage_path")
    .eq("id", restaurantId)
    .eq("user_id", auth.session.ownerId)
    .maybeSingle();

  if (current.error) {
    return NextResponse.json(
      { error: normalizeRestaurantSchemaError(current.error.message) },
      { status: 500 },
    );
  }

  const iconStoragePath = await uploadRestaurantIcon(
    supabase,
    auth.session.ownerId,
    form.get("icon"),
  );

  if (iconStoragePath && current.data?.icon_storage_path) {
    await supabase.storage.from("menu-photos").remove([current.data.icon_storage_path]);
  }

  const { error } = await supabase
    .from("restaurants")
    .update({
      name,
      branch_name: String(form.get("branchName") ?? "").trim() || null,
      map_url: String(form.get("mapUrl") ?? "").trim() || null,
      notes: String(form.get("notes") ?? "").trim() || null,
      cuisine_category: String(form.get("cuisineCategory") ?? "").trim() || null,
      food_type: String(form.get("foodType") ?? "").trim() || null,
      ...(iconStoragePath ? { icon_storage_path: iconStoragePath } : {}),
    })
    .eq("id", restaurantId)
    .eq("user_id", auth.session.ownerId);

  if (error) {
    return NextResponse.json(
      { error: normalizeRestaurantSchemaError(error.message) },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true });
}

function normalizeRestaurantSchemaError(message: string) {
  if (
    message.includes("icon_storage_path") ||
    message.includes("cuisine_category") ||
    message.includes("food_type")
  ) {
    return "식당 분류/아이콘 컬럼이 아직 없습니다. Supabase에서 0003_restaurant_categories_icons.sql 마이그레이션을 먼저 실행하세요.";
  }

  return message;
}

async function uploadRestaurantIcon(
  supabase: ReturnType<typeof createAdminClient>,
  ownerId: string,
  value: FormDataEntryValue | null,
) {
  if (!(value instanceof File) || value.size === 0) {
    return null;
  }

  const extension = value.name.split(".").pop() || "jpg";
  const path = `${ownerId}/restaurant-icons/${crypto.randomUUID()}.${extension}`;
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
