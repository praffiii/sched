"use client";

import { useMemo } from "react";

import { useAppStore } from "@/store/app-store";

import {
  getDayRange,
  getMonthRange,
  getWeekRange,
  shiftDay,
  shiftMonth,
  shiftWeek,
} from "../lib/week";
import { CalendarHeader } from "./CalendarHeader";
import { DayGrid } from "./DayGrid";
import { MonthGrid } from "./MonthGrid";
import { WeekGrid } from "./WeekGrid";

export function CalendarSurface() {
  const calendarAnchorAt = useAppStore((s) => s.calendarAnchorAt);
  const calendarView = useAppStore((s) => s.calendarView);
  const setCalendarAnchor = useAppStore((s) => s.setCalendarAnchor);
  const anchor = useMemo(() => {
    const parsed = new Date(calendarAnchorAt);
    return Number.isNaN(parsed.getTime()) ? new Date() : parsed;
  }, [calendarAnchorAt]);

  const headerRange = useMemo(() => {
    if (calendarView === "day") {
      const { day } = getDayRange(anchor);
      return { start: day, end: day };
    }
    if (calendarView === "month") {
      const { start, end } = getMonthRange(anchor);
      return { start, end };
    }
    const { start, end } = getWeekRange(anchor);
    return { start, end };
  }, [anchor, calendarView]);

  const dayGridAnchor = useMemo(
    () => (calendarView === "day" ? getDayRange(anchor).day : new Date()),
    [anchor, calendarView],
  );

  const monthGridWeeks = useMemo(
    () => (calendarView === "month" ? getMonthRange(anchor).weeks : []),
    [anchor, calendarView],
  );

  const weekGridDays = useMemo(
    () => (calendarView === "week" ? getWeekRange(anchor).days : []),
    [anchor, calendarView],
  );

  const onPrev = () => {
    if (calendarView === "day") setCalendarAnchor(shiftDay(anchor, -1));
    else if (calendarView === "month")
      setCalendarAnchor(shiftMonth(anchor, -1));
    else setCalendarAnchor(shiftWeek(anchor, -1));
  };

  const onNext = () => {
    if (calendarView === "day") setCalendarAnchor(shiftDay(anchor, 1));
    else if (calendarView === "month")
      setCalendarAnchor(shiftMonth(anchor, 1));
    else setCalendarAnchor(shiftWeek(anchor, 1));
  };

  return (
    <div className="flex h-full min-h-0 flex-col bg-paper">
      <CalendarHeader
        start={headerRange.start}
        end={headerRange.end}
        onPrev={onPrev}
        onToday={() => setCalendarAnchor(new Date())}
        onNext={onNext}
      />
      {calendarView === "day" ? (
        <DayGrid day={dayGridAnchor} />
      ) : calendarView === "month" ? (
        <MonthGrid weeks={monthGridWeeks} />
      ) : (
        <WeekGrid days={weekGridDays} />
      )}
    </div>
  );
}
