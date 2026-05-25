import { redirect } from "next/navigation";
import { getAppSession } from "@/lib/app-auth";

export default async function Home() {
  const session = await getAppSession();

  redirect(session ? "/restaurants" : "/profiles");
}
