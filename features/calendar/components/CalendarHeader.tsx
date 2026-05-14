"use client";

import { cn } from "@/lib/utils/cn";
import { useAppStore } from "@/store/app-store";
import { SketchBtn } from "@/components/ui/SketchBtn";

import { formatWeekLabel } from "../lib/week";

function formatDayLabel(date: Date): string {
  return date.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
}

function formatMonthLabel(date: Date): string {
  return date.toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });
}

type CalendarHeaderProps = {
  start: Date;
  end: Date;
  onPrev: () => void;
  onToday: () => void;
  onNext: () => void;
};

const VIEWS = [
  { id: "day" as const, label: "day" },
  { id: "week" as const, label: "week" },
  { id: "month" as const, label: "month" },
] as const;

export function CalendarHeader({
  start,
  end,
  onPrev,
  onToday,
  onNext,
}: CalendarHeaderProps) {
  const calendarView = useAppStore((s) => s.calendarView);
  const setCalendarView = useAppStore((s) => s.setCalendarView);

  const label =
    calendarView === "day"
      ? formatDayLabel(start)
      : calendarView === "month"
        ? formatMonthLabel(start)
        : formatWeekLabel(start, end);

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-b-2 border-ink bg-paper px-4 py-3">
      <div className="flex items-center gap-3">
        <h2 className="font-display text-3xl font-bold text-ink">
          {label}
        </h2>
        <div className="flex items-center gap-1">
          <SketchBtn
            aria-label="previous"
            onClick={onPrev}
            className="h-8 w-8 px-0 text-base"
          >
            ◀
          </SketchBtn>
          <SketchBtn onClick={onToday} className="h-8 px-3 text-xs">
            today
          </SketchBtn>
          <SketchBtn
            aria-label="next"
            onClick={onNext}
            className="h-8 w-8 px-0 text-base"
          >
            ▶
          </SketchBtn>
        </div>
      </div>

      <div className="flex items-center gap-1">
        {VIEWS.map((v) => (
          <button
            key={v.id}
            type="button"
            onClick={() => setCalendarView(v.id)}
            className={cn(
              "rounded-full border-2 border-ink px-3 py-1 font-hand text-xs transition-all",
              calendarView === v.id
                ? "bg-yellow text-ink shadow-[2px_2px_0_var(--color-ink)]"
                : "bg-white text-text-secondary hover:bg-paper-warm",
            )}
          >
            {v.label}
          </button>
        ))}
      </div>
    </div>
  );
}
