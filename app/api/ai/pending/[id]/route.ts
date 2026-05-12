import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { aiPendingEvent } from "@/lib/db/schema";
import type { AIPendingEvent } from "@/types/events";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function PATCH(req: Request, ctx: RouteContext) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { status?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (body.status !== "discarded") {
    return NextResponse.json(
      { error: "Only status='discarded' is supported here" },
      { status: 400 },
    );
  }

  const { id } = await ctx.params;
  const [row] = await db
    .update(aiPendingEvent)
    .set({ status: "discarded" })
    .where(
      and(
        eq(aiPendingEvent.id, id),
        eq(aiPendingEvent.userId, session.user.id),
        eq(aiPendingEvent.status, "pending"),
      ),
    )
    .returning();

  if (!row) {
    return NextResponse.json(
      { error: "Pending event not found" },
      { status: 404 },
    );
  }

  const pendingEvent: AIPendingEvent = {
    id: row.id,
    title: row.title,
    startsAt: row.startsAt.toISOString(),
    endsAt: row.endsAt.toISOString(),
    kind: row.kind as AIPendingEvent["kind"],
    hasExplicitTime: row.hasExplicitTime,
    reasoning: row.reasoning,
    status: row.status as AIPendingEvent["status"],
    googleEventId: row.googleEventId,
    createdAt: row.createdAt.toISOString(),
  };

  return NextResponse.json({ pendingEvent });
}
