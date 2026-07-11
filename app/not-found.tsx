import Link from "next/link";

import { SketchBox } from "@/components/ui/SketchBox";

export default function NotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-canvas p-6">
      <SketchBox shadow="card" className="w-full max-w-sm p-8 text-center">
        <h2 className="font-display mb-2 text-2xl text-ink">Page not found</h2>
        <p className="text-text-secondary mb-6 text-sm">
          This page isn't on your calendar. Maybe it got discarded?
        </p>
        <Link
          href="/"
          className="inline-flex items-center justify-center gap-2 rounded-full border-2 border-ink bg-yellow px-5 py-2 text-sm font-semibold text-ink shadow-[3px_3px_0_var(--color-ink)] transition-transform hover:-translate-x-[1px] hover:-translate-y-[1px] hover:shadow-[4px_4px_0_var(--color-ink)] active:translate-x-0 active:translate-y-0 active:shadow-[2px_2px_0_var(--color-ink)]"
        >
          Back to Sched
        </Link>
      </SketchBox>
    </div>
  );
}
