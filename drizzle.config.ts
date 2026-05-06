import { defineConfig } from "drizzle-kit";

// `generate` doesn't need a live connection — only `migrate`/`push`/`studio` do.
// We let those fail with their own clearer error if DATABASE_URL is missing.
export default defineConfig({
  schema: "./lib/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL ?? "",
  },
});

