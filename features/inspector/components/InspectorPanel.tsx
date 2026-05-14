"use client";

import { AnnotationLabel } from "@/components/ui/AnnotationLabel";
import { SketchBtn } from "@/components/ui/SketchBtn";
import { ChatInput } from "@/features/chat/components/ChatInput";
import { ChatMessageList } from "@/features/chat/components/ChatMessageList";
import { zonedLocalDateTimeToIso } from "@/lib/utils/date";
import { formatTimeRange } from "@/lib/utils/time";
import { useAppStore } from "@/store/app-store";
import type { AIPendingEvent, GCalEvent } from "@/types/events";

function durationMinutes(startsAt: string, endsAt: string): number {
  const ms = new Date(endsAt).getTime() - new Date(startsAt).getTime();
  return Math.max(15, Math.round(ms / 60000));
}

function durationHours(startsAt: string, endsAt: string): string {
  const minutes = durationMinutes(startsAt, endsAt);
  if (minutes < 60) return `${minutes}min`;
  if (minutes % 60 === 0) return `${minutes / 60}h`;
  return `${(minutes / 60).toFixed(1)}h`;
}

function calendarDate(iso: string, timezone: string): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date(iso));
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "";
  return `${get("year")}-${get("month")}-${get("day")}`;
}

function oneHourAfter(iso: string): string {
  return new Date(new Date(iso).getTime() + 60 * 60000).toISOString();
}

