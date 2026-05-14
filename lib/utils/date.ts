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

export function zonedLocalDateTimeToIso(
  date: string,
  time: string,
  timezone: string,
): string | null {
  const [year, month, day] = date.split("-").map(Number);
  const [hour, minute] = time.split(":").map(Number);

  if (
    !year ||
    !month ||
    !day ||
    Number.isNaN(hour) ||
    Number.isNaN(minute)
  ) {
    return null;
  }

  const targetWallTime = Date.UTC(year, month - 1, day, hour, minute, 0);
  let utcGuess = targetWallTime;
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });

  for (let i = 0; i < 3; i++) {
    const parts = formatter.formatToParts(new Date(utcGuess));
    const get = (type: string) =>
      parts.find((p) => p.type === type)?.value ?? "0";
    const formattedHour = Number(get("hour"));
    const wallTimeAtGuess = Date.UTC(
      Number(get("year")),
      Number(get("month")) - 1,
      Number(get("day")),
      formattedHour === 24 ? 0 : formattedHour,
      Number(get("minute")),
      Number(get("second")),
    );
    utcGuess += targetWallTime - wallTimeAtGuess;
  }

  return new Date(utcGuess).toISOString();
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
  const normalizedOffset = normalizeOffset(offset);

  return `${get("year")}-${get("month")}-${get("day")}T${get("hour")}:${get("minute")}:${get("second")}${normalizedOffset}`;
}

function normalizeOffset(offset: string): string {
  const full = offset.match(/^([+-])(\d{2}):(\d{2})$/);
  if (full) return offset;

  const hourOnly = offset.match(/^([+-])(\d{1,2})$/);
  if (hourOnly) {
    return `${hourOnly[1]}${hourOnly[2].padStart(2, "0")}:00`;
  }

  const hourMinute = offset.match(/^([+-])(\d{1,2}):(\d{2})$/);
  if (hourMinute) {
    return `${hourMinute[1]}${hourMinute[2].padStart(2, "0")}:${hourMinute[3]}`;
  }

  return "+00:00";
}
