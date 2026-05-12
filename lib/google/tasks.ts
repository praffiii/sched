import "server-only";

import { google } from "googleapis";

import type { getGoogleOAuthClient } from "@/lib/google/oauth";

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
