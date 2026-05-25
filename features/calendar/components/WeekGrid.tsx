"use client";

import { useEffect, useMemo, useRef, type PointerEvent } from "react";

import { cn } from "@/lib/utils/cn";
import { zonedLocalDateTimeToIso } from "@/lib/utils/date";
import { useAppStore } from "@/store/app-store";
import type { AIPendingEvent, GCalEvent } from "@/types/events";

import {
  assignLanes,
  detectConflicts,
  eventToPosition,
  eventsOnDay,
  HOUR_HEIGHT_PX,
  isUntimedTask,
  PX_PER_MINUTE,
  zonedClockDate,
} from "../lib/layout";
import { getWeekday, isSameDay } from "../lib/week";
import { EventChip } from "./EventChip";

const HOURS = Array.from({ length: 24 }, (_, i) => i);
const TOP_TASKS_HEIGHT_PX = 44;
const HOUR_LABEL_WIDTH_PX = 48;
const SNAP_MINUTES = 15;
const MIN_DURATION_MINUTES = 15;

type WeekGridProps = {
  days: Date[];
};

type CalendarGridEvent = GCalEvent | AIPendingEvent;
type DraftPointerHandler = (
  e: PointerEvent<HTMLElement>,
  event: AIPendingEvent,
) => void;

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function snapMinutes(minutes: number): number {
  return Math.round(minutes / SNAP_MINUTES) * SNAP_MINUTES;
}

function localDateInputValue(date: Date): string {
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
  ].join("-");
}

