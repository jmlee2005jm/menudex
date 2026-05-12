import { NextResponse } from "next/server";
import { getAppConfigStatus, getAppSession } from "@/lib/app-auth";
import type { createAdminClient } from "@/lib/supabase/admin";

export async function requireAppSession() {
  const status = getAppConfigStatus();

  if (!status.configured) {
    return {
      response: NextResponse.json(
        { error: "MenuDex 설정이 필요합니다.", missing: status.missing },
        { status: 503 },
      ),
    };
  }

  const session = await getAppSession();

  if (!session) {
    return {
      response: NextResponse.json(
        { error: "프로필 선택이 필요합니다." },
        { status: 401 },
      ),
    };
  }

  return { session };
}

export async function assertRestaurantOwner(
  supabase: ReturnType<typeof createAdminClient>,
  restaurantId: string,
  ownerId: string,
) {
  const { data, error } = await supabase
    .from("restaurants")
    .select("id")
    .eq("id", restaurantId)
    .eq("user_id", ownerId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return Boolean(data);
}
