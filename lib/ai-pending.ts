import "server-only";

import { and, eq, isNull } from "drizzle-orm";

import { db } from "@/lib/db";
import { aiPendingEvent } from "@/lib/db/schema";

type PendingKind = "event" | "task";

export async function claimPendingEvent(input: {
  id: string;
  userId: string;
  kind: PendingKind;
}) {
  const [pending] = await db
    .update(aiPendingEvent)
    .set({ status: "accepted" })
    .where(
      and(
        eq(aiPendingEvent.id, input.id),
        eq(aiPendingEvent.userId, input.userId),
        eq(aiPendingEvent.status, "pending"),
        eq(aiPendingEvent.kind, input.kind),
      ),
    )
    .returning();

  return pending ?? null;
}

export async function completePendingEvent(input: {
  id: string;
  userId: string;
  googleEventId: string;
}) {
  await db
    .update(aiPendingEvent)
    .set({ googleEventId: input.googleEventId })
    .where(
      and(
        eq(aiPendingEvent.id, input.id),
        eq(aiPendingEvent.userId, input.userId),
        eq(aiPendingEvent.status, "accepted"),
      ),
    );
}

export async function releasePendingEventClaim(input: {
  id: string;
  userId: string;
}) {
  await db
    .update(aiPendingEvent)
    .set({ status: "pending" })
    .where(
      and(
        eq(aiPendingEvent.id, input.id),
        eq(aiPendingEvent.userId, input.userId),
        eq(aiPendingEvent.status, "accepted"),
        isNull(aiPendingEvent.googleEventId),
      ),
    );
}
