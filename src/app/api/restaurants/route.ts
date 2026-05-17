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

  const [
    restaurantsResult,
    visitsResult,
    unlockedMenusResult,
    recentVisitsResult,
    allRecentVisitsResult,
  ] =
    await Promise.all([
      supabase
        .from("restaurants")
        .select("*")
        .eq("user_id", ownerId)
        .order("updated_at", { ascending: false }),
      supabase
        .from("visits")
        .select("restaurant_id, visited_at, created_at")
        .eq("user_id", ownerId)
        .eq("profile_id", auth.session.profileId),
      supabase
        .from("visits")
        .select("restaurant_id, visit_menu_items(manual_menu_name, menu_items(name))")
        .eq("user_id", ownerId)
        .eq("profile_id", auth.session.profileId),
      supabase
        .from("visits")
        .select(
          "id, restaurant_id, profile_id, visited_at, created_at, meal_type, profiles(display_name), visit_photos(*), visit_menu_items(id, manual_menu_name, rating, menu_items(name))",
        )
        .eq("user_id", ownerId)
        .eq("profile_id", auth.session.profileId)
        .order("visited_at", { ascending: false })
        .order("created_at", { ascending: false })
        .limit(4),
      supabase
        .from("visits")
        .select(
          "id, restaurant_id, profile_id, visited_at, created_at, meal_type, profiles(display_name), visit_photos(*), visit_menu_items(id, manual_menu_name, rating, menu_items(name))",
        )
        .eq("user_id", ownerId)
        .order("visited_at", { ascending: false })
        .order("created_at", { ascending: false })
        .limit(4),
    ]);

  const error =
    restaurantsResult.error ??
    visitsResult.error ??
    unlockedMenusResult.error ??
    recentVisitsResult.error ??
    allRecentVisitsResult.error;

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
    unlockedMenuCounts: countUnlockedMenusByRestaurant(unlockedMenusResult.data ?? []),
    recentVisits: await addSignedVisitPhotoUrls(supabase, recentVisitsResult.data ?? []),
    allRecentVisits: await addSignedVisitPhotoUrls(supabase, allRecentVisitsResult.data ?? []),
    visits: visitsResult.data ?? [],
  });
}

async function addSignedVisitPhotoUrls<
  T extends { visit_photos?: Array<{ storage_path: string }> | null },
>(supabase: ReturnType<typeof createAdminClient>, visits: T[]) {
  return Promise.all(
    visits.map(async (visit) => ({
      ...visit,
      visit_photos: await Promise.all(
        (visit.visit_photos ?? []).map(async (photo) => ({
          ...photo,
          signedUrl: await createSignedIconUrl(supabase, photo.storage_path),
        })),
      ),
    })),
  );
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
  const latitude = parseCoordinate(form.get("latitude"), -90, 90);
  const longitude = parseCoordinate(form.get("longitude"), -180, 180);

  if (latitude === "invalid" || longitude === "invalid") {
    return NextResponse.json(
      { error: "지도 좌표를 올바른 숫자로 입력하세요." },
      { status: 400 },
    );
  }

  if ((latitude === null) !== (longitude === null)) {
    return NextResponse.json(
      { error: "지도 좌표는 위도와 경도를 함께 입력하세요." },
      { status: 400 },
    );
  }

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
      total_menu_goal: parseMenuGoal(form.get("totalMenuGoal")),
      latitude,
      longitude,
      icon_storage_path: iconStoragePath,
      menu_coverage: "unknown",
    })
    .select("id")
    .single();

  if (error || !data) {
    return NextResponse.json(
      { error: normalizeRestaurantSchemaError(error?.message ?? "식당을 저장하지 못했습니다.") },
      { status: 500 },
    );
  }

  await createInitialMenuData({
    supabase,
    restaurantId: data.id,
    ownerId: auth.session.ownerId,
    profileId: auth.session.profileId,
    form,
  });

  return NextResponse.json({ id: data.id }, { status: 201 });
}

async function createInitialMenuData({
  supabase,
  restaurantId,
  ownerId,
  profileId,
  form,
}: {
  supabase: ReturnType<typeof createAdminClient>;
  restaurantId: string;
  ownerId: string;
  profileId: string;
  form: FormData;
}) {
  const menuPhoto = form.get("initialMenuPhoto");

  if (menuPhoto instanceof File && menuPhoto.size > 0) {
    const extension = menuPhoto.name.split(".").pop() || "jpg";
    const storagePath = `${ownerId}/${restaurantId}/${crypto.randomUUID()}.${extension}`;
    const upload = await supabase.storage.from("menu-photos").upload(storagePath, menuPhoto, {
      upsert: false,
      contentType: menuPhoto.type || undefined,
    });

    if (!upload.error) {
      await supabase.from("menu_photos").insert({
        restaurant_id: restaurantId,
        owner_profile_id: profileId,
        storage_path: storagePath,
        taken_at: String(form.get("initialMenuTakenAt") ?? "").trim() || null,
      });
    }
  }
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

function countUnlockedMenusByRestaurant(
  visits: Array<{
    restaurant_id: string;
    visit_menu_items?: Array<{
      manual_menu_name: string | null;
      menu_items?: { name: string | null } | Array<{ name: string | null }> | null;
    }>;
  }>,
) {
  const unlocked = visits.reduce<Record<string, Set<string>>>((counts, visit) => {
    const current = counts[visit.restaurant_id] ?? new Set<string>();

    for (const item of visit.visit_menu_items ?? []) {
      const linkedMenuName = Array.isArray(item.menu_items)
        ? item.menu_items[0]?.name
        : item.menu_items?.name;
      const name = normalizeMenuName(item.manual_menu_name ?? linkedMenuName ?? "");

      if (name) {
        current.add(name);
      }
    }

    counts[visit.restaurant_id] = current;

    return counts;
  }, {});

  return Object.fromEntries(
    Object.entries(unlocked).map(([restaurantId, names]) => [restaurantId, names.size]),
  );
}

function normalizeMenuName(name: string) {
  return name.trim().replace(/\s+/g, " ").toLowerCase();
}

function parseMenuGoal(value: FormDataEntryValue | null) {
  const raw = String(value ?? "").trim();

  if (!raw) {
    return null;
  }

  const parsed = Number(raw);

  return Number.isInteger(parsed) && parsed >= 0 ? parsed : null;
}

function parseCoordinate(
  value: FormDataEntryValue | null,
  min: number,
  max: number,
) {
  const raw = String(value ?? "").trim();

  if (!raw) {
    return null;
  }

  const parsed = Number(raw);

  if (!Number.isFinite(parsed) || parsed < min || parsed > max) {
    return "invalid";
  }

  return parsed;
}

function normalizeRestaurantSchemaError(message: string) {
  if (
    message.includes("latitude") ||
    message.includes("longitude") ||
    message.includes("icon_storage_path") ||
    message.includes("cuisine_category") ||
    message.includes("food_type") ||
    message.includes("total_menu_goal")
  ) {
    return "식당 지도/분류/아이콘/목표 메뉴 컬럼이 아직 없습니다. Supabase에서 최신 마이그레이션을 먼저 실행하세요.";
  }

  return message;
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
