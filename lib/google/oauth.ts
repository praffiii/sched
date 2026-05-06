import "server-only";

import { and, eq } from "drizzle-orm";
import { google } from "googleapis";

import { db } from "@/lib/db";
import { account } from "@/lib/db/schema";

export async function getGoogleOAuthClient(userId: string) {
  const [row] = await db
    .select()
    .from(account)
    .where(and(eq(account.userId, userId), eq(account.providerId, "google")))
    .limit(1);

  if (!row?.accessToken) {
    throw new Error("No Google account linked for user");
  }

  const oauth = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
  );

  oauth.setCredentials({
    access_token: row.accessToken,
    refresh_token: row.refreshToken ?? undefined,
    expiry_date: row.accessTokenExpiresAt?.getTime(),
  });

  // googleapis fires this event when it auto-refreshes the access token.
  // Persist back to DB so the next request starts with a valid token.
  oauth.on("tokens", (tokens) => {
    if (!tokens.access_token) return;
    void db
      .update(account)
      .set({
        accessToken: tokens.access_token,
        accessTokenExpiresAt: tokens.expiry_date
          ? new Date(tokens.expiry_date)
          : null,
      })
      .where(eq(account.id, row.id));
  });

  return oauth;
}
