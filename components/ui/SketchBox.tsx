import type { ComponentProps } from "react";

import { cn } from "@/lib/utils/cn";

type SketchBoxProps = ComponentProps<"div"> & {
  variant?: "solid" | "dashed";
  shadow?: "none" | "card" | "sm";
};

export function SketchBox({
  className,
  variant = "solid",
  shadow = "none",
  ...rest
}: SketchBoxProps) {
  return (
    <div
      className={cn(
        "rounded-lg border-2 border-ink bg-paper",
        variant === "dashed" && "border-dashed",
        shadow === "card" && "shadow-[6px_6px_0_var(--color-ink)]",
        shadow === "sm" && "shadow-[3px_3px_0_var(--color-ink)]",
        className,
      )}
      {...rest}
    />
  );
}
