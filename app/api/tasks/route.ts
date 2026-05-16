import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import {
  claimPendingEvent,
  completePendingEvent,
  releasePendingEventClaim,
} from "@/lib/ai-pending";
import { getGoogleOAuthClient } from "@/lib/google/oauth";
import { createGoogleTask } from "@/lib/google/tasks";
import type { GCalEvent } from "@/types/events";

export async function POST(req: Request) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { pendingEventId?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const pendingEventId =
    typeof body.pendingEventId === "string" ? body.pendingEventId : "";
  if (!pendingEventId) {
    return NextResponse.json(
      { error: "pendingEventId is required" },
      { status: 400 },
    );
  }

  const pending = await claimPendingEvent({
    id: pendingEventId,
    userId: session.user.id,
    kind: "task",
  });

  if (!pending) {
    return NextResponse.json(
      { error: "Pending task not found" },
      { status: 404 },
    );
  }

  let externalTaskCreated = false;
  try {
    const oauth = await getGoogleOAuthClient(session.user.id);
    const task = await createGoogleTask(oauth, {
      title: pending.title,
      dueAt: pending.startsAt,
    });
    externalTaskCreated = true;

    await completePendingEvent({
      id: pending.id,
      userId: session.user.id,
      googleEventId: task.id,
    });

    const taskEvent: GCalEvent = {
      id: task.id,
      title: task.title,
      startsAt: pending.startsAt.toISOString(),
      endsAt: pending.endsAt.toISOString(),
      kind: "task",
      hasExplicitTime: false,
    };

    return NextResponse.json({ task, taskEvent });
  } catch (err) {
    if (!externalTaskCreated) {
      await releasePendingEventClaim({
        id: pending.id,
        userId: session.user.id,
      });
    }
    console.error("[tasks] create failed", err);
    return NextResponse.json(
      { error: "Failed to create task" },
      { status: 502 },
    );
  }
}
