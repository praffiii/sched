import assert from "node:assert/strict";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { test } from "node:test";

import nextConfig from "../next.config.ts";

const projectRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);

test("Next config pins the project root for local workspace resolution", () => {
  assert.equal(nextConfig.turbopack?.root, projectRoot);
  assert.equal(nextConfig.outputFileTracingRoot, projectRoot);
});
