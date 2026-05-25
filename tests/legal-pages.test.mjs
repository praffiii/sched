import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";

const REQUIRED_DISCLOSURES = [
  "Google login",
  "Google Calendar",
  "Google Tasks",
  "AI scheduling",
  "Data storage",
  "Deletion",
  "Contact",
];

async function readRoute(route) {
  return readFile(new URL(`../app/${route}/page.tsx`, import.meta.url), "utf8");
}

test("privacy page includes required data-use disclosures", async () => {
  const source = await readRoute("privacy");

  for (const disclosure of REQUIRED_DISCLOSURES) {
    assert.match(source, new RegExp(disclosure, "i"));
  }
});

test("terms page includes service and account-use terms", async () => {
  const source = await readRoute("terms");

  for (const phrase of [
    "Google account",
    "AI scheduling",
    "Google Calendar",
    "Google Tasks",
    "delete",
    "Contact",
  ]) {
    assert.match(source, new RegExp(phrase, "i"));
  }
});

test("Google sign-in card links to legal pages", async () => {
  const source = await readFile(
    new URL(
      "../features/auth/components/GoogleConnectCard.tsx",
      import.meta.url,
    ),
    "utf8",
  );

  assert.match(source, /href="\/privacy"/);
  assert.match(source, /href="\/terms"/);
});
