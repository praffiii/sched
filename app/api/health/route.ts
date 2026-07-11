import { NextResponse } from "next/server";
import { sql } from "drizzle-orm";

import { db } from "@/lib/db";

// Always execute fresh — health checks must never be served from cache.
export const dynamic = "force-dynamic";

export async function GET() {
  const ts = new Date().toISOString();

  let dbStatus: "ok" | "error" = "ok";
  try {
    await db.execute(sql`SELECT 1`);
  } catch {
    dbStatus = "error";
  }

  const healthy = dbStatus === "ok";

  return NextResponse.json(
    { status: healthy ? "ok" : "degraded", db: dbStatus, ts },
    { status: healthy ? 200 : 503 },
  );
}
