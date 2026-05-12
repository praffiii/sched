import { readFileSync } from "node:fs";
import { test } from "node:test";
import assert from "node:assert/strict";

test("AI generate response includes and applies the effective calendar timezone", () => {
  const route = readFileSync("app/api/ai/generate/route.ts", "utf8");
  const store = readFileSync("store/app-store.ts", "utf8");

  assert.match(
    route,
    /timezone:\s*effectiveTimezone/,
    "generate route must return the timezone used to create pending events",
  );
  assert.match(
    store,
    /calendarTimezone:\s*data\.timezone\s*\?\?\s*s\.calendarTimezone/,
    "store must render new pending events using the generate response timezone",
  );
});
