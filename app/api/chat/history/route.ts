import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { desc, eq } from "drizzle-orm";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { chatMessage } from "@/lib/db/schema";
import type { ChatMessage } from "@/types/chat";

const HISTORY_LIMIT = 50;

export async function GET() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const rows = await db
    .select()
    .from(chatMessage)
    .where(eq(chatMessage.userId, session.user.id))
    .orderBy(desc(chatMessage.createdAt))
    .limit(HISTORY_LIMIT);

  const messages: ChatMessage[] = rows
    .map((r) => ({
      id: r.id,
      role: r.role as ChatMessage["role"],
      content: r.content,
      createdAt: r.createdAt.toISOString(),
    }))
    .reverse();

  return NextResponse.json({ messages });
}
