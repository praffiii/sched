export function formatTimeRange(startsAt: string, endsAt: string): string {
  const fmt = (iso: string) => {
    const d = new Date(iso);
    const h = d.getHours();
    const m = d.getMinutes();
    const mm = m === 0 ? "" : `:${m.toString().padStart(2, "0")}`;
    return `${h}${mm}`;
  };
  return `${fmt(startsAt)}–${fmt(endsAt)}`;
}
