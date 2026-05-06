import { headers } from "next/headers";
import { NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import { getGoogleOAuthClient } from "@/lib/google/oauth";
import { listEventsForContext } from "@/lib/google/calendar";

export async function GET() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const oauth = await getGoogleOAuthClient(session.user.id);
    const events = await listEventsForContext(oauth, new Date());
    return NextResponse.json({ events });
  } catch (err) {
    console.error("[calendar/events] failed", err);
    return NextResponse.json(
      { error: "Failed to load calendar events" },
      { status: 502 },
    );
  }
}
