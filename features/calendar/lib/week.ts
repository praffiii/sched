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

export type DayRange = {
  day: Date;
};

export function getDayRange(anchor: Date): DayRange {
  return { day: startOfDay(anchor) };
}

export type MonthRange = {
  start: Date;
  end: Date;
  weeks: { days: Date[] }[];
};

export function getMonthRange(anchor: Date): MonthRange {
  const base = startOfDay(anchor);
  const year = base.getFullYear();
  const month = base.getMonth();

  const firstOfMonth = new Date(year, month, 1);
  const firstDayOfWeek = firstOfMonth.getDay();
  const diffToMonday = firstDayOfWeek === 0 ? -6 : 1 - firstDayOfWeek;
  const calendarStart = addDays(firstOfMonth, diffToMonday);

  const lastOfMonth = new Date(year, month + 1, 0);
  const lastDayOfWeek = lastOfMonth.getDay();
  const diffToSunday = lastDayOfWeek === 0 ? 0 : 7 - lastDayOfWeek;
  const calendarEnd = addDays(lastOfMonth, diffToSunday);

  const totalDays =
    Math.round((calendarEnd.getTime() - calendarStart.getTime()) / (1000 * 60 * 60 * 24)) + 1;
  const weekCount = Math.ceil(totalDays / 7);

  const weeks = Array.from({ length: weekCount }, (_, wi) => ({
    days: Array.from({ length: 7 }, (_, di) => addDays(calendarStart, wi * 7 + di)),
  }));

  return { start: firstOfMonth, end: lastOfMonth, weeks };
}

export function shiftDay(anchor: Date, days: number): Date {
  return addDays(anchor, days);
}

export function shiftMonth(anchor: Date, months: number): Date {
  const next = new Date(anchor);
  next.setMonth(next.getMonth() + months);
  return next;
}
