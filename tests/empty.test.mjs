import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import * as validators from "../lib/compiled-schemas.mjs";
test("the public starter contains no profile, opportunity, document, calibration or connection", () => {
  if (process.env.ASSERT_EMPTY_STARTER !== "1") return;
  const read = (path) => JSON.parse(readFileSync(path, "utf8"));
  const workspace = read("data/workspace.json");
  assert.deepEqual(workspace, {
    schemaVersion: 1,
    opportunities: [],
    tasks: [],
    activity: [],
  });
  const cv = read("career/cv.json");
  assert.equal(cv.name, "");
  assert.deepEqual(cv.experience, []);
  assert.deepEqual(cv.variants, []);
  assert.ok(validators.cv(cv));
  assert.equal(read("data/settings.json").provider, "");
  assert.equal(read("data/settings.json").privacy.allowAI, false);
  assert.equal(read("data/journey.json").draft, null);
  assert.deepEqual(read("data/journey.json").calibration, []);
  assert.equal(read(".openai/hosting.json").project_id, undefined);
});
