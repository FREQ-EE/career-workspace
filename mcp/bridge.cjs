"use strict";
const readline = require("node:readline");
const fs = require("node:fs/promises");
const path = require("node:path");
const os = require("node:os");
function runtimeDirectory() {
  const base =
    process.platform === "win32"
      ? process.env.APPDATA || path.join(os.homedir(), "AppData", "Roaming")
      : process.platform === "darwin"
        ? path.join(os.homedir(), "Library", "Application Support")
        : process.env.XDG_CONFIG_HOME || path.join(os.homedir(), ".config");
  return path.join(base, "Career Workshop", "runtime");
}
async function forward(message, connectionPath) {
  const { origin, token } = JSON.parse(
    await fs.readFile(connectionPath, "utf8"),
  );
  if (!/^http:\/\/127\.0\.0\.1:\d+$/.test(origin) || typeof token !== "string")
    throw new Error("Invalid local connection.");
  const response = await fetch(origin + "/api/mcp", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json, text/event-stream",
      Authorization: "Bearer " + token,
    },
    body: JSON.stringify(message),
    signal: AbortSignal.timeout(120000),
  });
  if (response.status === 202 || response.status === 204) return null;
  if (!response.ok)
    throw new Error(
      "Career Workshop is unavailable or this connection expired. Open the application and reconnect.",
    );
  return response.json();
}
function start(options = {}) {
  const connectionPath =
    options.connectionPath || path.join(runtimeDirectory(), "connection.json");
  const input = readline.createInterface({ input: process.stdin });
  let queue = Promise.resolve();
  input.on("line", (line) => {
    queue = queue.then(async () => {
      let message;
      try {
        if (line.length > 1_500_000) throw new Error("Request too large.");
        message = JSON.parse(line);
        const result = await forward(message, connectionPath);
        if (result) process.stdout.write(JSON.stringify(result) + "\n");
      } catch (error) {
        if (message?.id !== undefined)
          process.stdout.write(
            JSON.stringify({
              jsonrpc: "2.0",
              id: message.id,
              error: {
                code: -32603,
                message: error.message || "The local workspace is unavailable.",
              },
            }) + "\n",
          );
      }
    });
  });
  input.on("close", () => queue.finally(() => options.onClose?.()));
}
module.exports = { start, forward, runtimeDirectory };
if (require.main === module) start();
