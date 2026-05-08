"use client";

import { useMemo, useState } from "react";

import { getWeekRange, shiftWeek } from "../lib/week";
import { CalendarHeader } from "./CalendarHeader";
import { WeekGrid } from "./WeekGrid";

export function CalendarSurface() {
  const [anchor, setAnchor] = useState<Date>(() => new Date());

  const { start, end, days } = useMemo(() => getWeekRange(anchor), [anchor]);

  return (
    <div className="flex h-full min-h-0 flex-col bg-paper">
      <CalendarHeader
        start={start}
        end={end}
        onPrev={() => setAnchor((a) => shiftWeek(a, -1))}
        onToday={() => setAnchor(new Date())}
        onNext={() => setAnchor((a) => shiftWeek(a, 1))}
      />
      <WeekGrid days={days} />
    </div>
  );
}
