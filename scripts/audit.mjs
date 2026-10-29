import { readFileSync, readdirSync, existsSync } from "node:fs";
import assert from "node:assert/strict";
import { join } from "node:path";
const excluded = new Set([
  "node_modules",
  ".next",
  "dist",
  ".git",
  "releases",
  "artifacts",
  ".desktop-app",
  ".wrangler",
  ".vinext",
  "playwright-report",
  "test-results",
]);
const credential =
  /appgprj_[a-z0-9]+|oaiapp_[a-z0-9]{8,}|github_pat_[A-Za-z0-9_]{20,}|gh[pousr]_[A-Za-z0-9]{20,}/i;
const unrelated = new RegExp(
  [
    ["kit", "chen"],
    ["pan", "try"],
    ["reci", "pe"],
    ["ingre", "dient"],
  ]
    .map((v) => v.join(""))
    .join("|"),
  "i",
);
const specialised = new RegExp(
  [
    '"' + ["opera", "tions"].join("") + '"',
    ["ai", "enablement"].join("-"),
  ].join("|"),
  "i",
);
function scan(dir) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (excluded.has(entry.name)) continue;
    const path = join(dir, entry.name);
    if (entry.isSymbolicLink()) throw Error("Unexpected link " + path);
    if (entry.isDirectory()) scan(path);
    else {
      assert.ok(!credential.test(path), "Credential marker in path " + path);
      assert.ok(
        !entry.name.startsWith(".env") || entry.name === ".env.example",
        "Environment file in distribution " + path,
      );
      if (!/\.(ttf|png|jpg|webp|zip|ico|icns)$/.test(path)) {
        const text = readFileSync(path, "utf8");
        assert.ok(
          !credential.test(text),
          "Credential or inherited account marker in " + path,
        );
        assert.ok(
          !unrelated.test(text),
          "Unrelated domain material in " + path,
        );
        assert.ok(
          !specialised.test(text),
          "Inherited fixed career preset in " + path,
        );
      }
    }
  }
}
scan(".");
const read = (path) => JSON.parse(readFileSync(path, "utf8"));
assert.equal(read(".openai/hosting.json").project_id, undefined);
assert.deepEqual(read("data/workspace.json"), {
  schemaVersion: 1,
  opportunities: [],
  tasks: [],
  activity: [],
});
const cv = read("career/cv.json");
assert.equal(cv.schemaVersion, 2);
for (const key of ["name", "email", "phone", "location", "headline", "summary"])
  assert.equal(cv[key], "");
for (const key of [
  "experience",
  "education",
  "projects",
  "skills",
  "languages",
  "variants",
])
  assert.deepEqual(cv[key], []);
for (const [key, value] of Object.entries(read("data/profile.json")))
  if (key !== "schema_version") assert.equal(Object.keys(value).length, 0);
assert.equal(read("data/settings.json").provider, "");
assert.equal(read("data/settings.json").privacy.allowAI, false);
assert.equal(read("data/settings.json").privacy.backgroundAI, false);
assert.equal(read("data/settings.json").routine.enabled, false);
assert.equal(read("data/settings.json").cloud.enabled, false);
assert.equal(read("data/settings.json").cloud.repository, "");
assert.equal(read("data/journey.json").draft, null);
assert.deepEqual(read("data/journey.json").calibration, []);
assert.equal(read("data/journey.json").complete, false);
assert.deepEqual(read("data/documents.json").drafts, []);
assert.deepEqual(read("data/searches.json").runs, []);
assert.equal(read("config/discovery.json").enabled, false);
const content = read("data/site-content.json");
assert.equal(content.name, "");
assert.equal(content.direction, "");
assert.deepEqual(content.projects, []);
assert.ok(
  !existsSync("downloads"),
  "Obsolete archive directory must not be distributed.",
);
console.log(
  "Public source, account markers, empty records and distribution hygiene passed.",
);
