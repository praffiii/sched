import "server-only";

import { google } from "googleapis";

import type { GCalEvent } from "@/types/events";
import type { getGoogleOAuthClient } from "@/lib/google/oauth";
import { getContextWindow } from "@/lib/utils/date";

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
