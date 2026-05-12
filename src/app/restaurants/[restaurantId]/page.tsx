import { RestaurantDetail } from "./restaurant-detail";

export default async function RestaurantDetailPage({
  params,
}: {
  params: Promise<{ restaurantId: string }>;
}) {
  const { restaurantId } = await params;

  return <RestaurantDetail restaurantId={restaurantId} />;
}
