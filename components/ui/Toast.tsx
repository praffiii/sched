"use client";

import { useEffect } from "react";

import { cn } from "@/lib/utils/cn";
import { useAppStore } from "@/store/app-store";

export function Toast() {
  const toast = useAppStore((s) => s.toast);
  const clearToast = useAppStore((s) => s.clearToast);

  useEffect(() => {
    if (!toast) return;
    const id = setTimeout(() => clearToast(), 4500);
    return () => clearTimeout(id);
  }, [toast, clearToast]);

  return (
    <div
      role="status"
      aria-live="polite"
      className={cn(
        "pointer-events-none fixed bottom-6 left-1/2 z-50 -translate-x-1/2 transition-all duration-300",
        toast
          ? "translate-y-0 opacity-100"
          : "translate-y-4 opacity-0",
      )}
    >
      <div className="pointer-events-auto rounded-lg border-2 border-ink bg-red px-4 py-2.5 font-hand text-sm font-semibold text-ink shadow-[3px_3px_0_var(--color-ink)]">
        {toast}
      </div>
    </div>
  );
}
