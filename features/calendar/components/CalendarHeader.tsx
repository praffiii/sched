"use client";

import { cn } from "@/lib/utils/cn";
import { SketchBtn } from "@/components/ui/SketchBtn";

import { formatWeekLabel } from "../lib/week";

type CalendarHeaderProps = {
  start: Date;
  end: Date;
  onPrev: () => void;
  onToday: () => void;
  onNext: () => void;
};

const VIEWS = [
  { id: "day", label: "day", enabled: false },
  { id: "week", label: "week", enabled: true },
  { id: "month", label: "month", enabled: false },
] as const;

export function CalendarHeader({
  start,
  end,
  onPrev,
  onToday,
  onNext,
}: CalendarHeaderProps) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-b-2 border-ink bg-paper px-4 py-3">
      <div className="flex items-center gap-3">
        <h2 className="font-display text-3xl font-bold text-ink">
          {formatWeekLabel(start, end)}
        </h2>
        <div className="flex items-center gap-1">
          <SketchBtn
            aria-label="previous week"
            onClick={onPrev}
            className="h-8 w-8 px-0 text-base"
          >
            ◀
          </SketchBtn>
          <SketchBtn onClick={onToday} className="h-8 px-3 text-xs">
            today
          </SketchBtn>
          <SketchBtn
            aria-label="next week"
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
            disabled={!v.enabled}
            className={cn(
              "rounded-full border-2 border-ink px-3 py-1 font-hand text-xs",
              v.enabled
                ? "bg-yellow text-ink shadow-[2px_2px_0_var(--color-ink)]"
                : "bg-white text-text-disabled",
            )}
          >
            {v.label}
          </button>
        ))}
      </div>
    </div>
  );
}
