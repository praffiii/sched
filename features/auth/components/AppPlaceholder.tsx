"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { Avatar } from "@/components/ui/Avatar";
import { SketchBox } from "@/components/ui/SketchBox";
import { SketchBtn } from "@/components/ui/SketchBtn";
import { signOut } from "@/lib/auth-client";

type AppPlaceholderProps = {
  user: {
    name: string;
    email: string;
    image?: string | null;
  };
};

export function AppPlaceholder({ user }: AppPlaceholderProps) {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  const handleSignOut = async () => {
    setPending(true);
    await signOut();
    router.push("/login");
    router.refresh();
  };

  const initials = user.name
    .split(" ")
    .map((p) => p[0])
    .join("")
    .slice(0, 2);

  return (
    <main className="relative z-10 mx-auto flex min-h-screen w-full max-w-xl flex-col items-center justify-center gap-6 p-8">
      <SketchBox shadow="card" className="w-full p-8">
        <div className="flex items-center gap-4">
          <Avatar size="lg" initials={initials} />
          <div>
            <h1 className="font-display text-3xl font-bold text-ink">
              Welcome, {user.name.split(" ")[0]}.
            </h1>
            <p className="text-sm text-text-secondary">{user.email}</p>
          </div>
        </div>

        <p className="mt-6 font-hand text-lg text-ink">
          You&apos;re signed in. The calendar &amp; chat experience comes next.
        </p>

        <div className="mt-6 flex justify-end">
          <SketchBtn onClick={handleSignOut} disabled={pending}>
            Sign out
          </SketchBtn>
        </div>
      </SketchBox>
    </main>
  );
}