export function InspectorPanel() {
  const selectedEventId = useAppStore((s) => s.selectedEventId);
  const calendarEvents = useAppStore((s) => s.calendarEvents);
  const aiPendingEvents = useAppStore((s) => s.aiPendingEvents);
  const calendarTimezone = useAppStore((s) => s.calendarTimezone);
  const closeInspector = useAppStore((s) => s.closeInspector);
  const acceptPending = useAppStore((s) => s.acceptPending);
  const discardPending = useAppStore((s) => s.discardPending);
  const refinePending = useAppStore((s) => s.refinePending);
  const updatePendingDraft = useAppStore((s) => s.updatePendingDraft);
  const pendingMutationIds = useAppStore((s) => s.pendingMutationIds);

  if (!selectedEventId) return null;

  const gcalEvent = calendarEvents.find((e) => e.id === selectedEventId);
  const pendingEvent = aiPendingEvents.find((e) => e.id === selectedEventId);
  const event: GCalEvent | AIPendingEvent | undefined = gcalEvent ?? pendingEvent;
  const isPending = !!pendingEvent;
  const isMutating = isPending && pendingMutationIds.includes(selectedEventId);
  const isTask = event ? "kind" in event && event.kind === "task" : false;

  const setDraftKind = async (kind: "task" | "event") => {
    if (!pendingEvent || pendingEvent.kind === kind) return;

    if (kind === "task") {
      const date = calendarDate(pendingEvent.startsAt, calendarTimezone);
      const dueAt = zonedLocalDateTimeToIso(date, "09:00", calendarTimezone);
      if (!dueAt) return;
      await updatePendingDraft(pendingEvent.id, {
        kind: "task",
        hasExplicitTime: false,
        startsAt: dueAt,
        endsAt: dueAt,
      });
      return;
    }

    const date = calendarDate(pendingEvent.startsAt, calendarTimezone);
    const startsAt =
      zonedLocalDateTimeToIso(date, "09:00", calendarTimezone) ??
      pendingEvent.startsAt;
    await updatePendingDraft(pendingEvent.id, {
      kind: "event",
      hasExplicitTime: true,
      startsAt,
      endsAt: oneHourAfter(startsAt),
    });
  };

  if (!event) {
    return (
      <aside className="flex h-full min-w-0 flex-col overflow-hidden border-r-2 border-ink bg-paper">
        <div className="flex items-center justify-between border-b-2 border-ink bg-paper-warm px-4 py-3">
          <span className="font-hand text-sm font-semibold text-text-muted">
            Event not found
          </span>
          <SketchBtn onClick={closeInspector} className="h-8 w-8 p-0 text-sm">
            ✕
          </SketchBtn>
        </div>
      </aside>
    );
  }

  return (
    <aside className="flex h-full min-w-0 flex-col overflow-hidden border-r-2 border-ink bg-paper">
      <div className="flex items-center justify-between border-b-2 border-ink bg-paper-warm px-4 py-3">
        <div className="min-w-0">
          <AnnotationLabel rotate={-1} className="text-xs">
            ✦ Sched draft mode
          </AnnotationLabel>
          <p className="mt-1 truncate font-hand text-xs text-text-secondary">
            {isPending ? "AI draft · nudge on calendar" : "calendar event · read-only"}
          </p>
        </div>
        <SketchBtn onClick={closeInspector} className="h-8 w-8 shrink-0 p-0 text-sm">
          ✕
        </SketchBtn>
      </div>

      <section className="space-y-3 border-b-2 border-ink bg-paper px-4 py-3">
        <div className="space-y-1">
          <h2 className="font-hand text-lg font-bold leading-tight text-ink">
            {event.title}
          </h2>
          {!isTask ? (
            <p className="font-hand text-sm text-ink">
              {formatTimeRange(event.startsAt, event.endsAt, calendarTimezone)}{" "}
              <span className="text-text-muted">
                · {durationHours(event.startsAt, event.endsAt)}
              </span>
            </p>
          ) : (
            <p className="font-hand text-sm italic text-text-muted">
              task / deadline
            </p>
          )}
        </div>

        {isPending ? (
          <div className="space-y-1">
            <span className="font-hand text-[11px] font-semibold uppercase tracking-wide text-text-secondary">
              AI guessed
            </span>
            <div className="grid grid-cols-2 gap-2">
              <SketchBtn
                onClick={() => void setDraftKind("task")}
                disabled={isMutating}
                variant={pendingEvent.kind === "task" ? "primary" : "default"}
                className="h-8 px-3 text-xs"
              >
                task
              </SketchBtn>
              <SketchBtn
                onClick={() => void setDraftKind("event")}
                disabled={isMutating}
                variant={pendingEvent.kind === "event" ? "primary" : "default"}
                className="h-8 px-3 text-xs"
              >
                event
              </SketchBtn>
            </div>
          </div>
        ) : null}

        {isPending ? (
          <div className="rounded-md border-2 border-dashed border-ink/30 bg-paper-warm px-3 py-2">
            <p className="font-hand text-xs leading-relaxed text-text-secondary">
              {isTask
                ? "Double-click the chip title to rename. Ask Sched to add a time if this task needs one."
                : "Double-click the chip title to rename. Drag the chip to move it. Resize the bottom edge to change duration."}
            </p>
          </div>
        ) : null}

        {isPending && pendingEvent.reasoning ? (
          <div className="space-y-1">
            <AnnotationLabel rotate={0.5} className="text-[10px]">
              why this slot?
            </AnnotationLabel>
            <div className="rounded-md border-2 border-dashed border-ink/30 bg-paper-warm px-3 py-2">
              <p className="font-hand text-xs leading-relaxed text-text-secondary">
                {pendingEvent.reasoning}
              </p>
            </div>
          </div>
        ) : null}
      </section>

      {isPending ? (
        <>
          <ChatMessageList hidePendingCards />
          <ChatInput
            placeholder='refine selected draft, e.g. "move after lunch"'
            onSubmitPrompt={(prompt) => refinePending(selectedEventId, prompt)}
          />
          <div className="flex gap-2 border-t-2 border-ink bg-paper px-4 py-3">
            <SketchBtn
              onClick={() => discardPending(selectedEventId)}
              disabled={isMutating}
              className="flex-1 text-xs"
            >
              discard
            </SketchBtn>
            <SketchBtn
              variant="primary"
              onClick={() => acceptPending(selectedEventId)}
              disabled={isMutating}
              className="flex-1 text-xs"
            >
              {isMutating ? "saving..." : "confirm ✓"}
            </SketchBtn>
          </div>
        </>
      ) : (
        <div className="flex-1 px-4 py-4">
          <p className="rounded-md border-2 border-dashed border-ink/30 bg-paper-warm px-3 py-2 font-hand text-sm text-text-secondary">
            Existing calendar events are read-only for now. Edit AI drafts before confirming them.
          </p>
        </div>
      )}
    </aside>
  );
}
