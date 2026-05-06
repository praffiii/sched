import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { aiPendingEvent } from "@/lib/db/schema";
import type { AIPendingEvent } from "@/types/events";

export async function GET() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const rows = await db
    .select()
    .from(aiPendingEvent)
    .where(
      and(
        eq(aiPendingEvent.userId, session.user.id),
        eq(aiPendingEvent.status, "pending"),
      ),
    )
    .orderBy(aiPendingEvent.startsAt);

  const pendingEvents: AIPendingEvent[] = rows.map((r) => ({
    id: r.id,
    title: r.title,
    startsAt: r.startsAt.toISOString(),
    endsAt: r.endsAt.toISOString(),
    kind: r.kind as AIPendingEvent["kind"],
    reasoning: r.reasoning,
    status: r.status as AIPendingEvent["status"],
    googleEventId: r.googleEventId,
    createdAt: r.createdAt.toISOString(),
  }));

  return NextResponse.json({ pendingEvents });
}
