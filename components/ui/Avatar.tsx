import type { ComponentProps } from "react";

import { cn } from "@/lib/utils/cn";

type AvatarProps = ComponentProps<"div"> & {
  initials?: string;
  size?: "sm" | "md" | "lg";
};

const SIZE_CLASS = {
  sm: "h-8 w-8 text-xs",
  md: "h-10 w-10 text-sm",
  lg: "h-14 w-14 text-base",
} as const;

export function Avatar({
  className,
  initials,
  size = "md",
  children,
  ...rest
}: AvatarProps) {
  return (
    <div
      className={cn(
        "inline-flex select-none items-center justify-center rounded-full border-2 border-ink bg-yellow font-bold text-ink",
        SIZE_CLASS[size],
        className,
      )}
      {...rest}
    >
      {children ?? initials?.slice(0, 2).toUpperCase()}
    </div>
  );
}
