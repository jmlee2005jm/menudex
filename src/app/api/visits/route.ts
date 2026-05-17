import { NextResponse } from "next/server";
import { requireAppSession } from "@/lib/api";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET(request: Request) {
  const auth = await requireAppSession();

  if ("response" in auth) {
    return auth.response;
  }

  const supabase = createAdminClient();
  const scope = new URL(request.url).searchParams.get("scope") === "all" ? "all" : "mine";
  let query = supabase
    .from("visits")
    .select(
      "id, restaurant_id, profile_id, visited_at, created_at, meal_type, profiles(display_name), restaurants(name, branch_name), visit_photos(*), visit_menu_items(id, manual_menu_name, rating, review, menu_items(name))",
    )
    .eq("user_id", auth.session.ownerId)
    .order("visited_at", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(50);

  if (scope === "mine") {
    query = query.eq("profile_id", auth.session.profileId);
  }

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    visits: await addSignedVisitPhotoUrls(supabase, data ?? []),
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
          signedUrl: await createSignedVisitPhotoUrl(supabase, photo.storage_path),
        })),
      ),
    })),
  );
}

async function createSignedVisitPhotoUrl(
  supabase: ReturnType<typeof createAdminClient>,
  path: string,
) {
  const { data } = await supabase.storage.from("menu-photos").createSignedUrl(path, 60 * 60);

  return data?.signedUrl;
}
