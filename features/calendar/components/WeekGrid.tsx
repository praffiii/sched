"use client";

import { useMemo } from "react";

import { cn } from "@/lib/utils/cn";
import { useAppStore } from "@/store/app-store";

import {
  assignLanes,
  detectConflicts,
  eventToPosition,
  eventsOnDay,
  HOUR_HEIGHT_PX,
  isUntimedTask,
  zonedClockDate,
} from "../lib/layout";
import { getWeekday, isSameDay } from "../lib/week";
import { EventChip } from "./EventChip";

const HOURS = Array.from({ length: 24 }, (_, i) => i);
const TOP_TASKS_HEIGHT_PX = 44;

type WeekGridProps = {
  days: Date[];
};

export function WeekGrid({ days }: WeekGridProps) {
  const calendarEvents = useAppStore((s) => s.calendarEvents);
  const aiPendingEvents = useAppStore((s) => s.aiPendingEvents);
  const calendarTimezone = useAppStore((s) => s.calendarTimezone);
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

  return (
    <div
      className="min-h-0 flex-1 overflow-y-scroll overflow-x-hidden"
      style={{ scrollbarGutter: "stable" }}
    >
      {/* Sticky day header — shares the same scroll container so column widths
          stay perfectly aligned with the body grid below. */}
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

      <div
        className="relative grid grid-cols-[48px_repeat(7,minmax(0,1fr))]"
        style={{ height: TOP_TASKS_HEIGHT_PX + HOUR_HEIGHT_PX * 24 }}
      >
        {/* Hour labels column */}
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

        {/* Day columns */}
        {days.map((d) => {
          const gcalForDay = eventsOnDay(calendarEvents, d, calendarTimezone);
          const pendingForDay = eventsOnDay(
            aiPendingEvents,
            d,
            calendarTimezone,
          );
          const topTasks = [...gcalForDay, ...pendingForDay].filter(isUntimedTask);
          const timedGcalForDay = gcalForDay.filter((event) => !isUntimedTask(event));
          const timedPendingForDay = pendingForDay.filter(
            (event) => !isUntimedTask(event),
          );
          const allForDay = [...timedGcalForDay, ...timedPendingForDay];
          const lanes = assignLanes(allForDay);
          const isToday = isSameDay(d, today);

          return (
            <div
              key={d.toISOString()}
              className={cn(
                "relative border-l-2 border-ink",
                isToday && "bg-yellow/10",
              )}
            >
              {/* Hour gridlines */}
              {HOURS.map((h) => (
                <div
                  key={h}
                  className="absolute inset-x-0 border-t border-ink/10"
                  style={{ top: TOP_TASKS_HEIGHT_PX + h * HOUR_HEIGHT_PX }}
                />
              ))}

              {topTasks.map((event, index) => (
                <EventChip
                  key={event.id}
                  event={event}
                  kind={
                    "status" in event && event.status === "pending"
                      ? "pending"
                      : "gcal"
                  }
                  hasConflict={false}
                  top={4 + index * 20}
                  height={18}
                  lane={0}
                  totalLanes={1}
                  timezone={calendarTimezone}
                />
              ))}

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
                  />
                );
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
}
