"use client";

import { useState, type PointerEvent } from "react";

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
  timezone: string;
  onDraftDragStart?: (
    e: PointerEvent<HTMLElement>,
    event: AIPendingEvent,
  ) => void;
  onDraftResizeStart?: (
    e: PointerEvent<HTMLElement>,
    event: AIPendingEvent,
  ) => void;
  onDraftRename?: (event: AIPendingEvent, title: string) => void;
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
  timezone,
  onDraftDragStart,
  onDraftResizeStart,
  onDraftRename,
}: EventChipProps) {
  const openInspector = useAppStore((s) => s.openInspector);
  const selectedEventId = useAppStore((s) => s.selectedEventId);
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleDraft, setTitleDraft] = useState("");
  const isSelected = selectedEventId === event.id;
  const canRename = kind === "pending" && isSelected && !!onDraftRename;
  const canMove = kind === "pending" && isSelected && !!onDraftDragStart;
  const canResize = kind === "pending" && isSelected && !!onDraftResizeStart;

  // Distribute width evenly across overlapping lanes; subtract gap between
  // lanes so chips don't visually merge into each other.
  const widthPct = 100 / totalLanes;
  const leftPct = lane * widthPct;

  // Compact mode for very short chips: drop the time row and shrink padding
  // so the title remains visible instead of getting clipped to nothing.
  const isCompact = height < 36;

  const pendingEvent = kind === "pending" ? (event as AIPendingEvent) : null;

  const commitTitle = () => {
    const next = titleDraft.trim();
    setEditingTitle(false);
    if (!pendingEvent || !next || next === event.title) return;
    onDraftRename?.(pendingEvent, next);
  };

  return (
    <div
      style={{
        top,
        height,
        left: `calc(${leftPct}% + 2px)`,
        width: `calc(${widthPct}% - ${GAP_PX * 2}px)`,
      }}
      className={cn(
        "absolute z-10 select-none overflow-hidden text-left text-[11px] font-bold leading-tight text-ink transition-transform hover:-translate-y-px active:translate-y-0",
        canMove ? "cursor-grab active:cursor-grabbing" : "cursor-pointer",
        isSelected && "z-20 -translate-y-px",
      )}
    >
      <button
        type="button"
        onClick={() => openInspector(event.id)}
        onPointerDown={(e) => {
          if (!canMove || editingTitle || !pendingEvent) return;
          const target = e.target as HTMLElement;
          if (target.closest("[data-no-drag]")) return;
          onDraftDragStart?.(e, pendingEvent);
        }}
        className={cn(
          "block h-full w-full overflow-hidden rounded-md border-2 border-ink text-left font-bold leading-tight text-ink shadow-[2px_2px_0_var(--color-ink)] outline-none ring-offset-2 ring-offset-paper transition-transform focus-visible:ring-2 focus-visible:ring-red",
          isCompact ? "px-1.5 py-0.5" : "px-2 py-1",
          kind === "gcal" && "bg-yellow",
          kind === "pending" && "hatched-pending border-dashed",
          isSelected && "shadow-[4px_4px_0_var(--color-ink)] ring-2 ring-red",
        )}
      >
        <div className="flex items-start justify-between gap-1">
          <span
            data-no-drag={canRename ? true : undefined}
            onDoubleClick={(e) => {
              if (!canRename) return;
              e.stopPropagation();
              setTitleDraft(event.title);
              setEditingTitle(true);
            }}
            className={cn(
              "truncate font-hand",
              editingTitle && "opacity-0",
              canRename && "cursor-text underline decoration-dotted underline-offset-2",
            )}
            title={canRename ? "Double-click to rename" : undefined}
          >
            {event.title}
          </span>
          {hasConflict ? <ConflictIcon className="shrink-0" /> : null}
        </div>
        {!isCompact ? (
          <div className="mt-0.5 truncate font-hand text-[10px] font-normal text-text-secondary">
            {formatTimeRange(event.startsAt, event.endsAt, timezone)}
          </div>
        ) : null}
      </button>
      {editingTitle ? (
        <input
          data-no-drag
          autoFocus
          value={titleDraft}
          onChange={(e) => setTitleDraft(e.target.value)}
          onBlur={commitTitle}
          onClick={(e) => e.stopPropagation()}
          onPointerDown={(e) => e.stopPropagation()}
          onKeyDown={(e) => {
            if (e.key === "Enter") commitTitle();
            if (e.key === "Escape") {
              setTitleDraft(event.title);
              setEditingTitle(false);
            }
          }}
          className="absolute left-2 right-2 top-1 min-w-0 rounded border border-ink bg-white px-1 font-hand text-[11px] font-bold text-ink outline-none"
          aria-label="edit draft title"
        />
      ) : null}
      {canResize ? (
        <button
          type="button"
          data-no-drag
          aria-label="Resize draft duration"
          onPointerDown={(e) => {
            if (!pendingEvent) return;
            onDraftResizeStart?.(e, pendingEvent);
          }}
          className="absolute inset-x-3 bottom-0 h-2 cursor-ns-resize rounded-t-full bg-ink/25"
          title="Drag to resize duration"
        />
      ) : null}
    </div>
  );
}
