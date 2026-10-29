import { rm } from "node:fs/promises";
// A repeated Next build otherwise retains files copied by an earlier trace.
await rm(new URL("../.next/standalone", import.meta.url), {
  recursive: true,
  force: true,
});
