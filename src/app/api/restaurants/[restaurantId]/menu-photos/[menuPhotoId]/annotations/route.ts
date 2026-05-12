import { NextResponse } from "next/server";
import { assertRestaurantOwner, requireAppSession } from "@/lib/api";
import { createAdminClient } from "@/lib/supabase/admin";
import type { MenuAnnotationCoordinates } from "@/lib/supabase/types";

export async function POST(
  request: Request,
  context: { params: Promise<{ restaurantId: string; menuPhotoId: string }> },
) {
  const auth = await requireAppSession();

  if ("response" in auth) {
    return auth.response;
  }

  const { restaurantId, menuPhotoId } = await context.params;
  const body = (await request.json().catch(() => null)) as
    | { coordinates?: MenuAnnotationCoordinates }
    | null;

  if (!isValidRectangle(body?.coordinates)) {
    return NextResponse.json(
      { error: "하이라이트 영역이 올바르지 않습니다." },
      { status: 400 },
    );
  }
  const coordinates = body?.coordinates;

  const supabase = createAdminClient();
  const ownsRestaurant = await assertRestaurantOwner(
    supabase,
    restaurantId,
    auth.session.ownerId,
  );

  if (!ownsRestaurant) {
    return NextResponse.json({ error: "식당을 찾을 수 없습니다." }, { status: 404 });
  }

  const ownsPhoto = await assertMenuPhotoInRestaurant(
    supabase,
    restaurantId,
    menuPhotoId,
  );

  if (!ownsPhoto) {
    return NextResponse.json(
      { error: "메뉴 사진을 찾을 수 없습니다." },
      { status: 404 },
    );
  }

  const { data, error } = await supabase
    .from("menu_annotations")
    .insert({
      menu_photo_id: menuPhotoId,
      profile_id: auth.session.profileId,
      type: "highlight",
      shape: "rect",
      color: "#facc15",
      opacity: 0.45,
      coordinates,
    })
    .select("*")
    .single();

  if (error || !data) {
    return NextResponse.json(
      { error: error?.message ?? "하이라이트를 저장하지 못했습니다." },
      { status: 500 },
    );
  }

  return NextResponse.json({ annotation: data }, { status: 201 });
}

export async function DELETE(
  request: Request,
  context: { params: Promise<{ restaurantId: string; menuPhotoId: string }> },
) {
  const auth = await requireAppSession();

  if ("response" in auth) {
    return auth.response;
  }

  const { restaurantId, menuPhotoId } = await context.params;
  const body = (await request.json().catch(() => null)) as
    | { annotationId?: string }
    | null;

  if (!body?.annotationId) {
    return NextResponse.json(
      { error: "삭제할 하이라이트를 찾을 수 없습니다." },
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

  const ownsPhoto = await assertMenuPhotoInRestaurant(
    supabase,
    restaurantId,
    menuPhotoId,
  );

  if (!ownsPhoto) {
    return NextResponse.json(
      { error: "메뉴 사진을 찾을 수 없습니다." },
      { status: 404 },
    );
  }

  const { error } = await supabase
    .from("menu_annotations")
    .delete()
    .eq("id", body.annotationId)
    .eq("menu_photo_id", menuPhotoId)
    .eq("profile_id", auth.session.profileId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

function isValidRectangle(coordinates?: MenuAnnotationCoordinates) {
  if (!coordinates) {
    return false;
  }

  const values = [
    coordinates.x,
    coordinates.y,
    coordinates.width,
    coordinates.height,
  ];

  return (
    values.every((value) => Number.isFinite(value)) &&
    coordinates.x >= 0 &&
    coordinates.y >= 0 &&
    coordinates.width > 0.005 &&
    coordinates.height > 0.005 &&
    coordinates.x + coordinates.width <= 1 &&
    coordinates.y + coordinates.height <= 1
  );
}

async function assertMenuPhotoInRestaurant(
  supabase: ReturnType<typeof createAdminClient>,
  restaurantId: string,
  menuPhotoId: string,
) {
  const { data, error } = await supabase
    .from("menu_photos")
    .select("id")
    .eq("id", menuPhotoId)
    .eq("restaurant_id", restaurantId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return Boolean(data);
}
