import { headers } from "next/headers";
import { NextResponse } from "next/server";

import { GEMINI_MODEL, genAI } from "@/lib/gemini";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { aiPendingEvent, chatMessage } from "@/lib/db/schema";
import { getGoogleOAuthClient } from "@/lib/google/oauth";
import {
  getPrimaryCalendarTimezone,
  listEventsForContext,
} from "@/lib/google/calendar";
import { formatLocalIso, normalizeTimezone } from "@/lib/utils/date";
import {
  buildUserMessage,
  PROMPT_VERSION,
  SYSTEM_PROMPT,
} from "@/features/ai/prompts";
import { preserveExplicitIndonesianDate } from "@/features/ai/date-correction";
import { eventSchema, type GeneratedPayload } from "@/features/ai/schema";
import {
  AI_GENERATION_RATE_LIMIT,
  enforceRateLimit,
  rateLimitResponse,
} from "@/lib/rate-limit";
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

// Keywords in reasoning that indicate the AI thinks it scheduled for "today".
// If the event's startsAt is NOT today but reasoning claims it is, fix the date.
const TODAY_KEYWORDS = /\b(hari ini|today|sore ini|malam ini|pagi ini|siang ini|this afternoon|this evening|this morning)\b/i;
const TOMORROW_KEYWORDS = /\b(besok|esok|tomorrow)\b/i;

function dateInTz(date: Date, timezone: string): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const get = (type: string) =>
    parts.find((p) => p.type === type)?.value ?? "";
  return `${get("year")}-${get("month")}-${get("day")}`;
}

function fixContradictoryDate(
  event: { title: string; startsAt: string; endsAt: string; kind: string; hasExplicitTime: boolean; reasoning?: string },
  now: Date,
  timezone: string,
): typeof event {
  const reasoning = event.reasoning ?? "";

  // Only fix when reasoning explicitly claims "today" and does NOT mention tomorrow.
  if (!TODAY_KEYWORDS.test(reasoning)) return event;
  if (TOMORROW_KEYWORDS.test(reasoning)) return event;

  const todayStr = dateInTz(now, timezone);
  const eventDateStr = dateInTz(new Date(event.startsAt), timezone);

  if (eventDateStr === todayStr) return event; // already correct

  // Shift the event's date to today while preserving the time-of-day.
  const startsAt = new Date(event.startsAt);
  const endsAt = new Date(event.endsAt);

  const todayStart = new Date(now);
  todayStart.setHours(
    startsAt.getHours(),
    startsAt.getMinutes(),
    startsAt.getSeconds(),
    0,
  );

  const todayEnd = new Date(now);
  todayEnd.setHours(
    endsAt.getHours(),
    endsAt.getMinutes(),
    endsAt.getSeconds(),
    0,
  );

  // If the event crossed midnight originally, preserve the duration.
  const durationMs = endsAt.getTime() - startsAt.getTime();
  if (todayEnd <= todayStart) {
    todayEnd.setTime(todayStart.getTime() + durationMs);
  }

  console.log(
    `[ai/generate] FIXED contradictory date: ${eventDateStr} → ${todayStr} for "${event.title}" (reasoning: "${reasoning}")`,
  );

  return {
    ...event,
    startsAt: formatLocalIso(todayStart, timezone),
    endsAt: formatLocalIso(todayEnd, timezone),
  };
}

async function generateWithRetry(userMessage: string) {
  try {
    return await genAI.models.generateContent({
      model: GEMINI_MODEL,
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
      model: GEMINI_MODEL,
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

  const rateLimit = await enforceRateLimit({
    ...AI_GENERATION_RATE_LIMIT,
    identifier: session.user.id,
  });
  if (!rateLimit.allowed) return rateLimitResponse(rateLimit);

  let body: { prompt?: unknown; timezone?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const prompt = typeof body.prompt === "string" ? body.prompt.trim() : "";
  const timezone =
    typeof body.timezone === "string" && body.timezone.length > 0
      ? normalizeTimezone(body.timezone)
      : "UTC";

  if (!prompt || prompt.length > MAX_PROMPT_LENGTH) {
    return NextResponse.json(
      { error: "Prompt must be a non-empty string ≤ 2000 chars" },
      { status: 400 },
    );
  }

  let calendarEvents = [] as Awaited<ReturnType<typeof listEventsForContext>>;
  const effectiveTimezone = timezone;
  try {
    const oauth = await getGoogleOAuthClient(session.user.id);
    // Use the client/browser timezone for scheduling semantics. Google Calendar
    // account timezone can differ from the user's active device timezone, which
    // causes events to appear at different times on mobile.
    await getPrimaryCalendarTimezone(oauth);
    calendarEvents = await listEventsForContext(oauth, new Date());
  } catch (err) {
    console.error("[ai/generate] calendar fetch failed", err);
    // Don't block the AI call — schedule with no context if calendar is unavailable.
  }

  const userMessage = buildUserMessage({
    now: formatLocalIso(new Date(), effectiveTimezone),
    timezone: effectiveTimezone,
    events: calendarEvents,
    prompt,
  });

  let parsed: GeneratedPayload;
  try {
    const response = await generateWithRetry(userMessage);
    const raw = response.text;
    if (!raw) throw new Error("Empty response from Gemini");
    parsed = JSON.parse(raw) as GeneratedPayload;

    // Log full AI output to diagnose timestamp/reasoning contradictions
    console.log(
      `[ai/generate] prompt_version=${PROMPT_VERSION} tz=${effectiveTimezone}`,
    );
    console.log(
      `[ai/generate] now_sent=${userMessage.slice(0, 80)}...`,
    );
    console.log(
      `[ai/generate] events=${JSON.stringify(parsed.events)}, clarification=${parsed.clarification ?? "none"}`,
    );
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
      (e?.kind === "event" || e?.kind === "task") &&
      typeof e?.hasExplicitTime === "boolean",
  );

  // --- Post-process: fix timestamps when reasoning contradicts the date ---
  // LLMs can say "hari ini" in reasoning but emit a future date in startsAt.
  // Detect this and force-correct to today if the prompt had no date reference.
  const serverNow = new Date();
  const correctedEvents = validEvents.map((e) =>
    preserveExplicitIndonesianDate(
      fixContradictoryDate(e, serverNow, effectiveTimezone),
      prompt,
      serverNow,
      effectiveTimezone,
    ),
  );

  const clarification =
    typeof parsed.clarification === "string" && parsed.clarification.trim()
      ? parsed.clarification.trim()
      : null;

  if (correctedEvents.length === 0 && !clarification) {
    return NextResponse.json(
      { error: "AI returned no valid events" },
      { status: 502 },
    );
  }

  const userId = session.user.id;
  const assistantContent =
    clarification ??
    correctedEvents[0]?.reasoning ??
    `Created ${correctedEvents.length} item${correctedEvents.length === 1 ? "" : "s"}.`;

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

    if (correctedEvents.length === 0) return [];

    const rows = correctedEvents.map((e) => ({
      id: crypto.randomUUID(),
      userId,
      title: e.title,
      startsAt: new Date(e.startsAt),
      endsAt: new Date(e.endsAt),
      kind: e.kind as EventKind,
      hasExplicitTime: e.hasExplicitTime,
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
      hasExplicitTime: r.hasExplicitTime,
      reasoning: r.reasoning,
      status: r.status as AIPendingEvent["status"],
      googleEventId: r.googleEventId,
      createdAt: r.createdAt.toISOString(),
    }));
  });

  return NextResponse.json({
    pendingEvents: inserted,
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
      content: prompt,
      createdAt: userTs.toISOString(),
    },
  });
}
