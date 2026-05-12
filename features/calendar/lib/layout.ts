import type { AIPendingEvent, GCalEvent } from "@/types/events";

export { formatTimeRange } from "@/lib/utils/time";

export const HOUR_HEIGHT_PX = 48;
export const PX_PER_MINUTE = HOUR_HEIGHT_PX / 60;

type AnyEvent = GCalEvent | AIPendingEvent;

export type EventPosition = {
  top: number;
  height: number;
};

// Minimum visual height in minutes — enforces ~32px chip so the title stays
// legible even for tasks (deadline-only events with zero duration).
const MIN_RENDER_MINUTES = 40;

export function eventToPosition(event: AnyEvent, dayStart: Date): EventPosition {
  const end = new Date(event.endsAt).getTime();
  const start = new Date(event.startsAt).getTime();

  const minutesFromStart =
    dayStart.getHours() * 60 + dayStart.getMinutes();
  const durationMinutes = Math.max(MIN_RENDER_MINUTES, (end - start) / 60000);

  return {
    top: minutesFromStart * PX_PER_MINUTE,
    height: durationMinutes * PX_PER_MINUTE,
  };
}

export type LaneInfo = {
  lane: number;
  totalLanes: number;
};

// Greedy lane assignment for overlapping events on the same day.
// Sort by startsAt; place each event in the first lane whose previous event
// has already ended. After placement, propagate `totalLanes` (max overlap
// across the cluster) to every event in that cluster.
export function assignLanes(events: AnyEvent[]): Map<string, LaneInfo> {
  const result = new Map<string, LaneInfo>();
  if (events.length === 0) return result;

  const sorted = events
    .slice()
    .sort(
      (a, b) =>
        new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime(),
    );

  const laneEnds: number[] = []; // end timestamp for each active lane
  const clusterStartIdx: number[] = []; // index in `sorted` where each lane's current cluster started
  let cluster: { ids: string[]; maxLanes: number } = { ids: [], maxLanes: 0 };
  let clusterEnd = -Infinity;

  const flushCluster = () => {
    for (const id of cluster.ids) {
      const info = result.get(id);
      if (info) result.set(id, { ...info, totalLanes: cluster.maxLanes });
    }
    cluster = { ids: [], maxLanes: 0 };
    clusterEnd = -Infinity;
    laneEnds.length = 0;
    clusterStartIdx.length = 0;
  };

  for (const event of sorted) {
    const start = new Date(event.startsAt).getTime();
    const end = new Date(event.endsAt).getTime();

    // Cluster boundary: this event starts after the last cluster end.
    if (start >= clusterEnd) flushCluster();

    let laneIdx = laneEnds.findIndex((laneEnd) => laneEnd <= start);
    if (laneIdx === -1) {
      laneIdx = laneEnds.length;
      laneEnds.push(end);
    } else {
      laneEnds[laneIdx] = end;
    }

    result.set(event.id, { lane: laneIdx, totalLanes: laneEnds.length });
    cluster.ids.push(event.id);
    cluster.maxLanes = Math.max(cluster.maxLanes, laneEnds.length);
    clusterEnd = Math.max(clusterEnd, end);
  }
  flushCluster();

  return result;
}

export function eventsOnDay<T extends AnyEvent>(
  events: T[],
  day: Date,
  timezone?: string,
): T[] {
  const targetKey = dateKey(day);

  return events.filter((e) => {
    return dateKey(new Date(e.startsAt), timezone) === targetKey;
  });
}

export function isUntimedTask(event: AnyEvent): boolean {
  return event.kind === "task" && event.hasExplicitTime === false;
}

export function zonedClockDate(iso: string, timezone: string): Date {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(new Date(iso));

  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "0";
  const clock = new Date(0);
  clock.setHours(Number(get("hour")), Number(get("minute")), 0, 0);
  return clock;
}

function dateKey(date: Date, timezone?: string): string {
  if (!timezone) {
    return [
      date.getFullYear(),
      String(date.getMonth() + 1).padStart(2, "0"),
      String(date.getDate()).padStart(2, "0"),
    ].join("-");
  }

  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "";
  return `${get("year")}-${get("month")}-${get("day")}`;
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
