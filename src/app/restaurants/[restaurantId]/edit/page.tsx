import { EditRestaurantForm } from "./restaurant-edit-form";

export default async function EditRestaurantPage({
  params,
}: {
  params: Promise<{ restaurantId: string }>;
}) {
  const { restaurantId } = await params;

  return <EditRestaurantForm restaurantId={restaurantId} />;
}
