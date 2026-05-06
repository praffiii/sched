import type { ComponentProps } from "react";

import { cn } from "@/lib/utils/cn";

type SketchInputProps = ComponentProps<"input">;

export function SketchInput({ className, ...rest }: SketchInputProps) {
  return (
    <input
      className={cn(
        "w-full rounded-lg border-2 border-ink bg-white px-4 py-2 text-base text-ink",
        "placeholder:text-text-muted focus:outline-none focus:ring-0",
        "focus:shadow-[2px_2px_0_var(--color-ink)] transition-shadow",
        className,
      )}
      {...rest}
    />
  );
}
