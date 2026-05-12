import { NextResponse } from "next/server";
import { requireAppSession } from "@/lib/api";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET() {
  const auth = await requireAppSession();

  if ("response" in auth) {
    return auth.response;
  }

  const supabase = createAdminClient();
  const ownerId = auth.session.ownerId;

  const [restaurantsResult, menuItemsResult, visitsResult] = await Promise.all([
    supabase
      .from("restaurants")
      .select("*")
      .eq("user_id", ownerId)
      .order("updated_at", { ascending: false }),
    supabase
      .from("menu_items")
      .select("*, restaurants!inner(user_id)")
      .eq("restaurants.user_id", ownerId),
    supabase.from("visits").select("*").eq("user_id", ownerId),
  ]);

  const error =
    restaurantsResult.error ?? menuItemsResult.error ?? visitsResult.error;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  const restaurants = await Promise.all(
    (restaurantsResult.data ?? []).map(async (restaurant) => ({
      ...restaurant,
      iconUrl: await createSignedIconUrl(supabase, restaurant.icon_storage_path),
    })),
  );

  return NextResponse.json({
    restaurants,
    menuItems: (menuItemsResult.data ?? []).map(stripRestaurantJoin),
    visits: visitsResult.data ?? [],
  });
}

export async function POST(request: Request) {
  const auth = await requireAppSession();

  if ("response" in auth) {
    return auth.response;
  }

  const form = await request.formData();
  const name = String(form.get("name") ?? "").trim();

  if (!name) {
    return NextResponse.json(
      { error: "식당 이름을 입력하세요." },
      { status: 400 },
    );
  }

  const supabase = createAdminClient();
  const iconStoragePath = await uploadRestaurantIcon(
    supabase,
    auth.session.ownerId,
    form.get("icon"),
  );
  const { data, error } = await supabase
    .from("restaurants")
    .insert({
      user_id: auth.session.ownerId,
      name,
      branch_name: String(form.get("branchName") ?? "").trim() || null,
      map_url: String(form.get("mapUrl") ?? "").trim() || null,
      notes: String(form.get("notes") ?? "").trim() || null,
      cuisine_category: String(form.get("cuisineCategory") ?? "").trim() || null,
      food_type: String(form.get("foodType") ?? "").trim() || null,
      icon_storage_path: iconStoragePath,
      menu_coverage: "unknown",
    })
    .select("id")
    .single();

  if (error || !data) {
    return NextResponse.json(
      { error: error?.message ?? "식당을 저장하지 못했습니다." },
      { status: 500 },
    );
  }

  return NextResponse.json({ id: data.id }, { status: 201 });
}

function stripRestaurantJoin<T extends { restaurants?: unknown }>(row: T) {
  const { restaurants, ...rest } = row;
  void restaurants;

  return rest;
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
