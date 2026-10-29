import { spawn } from "node:child_process";
import { join, resolve } from "node:path";
import { mkdir, writeFile } from "node:fs/promises";
import { randomBytes } from "node:crypto";
import { applicationDirectory, initialiseData } from "./init-data.mjs";
const appDirectory = applicationDirectory(),
  directory = process.env.DATA_DIRECTORY || join(appDirectory, "workspace"),
  runtime = join(appDirectory, "runtime");
await initialiseData(directory, process.cwd());
await mkdir(runtime, { recursive: true, mode: 0o700 });
const port = process.env.PORT || "3000",
  token = randomBytes(32).toString("base64url");
await writeFile(
  join(runtime, "connection.json"),
  JSON.stringify({ origin: "http://127.0.0.1:" + port, token }),
  { mode: 0o600 },
);
const helper = join(
  process.cwd(),
  "node_modules",
  "@anthropic-ai",
  "claude-code-" + process.platform + "-" + process.arch,
  process.platform === "win32" ? "claude.exe" : "claude",
);
const dev = process.argv.includes("--dev"),
  args = dev
    ? [
        "node_modules/next/dist/bin/next",
        "dev",
        "--hostname",
        "127.0.0.1",
        "--port",
        port,
      ]
    : [".next/standalone/server.js"];
const child = spawn(process.execPath, args, {
  cwd: process.cwd(),
  stdio: "inherit",
  env: {
    ...process.env,
    DATA_DIRECTORY: resolve(directory),
    CW_RUNTIME_DIRECTORY: runtime,
    CW_MCP_TOKEN: token,
    CW_SERVER_ACTIVE: "1",
    CW_CLAUDE_BINARY: helper,
    HOSTNAME: "127.0.0.1",
    PORT: port,
    NEXT_TELEMETRY_DISABLED: "1",
  },
});
for (const signal of ["SIGINT", "SIGTERM"])
  process.on(signal, () => child.kill(signal));
child.on("exit", (code) => process.exit(code || 0));
