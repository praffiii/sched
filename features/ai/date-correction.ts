export type CorrectableGeneratedEvent = {
  title: string;
  startsAt: string;
  endsAt: string;
  kind: string;
  hasExplicitTime: boolean;
  reasoning?: string;
};

const INDONESIAN_MONTHS: Record<string, number> = {
  januari: 1,
  februari: 2,
  maret: 3,
  april: 4,
  mei: 5,
  juni: 6,
  juli: 7,
  agustus: 8,
  september: 9,
  oktober: 10,
  november: 11,
  desember: 12,
};

const DATE_PATTERN =
  /\b(?:senin|selasa|rabu|kamis|jumat|jum'at|sabtu|minggu)?\s*(?:tanggal|tgl)\s+(\d{1,2})(?:\s+(januari|februari|maret|april|mei|juni|juli|agustus|september|oktober|november|desember))?\b/i;

export function preserveExplicitIndonesianDate<T extends CorrectableGeneratedEvent>(
  event: T,
  prompt: string,
  now: Date,
  _timezone: string,
): T {
  void _timezone;
  const match = prompt.match(DATE_PATTERN);
  if (!match) return event;

  const day = Number(match[1]);
  if (!Number.isInteger(day) || day < 1 || day > 31) return event;

  const requestedMonth = match[2]?.toLowerCase();
  const month = requestedMonth
    ? INDONESIAN_MONTHS[requestedMonth]
    : now.getMonth() + 1;
  const year = now.getFullYear();
  const datePrefix = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;

  const currentDatePrefix = event.startsAt.slice(0, 10);
  if (currentDatePrefix === datePrefix) return event;

  const startTime = timeAndOffset(event.startsAt);
  const endTime = timeAndOffset(event.endsAt);
  if (!startTime || !endTime) return event;

  const startsAt = `${datePrefix}T${startTime}`;
  let endsAt = `${datePrefix}T${endTime}`;
  const originalDurationMs =
    new Date(event.endsAt).getTime() - new Date(event.startsAt).getTime();

  if (new Date(endsAt).getTime() <= new Date(startsAt).getTime()) {
    endsAt = withDateAndTime(
      new Date(new Date(startsAt).getTime() + originalDurationMs),
      event.endsAt,
    );
  }

  return {
    ...event,
    startsAt,
    endsAt,
  };
}

function timeAndOffset(iso: string): string | null {
  const match = iso.match(/T(\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2}))$/);
  return match?.[1] ?? null;
}

function withDateAndTime(date: Date, offsetSource: string): string {
  const offset = offsetSource.match(/(Z|[+-]\d{2}:\d{2})$/)?.[1] ?? "Z";
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}T${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}:${String(date.getSeconds()).padStart(2, "0")}${offset}`;
}
