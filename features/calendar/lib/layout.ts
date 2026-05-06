import type { AIPendingEvent, GCalEvent } from "@/types/events";

export { formatTimeRange } from "@/lib/utils/time";

export const HOUR_HEIGHT_PX = 48;
export const PX_PER_MINUTE = HOUR_HEIGHT_PX / 60;

type AnyEvent = GCalEvent | AIPendingEvent;

export type EventPosition = {
  top: number;
  height: number;
};

export function eventToPosition(event: AnyEvent, dayStart: Date): EventPosition {
  const start = new Date(event.startsAt).getTime();
  const end = new Date(event.endsAt).getTime();
  const dayMs = dayStart.getTime();

  const minutesFromStart = Math.max(0, (start - dayMs) / 60000);
  const durationMinutes = Math.max(15, (end - start) / 60000);

  return {
    top: minutesFromStart * PX_PER_MINUTE,
    height: durationMinutes * PX_PER_MINUTE,
  };
}

export function eventsOnDay<T extends AnyEvent>(events: T[], day: Date): T[] {
  const dayStart = new Date(day);
  dayStart.setHours(0, 0, 0, 0);
  const dayEnd = new Date(dayStart);
  dayEnd.setDate(dayEnd.getDate() + 1);

  return events.filter((e) => {
    const start = new Date(e.startsAt);
    return start >= dayStart && start < dayEnd;
  });
}

// Naive O(n²) interval intersection. Returns set of event ids in conflict.
export function detectConflicts(events: AnyEvent[]): Set<string> {
  const conflicts = new Set<string>();
  for (let i = 0; i < events.length; i++) {
    const a = events[i];
    const aStart = new Date(a.startsAt).getTime();
    const aEnd = new Date(a.endsAt).getTime();
    for (let j = i + 1; j < events.length; j++) {
      const b = events[j];
      const bStart = new Date(b.startsAt).getTime();
      const bEnd = new Date(b.endsAt).getTime();
      if (aStart < bEnd && bStart < aEnd) {
        conflicts.add(a.id);
        conflicts.add(b.id);
      }
    }
  }
  return conflicts;
}

