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
  const body = (await request.json().catch(() => null)) as
    | {
        visitedAt?: string;
        mealType?: string;
        menuName?: string;
        rating?: string;
        review?: string;
      }
    | null;
  const menuName = body?.menuName?.trim();
  const rating = body?.rating?.trim();

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
      visited_at: body?.visitedAt?.trim() || todayDateValue(),
      meal_type: body?.mealType ?? "other",
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
    review: body?.review?.trim() || null,
  });

  if (itemError) {
    return NextResponse.json({ error: itemError.message }, { status: 500 });
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

  const { error } = await supabase
    .from("visits")
    .delete()
    .eq("id", body.visitId)
    .eq("restaurant_id", restaurantId)
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
  const body = (await request.json().catch(() => null)) as
    | {
        visitId?: string;
        visitMenuItemId?: string;
        menuName?: string;
        rating?: string;
        review?: string;
      }
    | null;
  const menuName = body?.menuName?.trim();
  const rating = body?.rating?.trim();

  if (!body?.visitId || !body.visitMenuItemId) {
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
    .eq("id", body.visitId)
    .eq("restaurant_id", restaurantId)
    .eq("user_id", auth.session.ownerId)
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
      review: body?.review?.trim() || null,
    })
    .eq("id", body.visitMenuItemId)
    .eq("visit_id", body.visitId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
