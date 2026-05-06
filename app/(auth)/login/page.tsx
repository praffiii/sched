import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { GoogleConnectCard } from "@/features/auth/components/GoogleConnectCard";
import { PitchPanel } from "@/features/auth/components/PitchPanel";
import { auth } from "@/lib/auth";

export default async function LoginPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (session) redirect("/");

  return (
    <main className="relative z-10 grid min-h-screen w-full md:grid-cols-2">
      <PitchPanel />
      <GoogleConnectCard />
    </main>
  );
}
