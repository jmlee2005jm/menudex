import { NewVisitForm } from "./new-visit-form";

export default async function NewVisitPage({
  params,
}: {
  params: Promise<{ restaurantId: string }>;
}) {
  const { restaurantId } = await params;

  return <NewVisitForm restaurantId={restaurantId} />;
}
