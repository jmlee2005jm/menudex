import { NewMenuForm } from "./new-menu-form";

export default async function NewMenuPage({
  params,
}: {
  params: Promise<{ restaurantId: string }>;
}) {
  const { restaurantId } = await params;

  return <NewMenuForm restaurantId={restaurantId} />;
}
