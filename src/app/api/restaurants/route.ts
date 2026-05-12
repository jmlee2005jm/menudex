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

  const [restaurantsResult, visitsResult, allVisitsResult] = await Promise.all([
    supabase
      .from("restaurants")
      .select("*")
      .eq("user_id", ownerId)
      .order("updated_at", { ascending: false }),
    supabase
      .from("visits")
      .select("restaurant_id, visited_at")
      .eq("user_id", ownerId)
      .eq("profile_id", auth.session.profileId),
    supabase
      .from("visits")
      .select("restaurant_id, visit_menu_items(id)")
      .eq("user_id", ownerId),
  ]);

  const error = restaurantsResult.error ?? visitsResult.error ?? allVisitsResult.error;

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
    knownMenuCounts: countKnownMenusByRestaurant(allVisitsResult.data ?? []),
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
    auth.session.profileId,
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

function countKnownMenusByRestaurant(
  visits: Array<{ restaurant_id: string; visit_menu_items?: Array<{ id: string }> }>,
) {
  return visits.reduce<Record<string, number>>((counts, visit) => {
    counts[visit.restaurant_id] =
      (counts[visit.restaurant_id] ?? 0) + (visit.visit_menu_items?.length ?? 0);

    return counts;
  }, {});
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
