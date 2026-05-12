import { test } from "node:test";
import assert from "node:assert/strict";

import { preserveExplicitIndonesianDate } from "../features/ai/date-correction.ts";

test("preserves explicit Indonesian weekday and date from the prompt", () => {
  const corrected = preserveExplicitIndonesianDate(
    {
      title: "rapat dengan Komisaris",
      startsAt: "2026-05-13T20:00:00+07:00",
      endsAt: "2026-05-13T21:00:00+07:00",
      kind: "event",
      hasExplicitTime: true,
      reasoning: "Waktu yang diminta di kemudian hari.",
    },
    "rapat dengan Komisaris jam 8 malam selasa tanggal 12",
    new Date("2026-05-12T09:00:00+07:00"),
    "Asia/Jakarta",
  );

  assert.equal(corrected.startsAt, "2026-05-12T20:00:00+07:00");
  assert.equal(corrected.endsAt, "2026-05-12T21:00:00+07:00");
});
