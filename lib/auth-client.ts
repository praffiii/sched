import { createAuthClient } from "better-auth/react";

// baseURL is omitted on purpose — Better Auth defaults to the current origin,
// which is what we want for both dev (localhost:3000) and production (Vercel).
export const authClient = createAuthClient();

export const { signIn, signOut, useSession } = authClient;