function minutesToInputTime(minutes: number): string {
  const safe = clamp(Math.round(minutes), 0, 24 * 60 - SNAP_MINUTES);
  const h = Math.floor(safe / 60);
  const m = safe % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

function eventDurationMinutes(event: AIPendingEvent): number {
  const duration =
    (new Date(event.endsAt).getTime() - new Date(event.startsAt).getTime()) /
    60000;
  return Math.max(MIN_DURATION_MINUTES, Math.round(duration));
}

function WeekHeader({ days, today }: { days: Date[]; today: Date }) {
  return (
    <div className="sticky top-0 z-20 grid grid-cols-[48px_repeat(7,minmax(0,1fr))] border-b-2 border-ink bg-paper-warm">
      <div className="border-r-2 border-ink" />
      {days.map((d) => {
        const isToday = isSameDay(d, today);
        return (
          <div
            key={d.toISOString()}
            className={cn(
              "flex flex-col items-center justify-center border-l-2 border-ink py-2",
              isToday && "bg-yellow/40",
            )}
          >
            <span className="font-hand text-xs uppercase tracking-wide text-text-secondary">
              {getWeekday(d)}
            </span>
            <span className="font-display text-2xl font-bold text-ink">
              {d.getDate()}
            </span>
          </div>
        );
      })}
    </div>
  );
}

function HourLabels() {
  return (
    <div className="relative border-r-2 border-ink">
      {HOURS.map((h) => (
        <div
          key={h}
          className="absolute right-1 -translate-y-1/2 font-hand text-[10px] text-text-muted"
          style={{ top: TOP_TASKS_HEIGHT_PX + h * HOUR_HEIGHT_PX }}
        >
          {h === 0 ? "" : `${h}:00`}
        </div>
      ))}
    </div>
  );
}

type DayColumnProps = {
  day: Date;
  today: Date;
  calendarEvents: GCalEvent[];
  aiPendingEvents: AIPendingEvent[];
  calendarTimezone: string;
  conflicts: Set<string>;
  onDraftDragStart: DraftPointerHandler;
  onDraftResizeStart: DraftPointerHandler;
  onDraftRename: (event: AIPendingEvent, title: string) => void;
};

function isPendingEvent(event: CalendarGridEvent): event is AIPendingEvent {
  return "status" in event && event.status === "pending";
}

function DayColumn({
  day,
  today,
  calendarEvents,
  aiPendingEvents,
  calendarTimezone,
  conflicts,
  onDraftDragStart,
  onDraftResizeStart,
  onDraftRename,
}: DayColumnProps) {
  const gcalForDay = eventsOnDay(calendarEvents, day, calendarTimezone);
  const pendingForDay = eventsOnDay(aiPendingEvents, day, calendarTimezone);
  const topTasks = [...gcalForDay, ...pendingForDay].filter(isUntimedTask);
  const timedGcalForDay = gcalForDay.filter((event) => !isUntimedTask(event));
  const timedPendingForDay = pendingForDay.filter(
    (event) => !isUntimedTask(event),
  );
  const allForDay = [...timedGcalForDay, ...timedPendingForDay];
  const lanes = assignLanes(allForDay);
  const isToday = isSameDay(day, today);

  return (
    <div
      className={cn(
        "relative border-l-2 border-ink",
        isToday && "bg-yellow/10",
      )}
    >
      {HOURS.map((h) => (
        <div
          key={h}
          className="absolute inset-x-0 border-t border-ink/10"
          style={{ top: TOP_TASKS_HEIGHT_PX + h * HOUR_HEIGHT_PX }}
        />
      ))}

      {topTasks.map((event, index) => {
        const isPending = isPendingEvent(event);
        return (
          <EventChip
            key={event.id}
            event={event}
            kind={isPending ? "pending" : "gcal"}
            hasConflict={false}
            top={4 + index * 20}
            height={18}
            lane={0}
            totalLanes={1}
            timezone={calendarTimezone}
            onDraftRename={isPending ? onDraftRename : undefined}
          />
        );
      })}

      {timedGcalForDay.map((event) => {
        const { top, height } = eventToPosition(
          event,
          zonedClockDate(event.startsAt, calendarTimezone),
        );
        const lane = lanes.get(event.id) ?? { lane: 0, totalLanes: 1 };
        return (
          <EventChip
            key={event.id}
            event={event}
            kind="gcal"
            hasConflict={conflicts.has(event.id)}
            top={TOP_TASKS_HEIGHT_PX + top}
            height={height}
            lane={lane.lane}
            totalLanes={lane.totalLanes}
            timezone={calendarTimezone}
          />
        );
      })}

      {timedPendingForDay.map((event) => {
        const { top, height } = eventToPosition(
          event,
          zonedClockDate(event.startsAt, calendarTimezone),
        );
        const lane = lanes.get(event.id) ?? { lane: 0, totalLanes: 1 };
        return (
          <EventChip
            key={event.id}
            event={event}
            kind="pending"
            hasConflict={conflicts.has(event.id)}
            top={TOP_TASKS_HEIGHT_PX + top}
            height={height}
            lane={lane.lane}
            totalLanes={lane.totalLanes}
            timezone={calendarTimezone}
            onDraftDragStart={onDraftDragStart}
            onDraftResizeStart={onDraftResizeStart}
            onDraftRename={onDraftRename}
          />
        );
      })}
    </div>
  );
}

export function WeekGrid({ days }: WeekGridProps) {
  const calendarEvents = useAppStore((s) => s.calendarEvents);
  const aiPendingEvents = useAppStore((s) => s.aiPendingEvents);
  const calendarTimezone = useAppStore((s) => s.calendarTimezone);
  const selectedEventId = useAppStore((s) => s.selectedEventId);
  const upsertPendingEvent = useAppStore((s) => s.upsertPendingEvent);
  const updatePendingDraft = useAppStore((s) => s.updatePendingDraft);
  const scrollRef = useRef<HTMLDivElement>(null);
  const bodyRef = useRef<HTMLDivElement>(null);
  const today = new Date();

  const conflicts = useMemo(
    () =>
      detectConflicts(
        [...calendarEvents, ...aiPendingEvents].filter(
          (event) => !isUntimedTask(event),
        ),
      ),
    [calendarEvents, aiPendingEvents],
  );

  const selectedEvent = useMemo(
    () =>
      selectedEventId
        ? aiPendingEvents.find((event) => event.id === selectedEventId) ??
          calendarEvents.find((event) => event.id === selectedEventId)
        : null,
    [aiPendingEvents, calendarEvents, selectedEventId],
  );

  useEffect(() => {
    const el = scrollRef.current;
    if (!el || !selectedEvent) return;

    const targetTop = isUntimedTask(selectedEvent)
      ? 0
      : (() => {
          const clock = zonedClockDate(selectedEvent.startsAt, calendarTimezone);
          const minutes = clock.getHours() * 60 + clock.getMinutes();
          const eventTop = TOP_TASKS_HEIGHT_PX + minutes * PX_PER_MINUTE;
          return Math.max(0, eventTop - HOUR_HEIGHT_PX * 2);
        })();

    const frame = requestAnimationFrame(() => {
      el.scrollTo({ top: targetTop, behavior: "smooth" });
    });

    return () => cancelAnimationFrame(frame);
  }, [calendarTimezone, selectedEvent]);

  const pointerToDayAndMinutes = (
    clientX: number,
    clientY: number,
    yOffset = 0,
  ): { dayIndex: number; minutes: number } | null => {
    const body = bodyRef.current;
    if (!body) return null;

    const rect = body.getBoundingClientRect();
    const dayWidth = (rect.width - HOUR_LABEL_WIDTH_PX) / 7;
    if (dayWidth <= 0) return null;

    const x = clientX - rect.left - HOUR_LABEL_WIDTH_PX;
    const dayIndex = clamp(Math.floor(x / dayWidth), 0, 6);
    const y = clientY - rect.top - TOP_TASKS_HEIGHT_PX - yOffset;
    const minutes = clamp(
      snapMinutes(y / PX_PER_MINUTE),
      0,
      24 * 60 - SNAP_MINUTES,
    );

    return { dayIndex, minutes };
  };

  const buildDraftTimes = (
    dayIndex: number,
    startMinutes: number,
    durationMinutes: number,
  ): { startsAt: string; endsAt: string } | null => {
    const day = days[dayIndex];
    if (!day) return null;

    const startsAt = zonedLocalDateTimeToIso(
      localDateInputValue(day),
      minutesToInputTime(startMinutes),
      calendarTimezone,
    );
    if (!startsAt) return null;

    const endsAt = new Date(
      new Date(startsAt).getTime() + durationMinutes * 60000,
    ).toISOString();

    return { startsAt, endsAt };
  };

  const startDraftDrag = (
    e: PointerEvent<HTMLElement>,
    event: AIPendingEvent,
  ) => {
    if (isUntimedTask(event)) return;

    e.preventDefault();
    e.stopPropagation();

    const chipRect = e.currentTarget.getBoundingClientRect();
    const yOffset = e.clientY - chipRect.top;
    const duration = eventDurationMinutes(event);
    let latest: { startsAt: string; endsAt: string } | null = null;

    const move = (clientX: number, clientY: number) => {
      const point = pointerToDayAndMinutes(clientX, clientY, yOffset);
      if (!point) return;
      const times = buildDraftTimes(point.dayIndex, point.minutes, duration);
      if (!times) return;
      latest = times;
      upsertPendingEvent({ ...event, ...times, hasExplicitTime: true });
    };

    const onMove = (ev: globalThis.PointerEvent) => {
      move(ev.clientX, ev.clientY);
    };

    const onUp = () => {
      document.removeEventListener("pointermove", onMove);
      document.removeEventListener("pointerup", onUp);
      if (!latest) return;
      void updatePendingDraft(event.id, {
        ...latest,
        hasExplicitTime: true,
      });
    };

    move(e.clientX, e.clientY);
    document.addEventListener("pointermove", onMove);
    document.addEventListener("pointerup", onUp, { once: true });
  };

  const startDraftResize = (
    e: PointerEvent<HTMLElement>,
    event: AIPendingEvent,
  ) => {
    if (isUntimedTask(event)) return;

    e.preventDefault();
    e.stopPropagation();

    const startClock = zonedClockDate(event.startsAt, calendarTimezone);
    const startMinutes = startClock.getHours() * 60 + startClock.getMinutes();
    let latest: { endsAt: string } | null = null;

    const move = (clientY: number) => {
      const point = pointerToDayAndMinutes(e.clientX, clientY, 0);
      if (!point) return;
      const duration = Math.max(
        MIN_DURATION_MINUTES,
        snapMinutes(point.minutes - startMinutes),
      );
      const endsAt = new Date(
        new Date(event.startsAt).getTime() + duration * 60000,
      ).toISOString();
      latest = { endsAt };
      upsertPendingEvent({ ...event, endsAt, hasExplicitTime: true });
    };

    const onMove = (ev: globalThis.PointerEvent) => {
      move(ev.clientY);
    };

    const onUp = () => {
      document.removeEventListener("pointermove", onMove);
      document.removeEventListener("pointerup", onUp);
      if (!latest) return;
      void updatePendingDraft(event.id, {
        ...latest,
        hasExplicitTime: true,
      });
    };

    move(e.clientY);
    document.addEventListener("pointermove", onMove);
    document.addEventListener("pointerup", onUp, { once: true });
  };

  const renameDraft = (event: AIPendingEvent, title: string) => {
    upsertPendingEvent({ ...event, title });
    void updatePendingDraft(event.id, { title });
  };

  return (
    <div
      ref={scrollRef}
      className="min-h-0 flex-1 overflow-y-scroll overflow-x-hidden"
      style={{ scrollbarGutter: "stable" }}
    >
      {/* Sticky day header — shares the same scroll container so column widths
          stay perfectly aligned with the body grid below. */}
      <WeekHeader days={days} today={today} />

      <div
        ref={bodyRef}
        className="relative grid grid-cols-[48px_repeat(7,minmax(0,1fr))]"
        style={{ height: TOP_TASKS_HEIGHT_PX + HOUR_HEIGHT_PX * 24 }}
      >
        <HourLabels />

        {days.map((d) => {
          return (
            <DayColumn
              key={d.toISOString()}
              day={d}
              today={today}
              calendarEvents={calendarEvents}
              aiPendingEvents={aiPendingEvents}
              calendarTimezone={calendarTimezone}
              conflicts={conflicts}
              onDraftDragStart={startDraftDrag}
              onDraftResizeStart={startDraftResize}
              onDraftRename={renameDraft}
            />
          );
        })}
      </div>
    </div>
  );
}
