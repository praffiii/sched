"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { SketchBtn } from "@/components/ui/SketchBtn";
import { cn } from "@/lib/utils/cn";
import { signOut } from "@/lib/auth-client";

const AVATAR_CLASS =
  "inline-flex size-8 select-none items-center justify-center rounded-full border-2 border-ink bg-yellow text-xs font-bold text-ink transition-transform hover:-translate-y-px active:translate-y-0";

type ProfileMenuProps = {
  initials: string;
};

export function ProfileMenu({ initials }: ProfileMenuProps) {
  const { push, refresh } = useRouter();
  const rootRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    if (!open) return;

    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as Node | null;
      if (!target || rootRef.current?.contains(target)) return;
      setOpen(false);
    };

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };

    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);

    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  const handleSignOut = async () => {
    setPending(true);
    await signOut();
    push("/login");
    refresh();
  };

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        aria-label="Open profile menu"
        aria-expanded={open}
        aria-haspopup="menu"
        onClick={() => setOpen((value) => !value)}
        className={cn(
          AVATAR_CLASS,
          open && "shadow-[2px_2px_0_var(--color-ink)]",
        )}
      >
        {initials.slice(0, 2).toUpperCase()}
      </button>

      {open ? (
        <div
          role="menu"
          className="absolute right-0 top-11 z-30 w-40 rounded-lg border-2 border-ink bg-paper p-2 shadow-[4px_4px_0_var(--color-ink)]"
        >
          <div className="border-b-2 border-ink px-2 pb-2 font-hand text-xs text-text-secondary">
            Signed in
          </div>
          <SketchBtn
            role="menuitem"
            onClick={handleSignOut}
            disabled={pending}
            className="mt-2 h-8 w-full justify-center px-3 text-xs"
          >
            {pending ? "signing out..." : "sign out"}
          </SketchBtn>
        </div>
      ) : null}
    </div>
  );
}
