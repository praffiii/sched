import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { AppPlaceholder } from "@/features/auth/components/AppPlaceholder";
import { auth } from "@/lib/auth";

export default async function Home() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/login");

  return <AppPlaceholder user={session.user} />;
}
