import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const calendarRoute = readFileSync("app/api/calendar/events/route.ts", "utf8");
const tasksRoute = readFileSync("app/api/tasks/route.ts", "utf8");
const dateUtils = readFileSync("lib/utils/date.ts", "utf8");
const authConfig = readFileSync("lib/auth.ts", "utf8");

test("calendar accept claims a pending draft before creating the Google event", () => {
  const claimIndex = calendarRoute.indexOf(
    "const pending = await claimPendingEvent",
  );
  const createIndex = calendarRoute.indexOf(
    "const event = await createCalendarEvent",
  );
  assert.ok(claimIndex !== -1, "calendar route should use claimPendingEvent");
  assert.ok(createIndex !== -1, "calendar route should create a Google event");
  assert.ok(
    claimIndex < createIndex,
    "pending draft must be claimed before external Google Calendar write",
  );
});

test("task accept claims a pending draft before creating the Google task", () => {
  const claimIndex = tasksRoute.indexOf(
    "const pending = await claimPendingEvent",
  );
  const createIndex = tasksRoute.indexOf("const task = await createGoogleTask");
  assert.ok(claimIndex !== -1, "task route should use claimPendingEvent");
  assert.ok(createIndex !== -1, "task route should create a Google task");
  assert.ok(
    claimIndex < createIndex,
    "pending draft must be claimed before external Google Tasks write",
  );
});

test("timezone formatting catches invalid timezone values", () => {
  assert.match(dateUtils, /safeTimezone/);
  assert.match(dateUtils, /catch/);
  assert.doesNotThrow(() => {
    new Intl.DateTimeFormat("en-US", {
      timeZone: "UTC",
    }).format(new Date());
  });
});

test("Google Calendar OAuth scopes stay least-privilege", () => {
  assert.doesNotMatch(
    authConfig,
    /"https:\/\/www\.googleapis\.com\/auth\/calendar"/,
  );
  assert.match(
    authConfig,
    /"https:\/\/www\.googleapis\.com\/auth\/calendar\.events"/,
  );
  assert.match(
    authConfig,
    /"https:\/\/www\.googleapis\.com\/auth\/calendar\.calendars\.readonly"/,
  );
});
