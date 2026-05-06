"use client";

import { cn } from "@/lib/utils/cn";
import { useAppStore } from "@/store/app-store";
import type { AIPendingEvent, GCalEvent } from "@/types/events";

import { formatTimeRange } from "@/lib/utils/time";
import { ConflictIcon } from "./ConflictIcon";

type EventChipProps = {
  event: GCalEvent | AIPendingEvent;
  kind: "gcal" | "pending";
  hasConflict: boolean;
  top: number;
  height: number;
};

export function EventChip({
  event,
  kind,
  hasConflict,
  top,
  height,
}: EventChipProps) {
  const openInspector = useAppStore((s) => s.openInspector);

  return (
    <button
      type="button"
      onClick={() => openInspector(event.id)}
      style={{ top, height }}
      className={cn(
        "absolute left-1 right-1 z-10 overflow-hidden rounded-md border-2 border-ink px-2 py-1 text-left text-[11px] font-bold leading-tight text-ink shadow-[2px_2px_0_var(--color-ink)] transition-transform hover:-translate-x-[1px] hover:-translate-y-[1px]",
        kind === "gcal" && "bg-yellow",
        kind === "pending" && "hatched-pending border-dashed",
      )}
    >
      <div className="flex items-start justify-between gap-1">
        <span className="truncate font-hand">{event.title}</span>
        {hasConflict ? <ConflictIcon className="shrink-0" /> : null}
      </div>
      <div className="mt-0.5 truncate font-hand text-[10px] font-normal text-text-secondary">
        {formatTimeRange(event.startsAt, event.endsAt)}
      </div>
    </button>
  );
}
