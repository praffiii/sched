const DAY_MS = 24 * 60 * 60 * 1000;

export function getContextWindow(now: Date): {
  timeMin: string;
  timeMax: string;
} {
  return {
    timeMin: new Date(now.getTime() - 7 * DAY_MS).toISOString(),
    timeMax: new Date(now.getTime() + 14 * DAY_MS).toISOString(),
  };
}

export function formatLocalIso(date: Date, timezone: string): string {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
    timeZoneName: "shortOffset",
  }).formatToParts(date);

  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "";
  const offset = get("timeZoneName").replace("GMT", "").trim() || "+00:00";
  const normalizedOffset = /^[+-]\d{2}:\d{2}$/.test(offset)
    ? offset
    : offset.length === 3
      ? `${offset}:00`
      : "+00:00";

  return `${get("year")}-${get("month")}-${get("day")}T${get("hour")}:${get("minute")}:${get("second")}${normalizedOffset}`;
}
