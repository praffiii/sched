"use client";

import { useEffect } from "react";

import { SketchBox } from "@/components/ui/SketchBox";
import { SketchBtn } from "@/components/ui/SketchBtn";

export default function Error({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-canvas p-6">
      <SketchBox shadow="card" className="w-full max-w-sm p-8 text-center">
        <p className="mb-4 text-4xl">✏️</p>
        <h2 className="font-display mb-2 text-2xl text-ink">
          Oops, something broke!
        </h2>
        <p className="text-text-secondary mb-6 text-sm">
          An unexpected error occurred. You can try again or come back later.
          {error.digest && (
            <span className="text-text-muted mt-1 block font-mono text-xs">
              ref: {error.digest}
            </span>
          )}
        </p>
        <SketchBtn variant="primary" onClick={() => unstable_retry()}>
          Try again
        </SketchBtn>
      </SketchBox>
    </div>
  );
}
