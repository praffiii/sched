import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { AppShell } from "@/components/layouts/AppShell";
import { auth } from "@/lib/auth";

export default async function Home() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/login");

  const initials = session.user.name
    .split(" ")
    .map((p) => p[0])
    .join("")
    .slice(0, 2);

  return <AppShell initials={initials} />;
}
