import { readFileSync } from "node:fs";
import * as validators from "../lib/compiled-schemas.mjs";
const mapping = JSON.parse(readFileSync("config/record-schemas.json", "utf8"));
for (const [path, schema] of Object.entries(mapping)) {
  const value = JSON.parse(readFileSync(path, "utf8")),
    validate = validators[schema.replaceAll("-", "_")];
  if (!validate(value))
    throw Error(path + ": " + JSON.stringify(validate.errors));
}
const workspace = JSON.parse(readFileSync("data/workspace.json", "utf8")),
  ids = new Set(workspace.opportunities.map((o) => o.id));
for (const key of ["opportunities", "tasks", "activity"])
  if (new Set(workspace[key].map((v) => v.id)).size !== workspace[key].length)
    throw Error("Duplicate stable IDs in " + key);
for (const task of workspace.tasks)
  if (task.opportunityId && !ids.has(task.opportunityId))
    throw Error("An action refers to a missing opportunity.");
console.log("Career record schemas and references passed.");
