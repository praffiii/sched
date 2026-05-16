import { headers } from "next/headers";
import { NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import {
  claimPendingEvent,
  completePendingEvent,
  releasePendingEventClaim,
} from "@/lib/ai-pending";
import { getGoogleOAuthClient } from "@/lib/google/oauth";
import {
  createCalendarEvent,
  getPrimaryCalendarTimezone,
  listEventsForContext,
} from "@/lib/google/calendar";
import { listGoogleTasksForContext } from "@/lib/google/tasks";
import { normalizeTimezone } from "@/lib/utils/date";
import type { GCalEvent } from "@/types/events";

export async function GET(req: Request) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const oauth = await getGoogleOAuthClient(session.user.id);
    const now = new Date();
    // Prefer client-sent timezone header; query-param fallback for compatibility.
    const googleTimezone = await getPrimaryCalendarTimezone(oauth);
    const requestedTimezone =
      req.headers.get("x-client-timezone") ??
      new URL(req.url, process.env.BETTER_AUTH_URL ?? "http://localhost")
        .searchParams.get("timezone");
    const timezone =
      requestedTimezone && requestedTimezone.length > 0
        ? normalizeTimezone(requestedTimezone, googleTimezone)
        : googleTimezone;
    const events = await listEventsForContext(oauth, now);
    let tasks: GCalEvent[] = [];
    try {
      tasks = await listGoogleTasksForContext(oauth, now, timezone);
    } catch (err) {
      console.error("[calendar/events] tasks fetch failed", err);
    }
    return NextResponse.json({
      events: [...events, ...tasks],
      timezone,
      googleTimezone,
    });
  } catch (err) {
    console.error("[calendar/events] failed", err);
    return NextResponse.json(
      { error: "Failed to load calendar events" },
      { status: 502 },
    );
  }
}

export async function POST(req: Request) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { pendingEventId?: unknown; timezone?: unknown };
  let externalEventCreated = false;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const pendingEventId =
    typeof body.pendingEventId === "string" ? body.pendingEventId : "";
  const requestedTimezone =
    typeof body.timezone === "string" && body.timezone.length > 0
      ? body.timezone
      : null;
  if (!pendingEventId) {
    return NextResponse.json(
      { error: "pendingEventId is required" },
      { status: 400 },
    );
  }

  const pending = await claimPendingEvent({
    id: pendingEventId,
    userId: session.user.id,
    kind: "event",
  });

  if (!pending) {
    return NextResponse.json(
      { error: "Pending calendar event not found" },
      { status: 404 },
    );
  }

  try {
    const endsAt =
      pending.endsAt.getTime() > pending.startsAt.getTime()
        ? pending.endsAt
        : new Date(pending.startsAt.getTime() + 30 * 60 * 1000);

    const oauth = await getGoogleOAuthClient(session.user.id);
    const timezone =
      requestedTimezone
        ? normalizeTimezone(requestedTimezone, await getPrimaryCalendarTimezone(oauth))
        : await getPrimaryCalendarTimezone(oauth);
    const event = await createCalendarEvent(oauth, {
      title: pending.title,
      startsAt: pending.startsAt,
      endsAt,
      timezone,
    });
    externalEventCreated = true;

    await completePendingEvent({
      id: pending.id,
      userId: session.user.id,
      googleEventId: event.id,
    });

    return NextResponse.json({ event });
  } catch (err) {
    if (!externalEventCreated) {
      await releasePendingEventClaim({
        id: pending.id,
        userId: session.user.id,
      });
    }
    console.error("[calendar/events] create failed", err);
    return NextResponse.json(
      { error: "Failed to create calendar event" },
      { status: 502 },
    );
  }
}
