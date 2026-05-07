"use client";

import { cn } from "@/lib/utils/cn";
import { formatTimeRange } from "@/lib/utils/time";
import { useAppStore } from "@/store/app-store";
import type { AIPendingEvent, GCalEvent } from "@/types/events";

import { ConflictIcon } from "./ConflictIcon";

type EventChipProps = {
  event: GCalEvent | AIPendingEvent;
  kind: "gcal" | "pending";
  hasConflict: boolean;
  top: number;
  height: number;
  lane: number;
  totalLanes: number;
};

const GAP_PX = 2;

export function EventChip({
  event,
  kind,
  hasConflict,
  top,
  height,
  lane,
  totalLanes,
}: EventChipProps) {
  const openInspector = useAppStore((s) => s.openInspector);

  // Distribute width evenly across overlapping lanes; subtract gap between
  // lanes so chips don't visually merge into each other.
  const widthPct = 100 / totalLanes;
  const leftPct = lane * widthPct;

  // Compact mode for very short chips: drop the time row and shrink padding
  // so the title remains visible instead of getting clipped to nothing.
  const isCompact = height < 36;

  return (
    <button
      type="button"
      onClick={() => openInspector(event.id)}
      style={{
        top,
        height,
        left: `calc(${leftPct}% + 2px)`,
        width: `calc(${widthPct}% - ${GAP_PX * 2}px)`,
      }}
      className={cn(
        "absolute z-10 overflow-hidden rounded-md border-2 border-ink text-left text-[11px] font-bold leading-tight text-ink shadow-[2px_2px_0_var(--color-ink)] transition-transform hover:-translate-x-[1px] hover:-translate-y-[1px]",
        isCompact ? "px-1.5 py-0.5" : "px-2 py-1",
        kind === "gcal" && "bg-yellow",
        kind === "pending" && "hatched-pending border-dashed",
      )}
    >
      <div className="flex items-start justify-between gap-1">
        <span className="truncate font-hand">{event.title}</span>
        {hasConflict ? <ConflictIcon className="shrink-0" /> : null}
      </div>
      {!isCompact ? (
        <div className="mt-0.5 truncate font-hand text-[10px] font-normal text-text-secondary">
          {formatTimeRange(event.startsAt, event.endsAt)}
        </div>
      ) : null}
    </button>
  );
}
