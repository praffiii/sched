import { readFileSync } from "node:fs";
import { test } from "node:test";
import assert from "node:assert/strict";

test("calendar day matching does not timezone-shift local UI columns", () => {
  const layout = readFileSync("features/calendar/lib/layout.ts", "utf8");

  assert.doesNotMatch(
    layout,
    /const targetKey = dateKey\(day, timezone\)/,
    "eventsOnDay must not format local day-column dates in a timezone that can shift midnight into another calendar day",
  );
});

test("calendar day matching compares event dates in the calendar timezone", () => {
  const layout = readFileSync("features/calendar/lib/layout.ts", "utf8");

  assert.doesNotMatch(
    layout,
    /void _timezone/,
    "eventsOnDay must use the supplied calendar timezone when grouping event timestamps",
  );
  assert.match(
    layout,
    /dateKey\(new Date\(e\.startsAt\), timezone\)/,
    "eventsOnDay must compare event timestamps by their date in the calendar timezone",
  );
});
