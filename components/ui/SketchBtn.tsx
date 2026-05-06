import type { ComponentProps } from "react";

import { cn } from "@/lib/utils/cn";

type SketchBtnProps = ComponentProps<"button"> & {
  variant?: "primary" | "default";
};

export function SketchBtn({
  className,
  variant = "default",
  type = "button",
  ...rest
}: SketchBtnProps) {
  return (
    <button
      type={type}
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-full border-2 border-ink px-5 py-2 text-sm font-semibold transition-transform",
        "hover:-translate-x-[1px] hover:-translate-y-[1px] active:translate-x-0 active:translate-y-0",
        "disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-x-0 disabled:hover:translate-y-0",
        variant === "primary" &&
          "bg-yellow text-ink shadow-[3px_3px_0_var(--color-ink)] hover:shadow-[4px_4px_0_var(--color-ink)] active:shadow-[2px_2px_0_var(--color-ink)]",
        variant === "default" &&
          "bg-white text-ink shadow-[2px_2px_0_var(--color-ink)] hover:shadow-[3px_3px_0_var(--color-ink)] active:shadow-[1px_1px_0_var(--color-ink)]",
        className,
      )}
      {...rest}
    />
  );
}
