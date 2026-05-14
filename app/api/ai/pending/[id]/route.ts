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

type PendingRow = typeof aiPendingEvent.$inferSelect;
type PendingUpdate = Partial<typeof aiPendingEvent.$inferInsert>;

function toPendingEvent(row: PendingRow): AIPendingEvent {
  return {
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
}

function parseDate(value: unknown, field: string): Date | NextResponse {
  if (typeof value !== "string") {
    return NextResponse.json({ error: `${field} must be an ISO string` }, { status: 400 });
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return NextResponse.json({ error: `${field} must be a valid date` }, { status: 400 });
  }
  return date;
}

export async function PATCH(req: Request, ctx: RouteContext) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { id } = await ctx.params;

  if (body.status !== undefined) {
    if (body.status !== "discarded") {
      return NextResponse.json(
        { error: "Only status='discarded' is supported here" },
        { status: 400 },
      );
    }

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

    return NextResponse.json({ pendingEvent: toPendingEvent(row) });
  }

  const [existing] = await db
    .select()
    .from(aiPendingEvent)
    .where(
      and(
        eq(aiPendingEvent.id, id),
        eq(aiPendingEvent.userId, session.user.id),
        eq(aiPendingEvent.status, "pending"),
      ),
    )
    .limit(1);

  if (!existing) {
    return NextResponse.json(
      { error: "Pending event not found" },
      { status: 404 },
    );
  }

  const updates: PendingUpdate = {};

  if (body.title !== undefined) {
    if (typeof body.title !== "string" || body.title.trim().length === 0) {
      return NextResponse.json(
        { error: "title must be a non-empty string" },
        { status: 400 },
      );
    }
    updates.title = body.title.trim();
  }

  if (body.startsAt !== undefined) {
    const startsAt = parseDate(body.startsAt, "startsAt");
    if (startsAt instanceof NextResponse) return startsAt;
    updates.startsAt = startsAt;
  }

  if (body.endsAt !== undefined) {
    const endsAt = parseDate(body.endsAt, "endsAt");
    if (endsAt instanceof NextResponse) return endsAt;
    updates.endsAt = endsAt;
  }

  if (body.kind !== undefined) {
    if (body.kind !== "event" && body.kind !== "task") {
      return NextResponse.json(
        { error: "kind must be 'event' or 'task'" },
        { status: 400 },
      );
    }
    updates.kind = body.kind;
  }

  if (body.hasExplicitTime !== undefined) {
    if (typeof body.hasExplicitTime !== "boolean") {
      return NextResponse.json(
        { error: "hasExplicitTime must be boolean" },
        { status: 400 },
      );
    }
    updates.hasExplicitTime = body.hasExplicitTime;
  }

  if (body.reasoning !== undefined) {
    if (body.reasoning !== null && typeof body.reasoning !== "string") {
      return NextResponse.json(
        { error: "reasoning must be string or null" },
        { status: 400 },
      );
    }
    updates.reasoning = body.reasoning;
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json(
      { error: "No supported draft fields provided" },
      { status: 400 },
    );
  }

  const nextStartsAt = updates.startsAt ?? existing.startsAt;
  const nextEndsAt = updates.endsAt ?? existing.endsAt;
  if (nextEndsAt.getTime() < nextStartsAt.getTime()) {
    return NextResponse.json(
      { error: "endsAt must be after startsAt" },
      { status: 400 },
    );
  }

  const [row] = await db
    .update(aiPendingEvent)
    .set(updates)
    .where(
      and(
        eq(aiPendingEvent.id, id),
        eq(aiPendingEvent.userId, session.user.id),
        eq(aiPendingEvent.status, "pending"),
      ),
    )
    .returning();

  return NextResponse.json({ pendingEvent: toPendingEvent(row) });
}
