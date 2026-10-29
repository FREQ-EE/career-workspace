import { mkdtemp, cp, access, rm, copyFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { spawn } from "node:child_process";
// Vinext writes Next-compatible route types under .next. Preserve the native
// build's generated types so the two supported builds can share a checkout.
const folder = await mkdtemp(join(tmpdir(), "career-build-types-")),
  saved = [];
for (const name of [".next/types", "next-env.d.ts"]) {
  try {
    await access(name);
    await cp(name, join(folder, name), { recursive: true });
    saved.push(name);
  } catch {}
}
try {
  const child = spawn(
    process.execPath,
    [resolve("node_modules/vite/bin/vite.js"), "build"],
    { stdio: "inherit", env: process.env },
  );
  const code = await new Promise((r, j) => {
    child.on("error", j);
    child.on("exit", r);
  });
  if (code !== 0) process.exitCode = code || 1;
} finally {
  for (const name of saved) {
    await rm(name, { recursive: true, force: true });
    await cp(join(folder, name), name, { recursive: true });
  }
  await rm(folder, { recursive: true, force: true });
}
