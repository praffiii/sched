import { Avatar } from "@/components/ui/Avatar";
import { cn } from "@/lib/utils/cn";

import { ToggleModeButton } from "./ToggleModeButton";

type ChatHeaderProps = {
  variant: "full" | "drawer";
  initials?: string;
  onPointerDown?: React.PointerEventHandler<HTMLDivElement>;
};

export function ChatHeader({ variant, initials, onPointerDown }: ChatHeaderProps) {
  return (
    <div
      onPointerDown={onPointerDown}
      className={cn(
        "flex items-center justify-between border-b-2 border-ink px-4 py-3 select-none",
        variant === "full" ? "bg-paper" : "bg-paper-warm",
        onPointerDown && "cursor-grab active:cursor-grabbing touch-none",
      )}
    >
      <div className="flex items-center gap-2">
        {variant === "full" ? (
          <h1 className="font-display text-3xl font-bold text-ink">Sched</h1>
        ) : (
          <span className="font-display text-xl font-bold text-ink">
            ✦ Sched
          </span>
        )}
      </div>
      <div className="flex items-center gap-2">
        {variant === "full" && initials ? (
          <Avatar size="sm" initials={initials} />
        ) : null}
        <ToggleModeButton />
      </div>
    </div>
  );
}
