import type { ComponentProps } from "react";

import { cn } from "@/lib/utils/cn";

type AnnotationLabelProps = ComponentProps<"span"> & {
  rotate?: number;
};

// Handwritten margin note in scribble font, slightly rotated.
// Used for AI reasoning labels and design annotations.
export function AnnotationLabel({
  className,
  rotate = -2,
  style,
  ...rest
}: AnnotationLabelProps) {
  return (
    <span
      className={cn(
        "inline-block font-scribble text-base leading-tight text-red",
        className,
      )}
      style={{ transform: `rotate(${rotate}deg)`, ...style }}
      {...rest}
    />
  );
}
