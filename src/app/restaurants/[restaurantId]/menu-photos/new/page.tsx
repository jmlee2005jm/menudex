import { redirect } from "next/navigation";

export default async function NewMenuPhotoPage({
  params,
}: {
  params: Promise<{ restaurantId: string }>;
}) {
  const { restaurantId } = await params;

  redirect(`/restaurants/${restaurantId}/menus/new`);
}
