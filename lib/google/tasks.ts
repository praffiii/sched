import "server-only";

import { google } from "googleapis";

import type { getGoogleOAuthClient } from "@/lib/google/oauth";
import { getContextWindow, zonedLocalDateTimeToIso } from "@/lib/utils/date";
import type { GCalEvent } from "@/types/events";

type OAuthClient = Awaited<ReturnType<typeof getGoogleOAuthClient>>;

export async function createGoogleTask(
  oauth: OAuthClient,
  input: {
    title: string;
    dueAt: Date;
  },
): Promise<{ id: string; title: string }> {
  const tasks = google.tasks({ version: "v1", auth: oauth });

  const res = await tasks.tasks.insert({
    tasklist: "@default",
    requestBody: {
      title: input.title,
      due: input.dueAt.toISOString(),
    },
  });

  if (!res.data.id) {
    throw new Error("Google Tasks returned an incomplete task");
  }

  return {
    id: res.data.id,
    title: res.data.title ?? input.title,
  };
}

export async function listGoogleTasksForContext(
  oauth: OAuthClient,
  now: Date,
  timezone: string,
): Promise<GCalEvent[]> {
  const tasks = google.tasks({ version: "v1", auth: oauth });
  const { timeMin, timeMax } = getContextWindow(now);

  const res = await tasks.tasks.list({
    tasklist: "@default",
    showCompleted: false,
    showDeleted: false,
    dueMin: timeMin,
    dueMax: timeMax,
    maxResults: 100,
  });

  return (res.data.items ?? [])
    .filter((task) => task.id && task.title && task.due)
    .map((task) => {
      // Google Tasks stores due as a date. The time component is ignored by
      // Google, so preserve the calendar date and render it in Sched as an
      // untimed top-of-day task.
      const dueDate = task.due?.slice(0, 10) ?? "";
      const dueIso =
        zonedLocalDateTimeToIso(dueDate, "09:00", timezone) ?? task.due ?? now.toISOString();

      return {
        id: task.id as string,
        title: task.title as string,
        startsAt: dueIso,
        endsAt: dueIso,
        kind: "task",
        hasExplicitTime: false,
      };
    });
}
