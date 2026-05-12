import "server-only";

import { google } from "googleapis";

import type { GCalEvent } from "@/types/events";
import type { getGoogleOAuthClient } from "@/lib/google/oauth";
import { formatLocalIso, getContextWindow } from "@/lib/utils/date";

type OAuthClient = Awaited<ReturnType<typeof getGoogleOAuthClient>>;

export async function listEventsForContext(
  oauth: OAuthClient,
  now: Date,
): Promise<GCalEvent[]> {
  const cal = google.calendar({ version: "v3", auth: oauth });
  const { timeMin, timeMax } = getContextWindow(now);

  const res = await cal.events.list({
    calendarId: "primary",
    timeMin,
    timeMax,
    singleEvents: true,
    orderBy: "startTime",
    maxResults: 100,
  });

  return (res.data.items ?? [])
    .filter((e) => e.start?.dateTime && e.end?.dateTime && e.id)
    .map((e) => ({
      id: e.id!,
      title: e.summary ?? "(untitled)",
      startsAt: e.start!.dateTime!,
      endsAt: e.end!.dateTime!,
    }));
}

export async function getPrimaryCalendarTimezone(
  oauth: OAuthClient,
): Promise<string> {
  const cal = google.calendar({ version: "v3", auth: oauth });
  const res = await cal.calendars.get({ calendarId: "primary" });
  return res.data.timeZone ?? "UTC";
}

export async function createCalendarEvent(
  oauth: OAuthClient,
  input: {
    title: string;
    startsAt: Date;
    endsAt: Date;
    timezone: string;
  },
): Promise<GCalEvent> {
  const cal = google.calendar({ version: "v3", auth: oauth });

  const res = await cal.events.insert({
    calendarId: "primary",
    requestBody: {
      summary: input.title,
      start: {
        dateTime: formatLocalIso(input.startsAt, input.timezone),
        timeZone: input.timezone,
      },
      end: {
        dateTime: formatLocalIso(input.endsAt, input.timezone),
        timeZone: input.timezone,
      },
    },
  });

  const event = res.data;
  if (!event.id || !event.start?.dateTime || !event.end?.dateTime) {
    throw new Error("Google Calendar returned an incomplete event");
  }

  return {
    id: event.id,
    title: event.summary ?? input.title,
    startsAt: event.start.dateTime,
    endsAt: event.end.dateTime,
  };
}
