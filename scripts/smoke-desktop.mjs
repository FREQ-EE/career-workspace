import { spawn } from "node:child_process";
import { mkdtemp, rm, readdir, readFile, copyFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import assert from "node:assert/strict";
const folder = await mkdtemp(join(tmpdir(), "career-native-"));
async function executable(root) {
  for (const e of await readdir(root, { withFileTypes: true })) {
    const path = join(root, e.name);
    if (process.platform === "win32" && e.name === "Career Workshop.exe")
      return path;
    if (process.platform === "darwin" && e.name === "Career Workshop.app")
      return join(path, "Contents", "MacOS", "Career Workshop");
    if (e.isDirectory() && !e.name.endsWith(".app")) {
      const found = await executable(path);
      if (found) return found;
    }
  }
}
let child;
try {
  const path = await executable("artifacts");
  assert.ok(path, "An unpacked native application is required.");
  child = spawn(path, ["--smoke-test"], {
    env: { ...process.env, CW_APP_DIRECTORY: folder },
    stdio: "pipe",
  });
  let logs = "";
  child.stdout.on("data", (v) => (logs += v));
  child.stderr.on("data", (v) => (logs += v));
  const timer = setTimeout(() => child.kill("SIGKILL"), 90000);
  const code = await new Promise((resolve, reject) => {
    child.on("error", reject);
    child.on("exit", resolve);
  });
  clearTimeout(timer);
  let result;
  try {
    result = JSON.parse(
      await readFile(join(folder, "smoke-result.json"), "utf8"),
    );
  } catch {
    throw new Error("Native acceptance did not complete: " + logs.slice(-3000));
  }
  assert.equal(code, 0, JSON.stringify(result));
  assert.equal(result.ok, true, JSON.stringify(result));
  await copyFile(
    join(folder, "native-smoke.png"),
    join("artifacts", `native-smoke-${process.platform}-${process.arch}.png`),
  );
  console.log("Native acceptance passed:", JSON.stringify(result));
} finally {
  child?.kill();
  await rm(folder, { recursive: true, force: true });
}
