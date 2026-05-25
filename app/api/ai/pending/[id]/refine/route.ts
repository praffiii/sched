import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";

import { eventSchema, type GeneratedPayload } from "@/features/ai/schema";
import { SYSTEM_PROMPT } from "@/features/ai/prompts";
import { genAI } from "@/lib/gemini";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { aiPendingEvent, chatMessage } from "@/lib/db/schema";
import { getGoogleOAuthClient } from "@/lib/google/oauth";
import {
  getPrimaryCalendarTimezone,
  listEventsForContext,
} from "@/lib/google/calendar";
import {
  AI_GENERATION_RATE_LIMIT,
  enforceRateLimit,
  rateLimitResponse,
} from "@/lib/rate-limit";
import { formatLocalIso, normalizeTimezone } from "@/lib/utils/date";
import type { AIPendingEvent, EventKind } from "@/types/events";

const MAX_INSTRUCTION_LENGTH = 1000;
const RETRY_DELAY_MS = 1500;

const REFINE_SYSTEM_PROMPT = `${SYSTEM_PROMPT}

REFINEMENT MODE — absolute rules:
- The user is editing exactly ONE selected AI-pending draft. Do not create a new unrelated schedule item.
- Return exactly one item in events: the updated version of the selected draft.
- Preserve the draft title, date, duration, kind, and hasExplicitTime unless the instruction explicitly changes them.
- If the instruction only mentions a time (for example "jam 9 malam" or "move to 9pm"), keep the original date and duration.
- If the instruction is relative ("1h earlier", "besok", "after lunch"), apply it to the selected draft.
- Never ask "what should I schedule?" because the event is already selected.
- Existing Google Calendar events are still read-only context; do not edit or delete them.`;

type RouteContext = {
  params: Promise<{ id: string }>;
};

type PendingRow = typeof aiPendingEvent.$inferSelect;

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

function isTransientGeminiError(err: unknown): boolean {
  if (!err || typeof err !== "object") return false;
  const e = err as { status?: number; message?: string };
  if (e.status === 503 || e.status === 429) return true;
  if (typeof e.message === "string" && /UNAVAILABLE|503|RESOURCE_EXHAUSTED/i.test(e.message)) {
    return true;
  }
  return false;
}

async function generateRefinement(userMessage: string) {
  try {
    return await genAI.models.generateContent({
      model: "gemini-2.5-flash",
      contents: userMessage,
      config: {
        systemInstruction: REFINE_SYSTEM_PROMPT,
        responseMimeType: "application/json",
        responseJsonSchema: eventSchema,
      },
    });
  } catch (err) {
    if (!isTransientGeminiError(err)) throw err;
    await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY_MS));
    return await genAI.models.generateContent({
      model: "gemini-2.5-flash",
      contents: userMessage,
      config: {
        systemInstruction: REFINE_SYSTEM_PROMPT,
        responseMimeType: "application/json",
        responseJsonSchema: eventSchema,
      },
    });
  }
}

function buildRefineMessage(input: {
  now: string;
  timezone: string;
  pending: PendingRow;
  calendarEvents: Awaited<ReturnType<typeof listEventsForContext>>;
  instruction: string;
}): string {
  const eventLines = input.calendarEvents
    .slice(0, 30)
    .map((e) => `- ${e.startsAt} → ${e.endsAt} | ${e.title}`)
    .join("\n");

  return `CURRENT TIME: ${input.now}
TIMEZONE: ${input.timezone}

SELECTED AI-PENDING DRAFT (the only item to refine):
- title: ${input.pending.title}
- startsAt: ${formatLocalIso(input.pending.startsAt, input.timezone)}
- endsAt: ${formatLocalIso(input.pending.endsAt, input.timezone)}
- kind: ${input.pending.kind}
- hasExplicitTime: ${input.pending.hasExplicitTime}
- reasoning: ${input.pending.reasoning ?? "(none)"}

EXISTING CALENDAR EVENTS (read-only context):
${eventLines || "(none)"}

USER REFINEMENT INSTRUCTION:
"${input.instruction}"`;
}

