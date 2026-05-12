"use client";

import { useMemo } from "react";

import { useAppStore } from "@/store/app-store";

import { getWeekRange, shiftWeek } from "../lib/week";
import { CalendarHeader } from "./CalendarHeader";
import { WeekGrid } from "./WeekGrid";

export function CalendarSurface() {
  const calendarAnchorAt = useAppStore((s) => s.calendarAnchorAt);
  const setCalendarAnchor = useAppStore((s) => s.setCalendarAnchor);
  const anchor = useMemo(() => {
    const parsed = new Date(calendarAnchorAt);
    return Number.isNaN(parsed.getTime()) ? new Date() : parsed;
  }, [calendarAnchorAt]);

  const { start, end, days } = useMemo(() => getWeekRange(anchor), [anchor]);

  return (
    <div className="flex h-full min-h-0 flex-col bg-paper">
      <CalendarHeader
        start={start}
        end={end}
        onPrev={() => setCalendarAnchor(shiftWeek(anchor, -1))}
        onToday={() => setCalendarAnchor(new Date())}
        onNext={() => setCalendarAnchor(shiftWeek(anchor, 1))}
      />
      <WeekGrid days={days} />
    </div>
  );
}
