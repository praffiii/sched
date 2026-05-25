"use client";

import { SketchBtn } from "@/components/ui/SketchBtn";
import { useAppStore } from "@/store/app-store";

export function ToggleModeButton() {
  const uiMode = useAppStore((s) => s.uiMode);
  const setUIMode = useAppStore((s) => s.setUIMode);

  const isFull = uiMode === "2B";
  return (
    <SketchBtn
      aria-label={isFull ? "minimize chat" : "maximize chat"}
      onClick={() => setUIMode(isFull ? "2D" : "2B")}
      className="size-8 px-0 text-base"
    >
      {isFull ? "_" : "↑"}
    </SketchBtn>
  );
}