export async function POST(req: Request, ctx: RouteContext) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const rateLimit = await enforceRateLimit({
    ...AI_GENERATION_RATE_LIMIT,
    identifier: session.user.id,
  });
  if (!rateLimit.allowed) return rateLimitResponse(rateLimit);

  let body: { instruction?: unknown; timezone?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const instruction =
    typeof body.instruction === "string" ? body.instruction.trim() : "";
  const timezone =
    typeof body.timezone === "string" && body.timezone.length > 0
      ? normalizeTimezone(body.timezone)
      : "UTC";

  if (!instruction || instruction.length > MAX_INSTRUCTION_LENGTH) {
    return NextResponse.json(
      { error: "Instruction must be a non-empty string ≤ 1000 chars" },
      { status: 400 },
    );
  }

  const { id } = await ctx.params;
  const [pending] = await db
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

  if (!pending) {
    return NextResponse.json(
      { error: "Pending event not found" },
      { status: 404 },
    );
  }

  let calendarEvents = [] as Awaited<ReturnType<typeof listEventsForContext>>;
  const effectiveTimezone = timezone;
  try {
    const oauth = await getGoogleOAuthClient(session.user.id);
    // Use the client/browser timezone for refinement semantics. Google account
    // timezone can differ from the active device timezone.
    await getPrimaryCalendarTimezone(oauth);
    calendarEvents = await listEventsForContext(oauth, new Date());
  } catch (err) {
    console.error("[ai/pending/refine] calendar fetch failed", err);
  }

  const userMessageForAI = buildRefineMessage({
    now: formatLocalIso(new Date(), effectiveTimezone),
    timezone: effectiveTimezone,
    pending,
    calendarEvents,
    instruction,
  });

  let parsed: GeneratedPayload;
  try {
    const response = await generateRefinement(userMessageForAI);
    const raw = response.text;
    if (!raw) throw new Error("Empty response from Gemini");
    parsed = JSON.parse(raw) as GeneratedPayload;
  } catch (err) {
    console.error("[ai/pending/refine] gemini failure", err);
    const transient = isTransientGeminiError(err);
    return NextResponse.json(
      {
        error: "AI refinement failed",
        transient,
      },
      { status: transient ? 503 : 502 },
    );
  }

  const event = parsed.events?.[0];
  const clarification =
    typeof parsed.clarification === "string" && parsed.clarification.trim()
      ? parsed.clarification.trim()
      : null;

  if (!event && !clarification) {
    return NextResponse.json(
      { error: "AI returned no valid refinement" },
      { status: 502 },
    );
  }

  if (event) {
    const startsAt = new Date(event.startsAt);
    const endsAt = new Date(event.endsAt);
    const isValidEvent =
      typeof event.title === "string" &&
      event.title.trim().length > 0 &&
      !Number.isNaN(startsAt.getTime()) &&
      !Number.isNaN(endsAt.getTime()) &&
      endsAt.getTime() >= startsAt.getTime() &&
      (event.kind === "event" || event.kind === "task") &&
      typeof event.hasExplicitTime === "boolean";

    if (!isValidEvent) {
      console.error("[ai/pending/refine] invalid event payload", event);
      return NextResponse.json(
        { error: "AI returned invalid refinement" },
        { status: 502 },
      );
    }
  }

  const userMsgId = crypto.randomUUID();
  const assistantMsgId = crypto.randomUUID();
  const now = new Date();
  const userTs = now;
  const assistantTs = new Date(now.getTime() + 1);
  const assistantContent =
    clarification ?? event?.reasoning ?? `Updated ${pending.title}.`;

  const result = await db.transaction(async (tx) => {
    await tx.insert(chatMessage).values({
      id: userMsgId,
      userId: session.user.id,
      role: "user",
      content: instruction,
      createdAt: userTs,
    });

    await tx.insert(chatMessage).values({
      id: assistantMsgId,
      userId: session.user.id,
      role: "assistant",
      content: assistantContent,
      createdAt: assistantTs,
    });

    if (!event) return pending;

    const [updated] = await tx
      .update(aiPendingEvent)
      .set({
        title: event.title,
        startsAt: new Date(event.startsAt),
        endsAt: new Date(event.endsAt),
        kind: event.kind as EventKind,
        hasExplicitTime: event.hasExplicitTime,
        reasoning: event.reasoning ?? pending.reasoning,
      })
      .where(
        and(
          eq(aiPendingEvent.id, pending.id),
          eq(aiPendingEvent.userId, session.user.id),
          eq(aiPendingEvent.status, "pending"),
        ),
      )
      .returning();

    return updated;
  });

  return NextResponse.json({
    pendingEvent: toPendingEvent(result),
    timezone: effectiveTimezone,
    assistantMessage: {
      id: assistantMsgId,
      role: "assistant",
      content: assistantContent,
      createdAt: assistantTs.toISOString(),
    },
    userMessage: {
      id: userMsgId,
      role: "user",
      content: instruction,
      createdAt: userTs.toISOString(),
    },
  });
}
