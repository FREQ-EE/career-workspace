import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { spawn } from "node:child_process";
import { initialiseData } from "./init-data.mjs";
const folder = await mkdtemp(join(tmpdir(), "career-ui-")),
  data = join(folder, "workspace");
await initialiseData(data, process.cwd());
const server = spawn(
  process.execPath,
  [resolve(".next/standalone/server.js")],
  {
    env: {
      ...process.env,
      HOSTNAME: "127.0.0.1",
      PORT: "4173",
      DATA_DIRECTORY: data,
      DATA_BACKEND: "local",
      APP_RUNTIME: "local",
      CW_RUNTIME_DIRECTORY: join(folder, "runtime"),
      CW_SERVER_ACTIVE: "0",
      NEXT_TELEMETRY_DISABLED: "1",
    },
    stdio: "inherit",
  },
);
let closing = false;
async function close() {
  if (closing) return;
  closing = true;
  server.kill();
  await new Promise((r) => server.once("exit", r));
  await rm(folder, { recursive: true, force: true });
  process.exit(0);
}
process.on("SIGINT", close);
process.on("SIGTERM", close);
server.on("exit", async (code) => {
  if (!closing) {
    await rm(folder, { recursive: true, force: true });
    process.exit(code ?? 1);
  }
});
