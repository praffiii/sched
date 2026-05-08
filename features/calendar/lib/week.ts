const MONTH_SHORT = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
] as const;

const WEEKDAY_SHORT = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] as const;

function startOfDay(d: Date): Date {
  const next = new Date(d);
  next.setHours(0, 0, 0, 0);
  return next;
}

function addDays(d: Date, n: number): Date {
  const next = new Date(d);
  next.setDate(next.getDate() + n);
  return next;
}

export type WeekRange = {
  start: Date;
  end: Date;
  days: Date[];
};

// Monday-first week containing the anchor date.
export function getWeekRange(anchor: Date): WeekRange {
  const base = startOfDay(anchor);
  const day = base.getDay();
  const diffToMonday = day === 0 ? -6 : 1 - day;
  const start = addDays(base, diffToMonday);
  const days = Array.from({ length: 7 }, (_, i) => addDays(start, i));
  const end = addDays(start, 6);
  return { start, end, days };
}

export function formatWeekLabel(start: Date, end: Date): string {
  const startMonth = MONTH_SHORT[start.getMonth()];
  const endMonth = MONTH_SHORT[end.getMonth()];
  if (start.getMonth() === end.getMonth()) {
    return `${startMonth} ${start.getDate()}–${end.getDate()}`;
  }
  return `${startMonth} ${start.getDate()} – ${endMonth} ${end.getDate()}`;
}

export function getWeekday(d: Date): (typeof WEEKDAY_SHORT)[number] {
  const idx = (d.getDay() + 6) % 7;
  return WEEKDAY_SHORT[idx];
}

export function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

export function shiftWeek(anchor: Date, weeks: number): Date {
  return addDays(anchor, weeks * 7);
}
