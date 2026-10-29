import { spawn } from "node:child_process";
import { mkdtemp, cp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { createServer } from "node:net";
import assert from "node:assert/strict";
import { request as httpRequest } from "node:http";
const root = process.cwd(),
  data = await mkdtemp(join(tmpdir(), "career-http-"));
for (const folder of ["data", "career", "config", "assets"])
  await cp(join(root, folder), join(data, folder), { recursive: true });
const isolatedServer = join(data, "server");
await cp(resolve(".next/standalone"), isolatedServer, {
  recursive: true,
  dereference: true,
});
const socket = createServer();
await new Promise((r) => socket.listen(0, "127.0.0.1", r));
const port = socket.address().port;
await new Promise((r) => socket.close(r));
const url = "http://127.0.0.1:" + port,
  token = "local-" + crypto.randomUUID();
let logs = "";
const server = spawn(
  process.execPath,
  [process.env.TEST_SERVER_ENTRY || join(isolatedServer, "server.js")],
  {
    cwd: isolatedServer,
    env: {
      ...process.env,
      HOSTNAME: "127.0.0.1",
      PORT: String(port),
      DATA_BACKEND: "local",
      DATA_DIRECTORY: data,
      APP_RUNTIME: "local",
      APP_PASSWORD: "",
      CW_MCP_TOKEN: token,
      CW_SERVER_ACTIVE: "0",
      NEXT_TELEMETRY_DISABLED: "1",
    },
    stdio: ["ignore", "pipe", "pipe"],
  },
);
server.stdout.on("data", (v) => (logs += v));
server.stderr.on("data", (v) => (logs += v));
async function call(path, method = "GET", body, origin = url, extra = {}) {
  const response = await fetch(url + path, {
    method,
    headers: {
      ...(body ? { "Content-Type": "application/json", Origin: origin } : {}),
      ...extra,
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  let result;
  try {
    result = await response.json();
  } catch {
    result = null;
  }
  return { status: response.status, result };
}
try {
  let ready = false;
  for (let n = 0; n < 160; n++) {
    try {
      if ((await fetch(url + "/api/app")).ok) {
        ready = true;
        break;
      }
    } catch {}
    await new Promise((r) => setTimeout(r, 100));
  }
  assert.ok(ready, logs.slice(-3000));
  const invalidHost = await new Promise((resolve, reject) => {
    const req = httpRequest(
      url + "/api/app",
      { headers: { Host: "invalid.example" } },
      (r) => {
        r.resume();
        resolve(r.statusCode);
      },
    );
    req.on("error", reject);
    req.end();
  });
  assert.equal(invalidHost, 403);
  const html = await (await fetch(url)).text();
  assert.ok(html.includes("Career Workshop"));
  const initial = await call("/api/app");
  assert.equal(initial.status, 200);
  assert.equal(initial.result.records.cv.data.schemaVersion, 2);
  assert.deepEqual(initial.result.records.workspace.data.opportunities, []);
  const marker = "check-" + crypto.randomUUID(),
    before = initial.result.records.workspace.revision,
    workspace = initial.result.records.workspace.data;
  workspace.activity.push({
    id: crypto.randomUUID(),
    text: marker,
    at: new Date().toISOString(),
    kind: "test",
  });
  assert.equal(
    (await call("/api/workspace", "POST", { workspace, revision: before }))
      .status,
    200,
  );
  assert.equal(
    (await call("/api/workspace", "POST", { workspace, revision: before }))
      .status,
    409,
  );
  assert.equal(
    (await call("/api/workspace")).result.workspace.activity[0].text,
    marker,
  );
  assert.equal(
    (
      await call(
        "/api/workspace",
        "POST",
        { workspace, revision: before },
        "https://invalid.example",
      )
    ).status,
    403,
  );
  assert.equal((await call("/api/records?path=.env.local")).status, 400);
  assert.equal(
    (
      await call("/api/records", "PUT", {
        path: "data/settings.json",
        data: {},
        revision: initial.result.records.settings.revision,
      })
    ).status,
    400,
  );
  assert.equal(
    (
      await call("/api/records?path=data/profile.json", "PUT", {
        edits: [
          { path: ["identity", "headline"], before: undefined, value: marker },
        ],
      })
    ).status,
    200,
  );
  assert.equal(
    (await call("/api/records?path=data/profile.json")).result.data.identity
      .headline,
    marker,
  );
  assert.equal(
    (await call("/api/cv", "POST", { variantId: "", photo: false })).status,
    400,
  );
  const source = await call("/api/cv");
  const cv = source.result.cv;
  cv.name = marker;
  cv.headline = marker;
  cv.summary = marker;
  assert.equal(
    (await call("/api/cv", "PUT", { cv, revision: source.result.revision }))
      .status,
    200,
  );
  const pdf = await fetch(url + "/api/cv", {
    method: "POST",
    headers: { "Content-Type": "application/json", Origin: url },
    body: JSON.stringify({ variantId: "", photo: false }),
  });
  assert.equal(
    pdf.status,
    200,
    await (pdf.status !== 200 ? pdf.text() : Promise.resolve("")),
  );
  assert.equal(
    new TextDecoder().decode((await pdf.arrayBuffer()).slice(0, 4)),
    "%PDF",
  );
  assert.ok(pdf.headers.get("X-Career-Document"));
  assert.equal(
    (
      await call("/api/mcp", "POST", {
        jsonrpc: "2.0",
        id: 1,
        method: "tools/list",
      })
    ).status,
    401,
  );
  const tools = await call(
    "/api/mcp",
    "POST",
    { jsonrpc: "2.0", id: 1, method: "tools/list" },
    url,
    { Authorization: "Bearer " + token },
  );
  assert.equal(tools.status, 200);
  assert.ok(tools.result.result.tools.some((t) => t.name === "career_read"));
  const read = await call(
    "/api/mcp",
    "POST",
    {
      jsonrpc: "2.0",
      id: 2,
      method: "tools/call",
      params: { name: "career_read", arguments: { record: "profile" } },
    },
    url,
    { Authorization: "Bearer " + token },
  );
  assert.equal(
    JSON.parse(read.result.result.content[0].text).data.identity.headline,
    marker,
  );
  const backup = await fetch(url + "/api/backup");
  assert.equal(backup.status, 200);
  assert.ok((await backup.arrayBuffer()).byteLength > 1000);
  assert.equal(
    (await call("/api/search", "POST", { action: "start" })).status,
    400,
  );
  const feedback = await call("/api/feedback", "POST", {
    title: marker,
    body: "A temporary test report",
    diagnostics: true,
  });
  assert.equal(feedback.status, 200);
  assert.equal(feedback.result.posted, false);
  assert.ok(
    feedback.result.url.startsWith(
      "https://github.com/FREQ-EE/career-workspace/issues/new",
    ),
  );
  console.log(
    "Production HTTP: empty startup, durable writes, conflict handling, schemas, origin controls, generic CV PDF, MCP authentication and complete backup passed.",
  );
} finally {
  server.kill("SIGTERM");
  await new Promise((r) => server.once("exit", r));
  await rm(data, { recursive: true, force: true });
}
