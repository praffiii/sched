export function formatTimeRange(
  startsAt: string,
  endsAt: string,
  timezone?: string,
): string {
  const fmt = (iso: string) => {
    const d = new Date(iso);
    const parts = timezone
      ? new Intl.DateTimeFormat("en-US", {
          timeZone: timezone,
          hour: "2-digit",
          minute: "2-digit",
          hour12: false,
        }).formatToParts(d)
      : null;
    const h = parts
      ? Number(parts.find((p) => p.type === "hour")?.value ?? "0")
      : d.getHours();
    const m = parts
      ? Number(parts.find((p) => p.type === "minute")?.value ?? "0")
      : d.getMinutes();
    const mm = m === 0 ? "" : `:${m.toString().padStart(2, "0")}`;
    return `${h}${mm}`;
  };
  return `${fmt(startsAt)}–${fmt(endsAt)}`;
}
