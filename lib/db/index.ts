import "server-only";

import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

import * as schema from "./schema";

// `postgres-js` parses the URL eagerly but only opens a connection on first
// query. We fall back to a syntactically valid placeholder so that importing
// this module during `next build` (when env vars aren't loaded) doesn't crash.
// At runtime, a missing DATABASE_URL will surface as a connection error on the
// first real query, which is the right behavior.
const url = process.env.DATABASE_URL ?? "postgresql://placeholder@localhost:5432/placeholder";

// `prepare: false` is required for Supabase's transaction-mode pooler
// (PgBouncer in transaction mode doesn't support prepared statements).
const queryClient = postgres(url, { prepare: false });

export const db = drizzle(queryClient, { schema });

export { schema };
