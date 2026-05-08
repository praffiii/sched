import { headers } from "next/headers";
import { NextResponse } from "next/server";

import { genAI } from "@/lib/gemini";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { aiPendingEvent, chatMessage } from "@/lib/db/schema";
import { getGoogleOAuthClient } from "@/lib/google/oauth";
import { listEventsForContext } from "@/lib/google/calendar";
import {
  buildUserMessage,
  PROMPT_VERSION,
  SYSTEM_PROMPT,
} from "@/features/ai/prompts";
import { eventSchema, type GeneratedPayload } from "@/features/ai/schema";
import type { AIPendingEvent, EventKind } from "@/types/events";

const MAX_PROMPT_LENGTH = 2000;
const RETRY_DELAY_MS = 1500;

function isTransientGeminiError(err: unknown): boolean {
  if (!err || typeof err !== "object") return false;
  const e = err as { status?: number; message?: string };
  if (e.status === 503 || e.status === 429) return true;
  if (typeof e.message === "string" && /UNAVAILABLE|503|RESOURCE_EXHAUSTED/i.test(e.message)) {
    return true;
  }
  return false;
}

async function generateWithRetry(userMessage: string) {
  try {
    return await genAI.models.generateContent({
      model: "gemini-2.5-flash",
      contents: userMessage,
      config: {
        systemInstruction: SYSTEM_PROMPT,
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
        systemInstruction: SYSTEM_PROMPT,
        responseMimeType: "application/json",
        responseJsonSchema: eventSchema,
      },
    });
  }
}

export async function POST(req: Request) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { prompt?: unknown; timezone?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const prompt = typeof body.prompt === "string" ? body.prompt.trim() : "";
  const timezone =
    typeof body.timezone === "string" && body.timezone.length > 0
      ? body.timezone
      : "UTC";

  if (!prompt || prompt.length > MAX_PROMPT_LENGTH) {
    return NextResponse.json(
      { error: "Prompt must be a non-empty string ≤ 2000 chars" },
      { status: 400 },
    );
  }

  let calendarEvents = [] as Awaited<ReturnType<typeof listEventsForContext>>;
  try {
    const oauth = await getGoogleOAuthClient(session.user.id);
    calendarEvents = await listEventsForContext(oauth, new Date());
  } catch (err) {
    console.error("[ai/generate] calendar fetch failed", err);
    // Don't block the AI call — schedule with no context if calendar is unavailable.
  }

  const userMessage = buildUserMessage({
    now: new Date().toISOString(),
    timezone,
    events: calendarEvents,
    prompt,
  });

  let parsed: GeneratedPayload;
  try {
    const response = await generateWithRetry(userMessage);
    const raw = response.text;
    if (!raw) throw new Error("Empty response from Gemini");
    parsed = JSON.parse(raw) as GeneratedPayload;
  } catch (err) {
    console.error(
      `[ai/generate] gemini failure (prompt_version=${PROMPT_VERSION})`,
      err,
    );
    const transient = isTransientGeminiError(err);
    return NextResponse.json(
      {
        error: "AI generation failed",
        transient,
      },
      { status: transient ? 503 : 502 },
    );
  }

  if (!parsed?.events || !Array.isArray(parsed.events)) {
    console.error("[ai/generate] invalid payload shape", parsed);
    return NextResponse.json(
      { error: "AI returned invalid payload" },
      { status: 502 },
    );
  }

  const validEvents = parsed.events.filter(
    (e) =>
      typeof e?.title === "string" &&
      typeof e?.startsAt === "string" &&
      typeof e?.endsAt === "string" &&
      (e?.kind === "event" || e?.kind === "task"),
  );

  const clarification =
    typeof parsed.clarification === "string" && parsed.clarification.trim()
      ? parsed.clarification.trim()
      : null;

  if (validEvents.length === 0 && !clarification) {
    return NextResponse.json(
      { error: "AI returned no valid events" },
      { status: 502 },
    );
  }

  const userId = session.user.id;
  const assistantContent =
    clarification ??
    validEvents[0]?.reasoning ??
    `Created ${validEvents.length} item${validEvents.length === 1 ? "" : "s"}.`;

  const userMsgId = crypto.randomUUID();
  const assistantMsgId = crypto.randomUUID();
  const now = new Date();
  // Strict-monotonic timestamps: user < assistant < event.
  // Events must be AFTER assistant so the chat-grouping logic in
  // ChatMessageList (`msg.createdAt <= event.createdAt`) attaches each event
  // to its own assistant message rather than always falling through to the
  // latest one.
  const userTs = now;
  const assistantTs = new Date(now.getTime() + 1);
  const eventTs = new Date(now.getTime() + 2);

  const inserted: AIPendingEvent[] = await db.transaction(async (tx) => {
    await tx.insert(chatMessage).values({
      id: userMsgId,
      userId,
      role: "user",
      content: prompt,
      createdAt: userTs,
    });

    await tx.insert(chatMessage).values({
      id: assistantMsgId,
      userId,
      role: "assistant",
      content: assistantContent,
      createdAt: assistantTs,
    });

    if (validEvents.length === 0) return [];

    const rows = validEvents.map((e) => ({
      id: crypto.randomUUID(),
      userId,
      title: e.title,
      startsAt: new Date(e.startsAt),
      endsAt: new Date(e.endsAt),
      kind: e.kind as EventKind,
      reasoning: e.reasoning ?? null,
      status: "pending" as const,
      googleEventId: null,
      createdAt: eventTs,
    }));

    const persisted = await tx.insert(aiPendingEvent).values(rows).returning();

    return persisted.map((r) => ({
      id: r.id,
      title: r.title,
      startsAt: r.startsAt.toISOString(),
      endsAt: r.endsAt.toISOString(),
      kind: r.kind as EventKind,
      reasoning: r.reasoning,
      status: r.status as AIPendingEvent["status"],
      googleEventId: r.googleEventId,
      createdAt: r.createdAt.toISOString(),
    }));
  });

  return NextResponse.json({
    pendingEvents: inserted,
    assistantMessage: {
      id: assistantMsgId,
      role: "assistant",
      content: assistantContent,
      createdAt: assistantTs.toISOString(),
    },
    userMessage: {
      id: userMsgId,
      role: "user",
      content: prompt,
      createdAt: userTs.toISOString(),
    },
  });
}
