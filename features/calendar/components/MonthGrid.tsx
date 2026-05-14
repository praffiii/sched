"use client";

import { useMemo } from "react";

import { cn } from "@/lib/utils/cn";
import { useAppStore } from "@/store/app-store";

import { isSameDay } from "../lib/week";

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export function MonthGrid({ weeks }: { weeks: { days: Date[] }[] }) {
  const calendarEvents = useAppStore((s) => s.calendarEvents);
  const aiPendingEvents = useAppStore((s) => s.aiPendingEvents);
  const today = new Date();

  const allEvents = useMemo(
    () => [...calendarEvents, ...aiPendingEvents],
    [calendarEvents, aiPendingEvents],
  );

  return (
    <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden">
      <div className="sticky top-0 z-10 grid grid-cols-7 border-b-2 border-ink bg-paper-warm">
        {WEEKDAYS.map((wd) => (
          <div
            key={wd}
            className="border-l-2 border-ink py-2 text-center font-hand text-xs uppercase tracking-wide text-text-secondary first:border-l-0"
          >
            {wd}
          </div>
        ))}
      </div>

      <div className="border-b-2 border-ink">
        {weeks.map((week, wi) => (
          <div key={wi} className="grid grid-cols-7">
            {week.days.map((day) => {
              const isToday = isSameDay(day, today);
              const eventsForDay = allEvents.filter((event) => {
                const d = new Date(event.startsAt);
                return (
                  d.getFullYear() === day.getFullYear() &&
                  d.getMonth() === day.getMonth() &&
                  d.getDate() === day.getDate()
                );
              });

              return (
                <div
                  key={day.toISOString()}
                  className={cn(
                    "relative min-h-[80px] border-l-2 border-t-2 border-ink px-1.5 py-1 first:border-l-0",
                    isToday && "bg-yellow/10",
                  )}
                >
                  <span
                    className={cn(
                      "inline-flex h-6 w-6 items-center justify-center rounded-full font-display text-sm font-bold",
                      isToday
                        ? "bg-yellow text-ink shadow-[2px_2px_0_var(--color-ink)]"
                        : "text-ink",
                    )}
                  >
                    {day.getDate()}
                  </span>

                  {eventsForDay.length > 0 ? (
                    <div className="mt-1 space-y-0.5">
                      {eventsForDay.slice(0, 3).map((event) => (
                        <div
                          key={event.id}
                          className={cn(
                            "truncate rounded-sm border border-ink px-1 font-hand text-[10px] font-bold leading-tight",
                            "kind" in event && event.kind === "task"
                              ? "bg-paper-warm text-text-secondary border-dashed"
                              : "bg-yellow text-ink",
                          )}
                        >
                          {event.title}
                        </div>
                      ))}
                      {eventsForDay.length > 3 ? (
                        <span className="font-hand text-[9px] text-text-muted">
                          +{eventsForDay.length - 3} more
                        </span>
                      ) : null}
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
