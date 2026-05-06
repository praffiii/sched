"use client";

import { useMemo } from "react";

import { cn } from "@/lib/utils/cn";
import { useAppStore } from "@/store/app-store";

import {
  detectConflicts,
  eventToPosition,
  eventsOnDay,
  HOUR_HEIGHT_PX,
} from "../lib/layout";
import { getWeekday, isSameDay } from "../lib/week";
import { EventChip } from "./EventChip";

const HOURS = Array.from({ length: 24 }, (_, i) => i);

type WeekGridProps = {
  days: Date[];
};

export function WeekGrid({ days }: WeekGridProps) {
  const calendarEvents = useAppStore((s) => s.calendarEvents);
  const aiPendingEvents = useAppStore((s) => s.aiPendingEvents);
  const today = new Date();

  const conflicts = useMemo(
    () => detectConflicts([...calendarEvents, ...aiPendingEvents]),
    [calendarEvents, aiPendingEvents],
  );

  return (
    <div className="flex h-full min-h-0 flex-col">
      {/* Day header row */}
      <div className="grid grid-cols-[48px_repeat(7,minmax(0,1fr))] border-b-2 border-ink bg-paper-warm">
        <div />
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

      {/* Scrollable grid */}
      <div className="min-h-0 flex-1 overflow-auto">
        <div
          className="relative grid grid-cols-[48px_repeat(7,minmax(0,1fr))]"
          style={{ height: HOUR_HEIGHT_PX * 24 }}
        >
          {/* Hour labels column */}
          <div className="relative border-r-2 border-ink">
            {HOURS.map((h) => (
              <div
                key={h}
                className="absolute right-1 -translate-y-1/2 font-hand text-[10px] text-text-muted"
                style={{ top: h * HOUR_HEIGHT_PX }}
              >
                {h === 0 ? "" : `${h}:00`}
              </div>
            ))}
          </div>

          {/* Day columns */}
          {days.map((d) => {
            const dayStart = new Date(d);
            dayStart.setHours(0, 0, 0, 0);
            const gcalForDay = eventsOnDay(calendarEvents, d);
            const pendingForDay = eventsOnDay(aiPendingEvents, d);
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
                    style={{ top: h * HOUR_HEIGHT_PX }}
                  />
                ))}

                {gcalForDay.map((event) => {
                  const { top, height } = eventToPosition(event, dayStart);
                  return (
                    <EventChip
                      key={event.id}
                      event={event}
                      kind="gcal"
                      hasConflict={conflicts.has(event.id)}
                      top={top}
                      height={height}
                    />
                  );
                })}

                {pendingForDay.map((event) => {
                  const { top, height } = eventToPosition(event, dayStart);
                  return (
                    <EventChip
                      key={event.id}
                      event={event}
                      kind="pending"
                      hasConflict={conflicts.has(event.id)}
                      top={top}
                      height={height}
                    />
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
