import { PDFDocument, StandardFonts } from "pdf-lib";
import { recoverRestore } from "../scripts/init-data.mjs";
import { rename } from "node:fs/promises";
import { confirmStep } from "../lib/interview.ts";
import test from "node:test";
import assert from "node:assert/strict";
import {
  mkdtemp,
  readFile,
  writeFile,
  chmod,
  rm,
  mkdir,
} from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { zipSync, unzipSync } from "fflate";
import { initialiseData } from "../scripts/init-data.mjs";
import { readJSON, writeJSON } from "../lib/storage-backend.ts";
import { writeSecret, vault } from "../lib/vault.ts";
import { consumeResponseStream, runAI, parseAIJSON } from "../lib/providers.ts";
import {
  startSearch,
  waitForSearch,
  normaliseOpportunity,
  canonicalJobURL,
} from "../lib/search.ts";
import { importEvidence, confirmEvidence } from "../lib/import-evidence.ts";
import { backupBytes, validateBackup, restoreBackup } from "../lib/backups.ts";
import { callCareerTool, authorisedMCP } from "../lib/mcp.ts";
import { publicAddress, checkedPublicURL } from "../lib/public-url.ts";
import { quietNow } from "../lib/background.ts";
import type { Settings } from "../lib/career.ts";
const stream = (events: any[]) =>
  new ReadableStream<Uint8Array>({
    start(controller) {
      const value = events
        .map((v) => "data: " + JSON.stringify(v) + "\n\n")
        .join("");
      for (let i = 0; i < value.length; i += 7)
        controller.enqueue(new TextEncoder().encode(value.slice(i, i + 7)));
      controller.close();
    },
  });
const completed = (value: unknown) => [
  { type: "response.output_text.delta", delta: JSON.stringify(value) },
  { type: "response.completed", response: {} },
];
test("completed inference is required and usage exhaustion does not produce a partial result", async () => {
  assert.deepEqual(
    JSON.parse(await consumeResponseStream(stream(completed({ ok: true })))),
    { ok: true },
  );
  await assert.rejects(
    () =>
      consumeResponseStream(
        stream([{ type: "response.output_text.delta", delta: '{"ok":true}' }]),
      ),
    /before completion/,
  );
  await assert.rejects(
    () =>
      consumeResponseStream(
        stream([
          { type: "response.output_text.delta", delta: "partial" },
          {
            type: "response.failed",
            response: {
              error: { code: "subscription_sharing_usage_limit_exceeded" },
            },
          },
        ]),
      ),
    /allowance/,
  );
  assert.throws(() => parseAIJSON("not a JSON result"));
});
test("public URL restrictions reject local and private destinations", async () => {
  for (const ip of [
    "127.0.0.1",
    "10.1.2.3",
    "192.168.1.1",
    "169.254.169.254",
    "::1",
    "fc00::1",
    "::ffff:127.0.0.1",
  ])
    assert.equal(publicAddress(ip), false, ip);
  assert.equal(publicAddress("8.8.8.8"), true);
  await assert.rejects(() => checkedPublicURL("http://example.com"));
  await assert.rejects(() => checkedPublicURL("https://localhost"));
  assert.equal(
    canonicalJobURL("https://EXAMPLE.COM/job/1/?utm_source=x&jobid=2#apply"),
    "https://example.com/job/1?jobid=2",
  );
});
test("career flows use isolated records and preserve review, deduplication and backup boundaries", async (t) => {
  const folder = await mkdtemp(join(tmpdir(), "career-flows-")),
    data = join(folder, "workspace"),
    runtime = join(folder, "runtime"),
    oldEnv = { ...process.env },
    originalFetch = globalThis.fetch,
    marker = crypto.randomUUID();
  await initialiseData(data, process.cwd());
  await mkdir(runtime, { recursive: true });
  Object.assign(process.env, {
    DATA_DIRECTORY: data,
    DATA_BACKEND: "local",
    CW_RUNTIME_DIRECTORY: runtime,
    CW_MCP_TOKEN: "test-" + marker,
  });
  async function change(path: string, fn: (value: any) => any) {
    const r = await readJSON(path);
    await writeJSON(path, fn(r.data), r.sha, "test");
  }
  let lastInput: unknown;
  let output: any = { ok: true },
    requestCount = 0;
  globalThis.fetch = async (input, init) => {
    const url = String(input);
    if (url === "https://api.openai.com/v1/models")
      return Response.json({
        models: [
          {
            slug: "test-model",
            display_name: "Temporary model",
            visibility: "list",
          },
        ],
      });
    if (url === "https://api.openai.com/v1/responses") {
      requestCount++;
      const body = JSON.parse(String(init?.body));
      lastInput = body.input[0].content;
      assert.equal(body.store, false);
      assert.equal(body.stream, true);
      return new Response(stream(completed(output)), {
        headers: { "Content-Type": "text/event-stream" },
      });
    }
    throw new Error("No real network access is permitted in this test.");
  };
  try {
    await writeSecret("chatgpt-session", {
      clientId: "temporary-client",
      accessToken: "test-" + marker,
      refreshToken: "",
      idToken: "",
      expiresAt: Date.now() + 3600000,
      scope: "chatgpt.tokens.use.direct",
      subject: marker,
      email: "",
      name: "",
    });
    await t.test(
      "sharing permission is required before inference",
      async () => {
        await assert.rejects(() => runAI("check"), /sharing|Allow/);
        assert.equal(requestCount, 0);
        await change("data/settings.json", (s) => ({
          ...s,
          provider: "chatgpt",
          privacy: { allowAI: true, backgroundAI: false },
        }));
        assert.deepEqual(parseAIJSON(await runAI("check")), { ok: true });
      },
    );
    await t.test(
      "imported evidence remains a draft until explicitly confirmed",
      async () => {
        output = {
          cv: {
            name: marker,
            headline: "A verified source headline",
            summary: "Supplied factual evidence",
            skills: ["A supplied skill"],
            experience: [],
            education: [],
            projects: [],
            languages: [],
            language: "en",
          },
          uncertainties: ["Dates were not supplied"],
        };
        await importEvidence({
          text: "A source document with explicit facts. " + marker,
        });
        assert.equal((await readJSON("career/cv.json")).data.name, "");
        assert.ok((await readJSON("data/journey.json")).data.draft);
        await confirmEvidence();
        assert.equal((await readJSON("career/cv.json")).data.name, marker);
        assert.equal(
          (await readJSON("data/profile.json")).data.identity.name,
          marker,
        );
        assert.equal((await readJSON("data/journey.json")).data.draft, null);
      },
    );
    await t.test(
      "PDF evidence text is extracted locally before the reviewed AI draft",
      async () => {
        const pdf = await PDFDocument.create(),
          page = pdf.addPage(),
          font = await pdf.embedFont(StandardFonts.Helvetica);
        page.drawText(
          marker +
            " supplied evidence for a career profile. The source describes verified responsibilities and achievements without inferring preferences.",
          { x: 20, y: 700, size: 10, font },
        );
        output = {
          cv: {
            name: marker,
            summary: "Explicit source evidence",
            language: "en",
          },
          uncertainties: [],
        };
        const draft = await importEvidence({
          file: { name: "Source.pdf", bytes: await pdf.save() },
        });
        assert.equal(draft.source.name, "Source.pdf");
        assert.equal(typeof lastInput, "string");
        assert.ok(String(lastInput).includes(marker));
        assert.ok(draft.source.path.startsWith("assets/evidence/"));
        await change("data/journey.json", (j) => ({ ...j, draft: null }));
      },
    );
    await t.test(
      "actual search flow saves valid jobs once and preserves existing decisions",
      async () => {
        await change("data/profile.json", (p) => ({
          ...p,
          direction: { targets: "User-supplied target" },
          search: { locations: "User-supplied region" },
        }));
        await change("data/journey.json", (j) => ({
          ...j,
          confirmed: ["evidence", "direction", "constraints"],
        }));
        output = {
          opportunities: [
            {
              company: "Temporary organisation " + marker,
              title: "Temporary role",
              source: "https://employer.invalid/job/" + marker,
              fit: "Supported by supplied evidence",
              gaps: "Requirements need checking",
              summary: "Temporary vacancy data",
              assessment: "Worth a look",
            },
          ],
        };
        await startSearch("calibration");
        await waitForSearch();
        let w = (await readJSON("data/workspace.json")).data;
        assert.equal(w.opportunities.length, 1);
        assert.equal(w.opportunities[0].listingStatus, "Unverified");
        const id = w.opportunities[0].id;
        await assert.rejects(() => confirmStep("calibration"), /both interest/);
        await change("data/journey.json", (j) => ({
          ...j,
          calibration: [
            {
              id,
              interest: "Interested",
              accuracy: "Accurate",
              reason: "Explicit review",
            },
          ],
        }));
        await confirmStep("calibration");
        await change("data/workspace.json", (w) => {
          w.opportunities[0].stage = "Shortlisted";
          w.opportunities[0].notes = marker;
          return w;
        });
        await startSearch("manual");
        await waitForSearch();
        w = (await readJSON("data/workspace.json")).data;
        assert.equal(w.opportunities.length, 1);
        assert.equal(w.opportunities[0].id, id);
        assert.equal(w.opportunities[0].stage, "Shortlisted");
        assert.equal(w.opportunities[0].notes, marker);
      },
    );
    await t.test(
      "the MCP connector cannot access arbitrary records or change sharing permissions",
      async () => {
        assert.equal(authorisedMCP("Bearer test-" + marker), true);
        assert.equal(authorisedMCP("Bearer other"), false);
        await assert.rejects(() =>
          callCareerTool("career_read", { record: "../credentials" }),
        );
        await assert.rejects(() =>
          callCareerTool("career_edit", { record: "settings", edits: [] }),
        );
        const result: any = await callCareerTool("career_read", {
          record: "profile",
        });
        assert.equal(
          JSON.parse(result.content[0].text).data.identity.name,
          marker,
        );
      },
    );
    await t.test(
      "backup restoration validates integrity and preserves the complete workspace",
      async () => {
        const bytes = await backupBytes(),
          entries = validateBackup(bytes);
        assert.ok(entries["career/cv.json"]);
        assert.ok(
          !Object.keys(entries).some((p) => /credential|runtime/.test(p)),
        );
        const corrupt = unzipSync(bytes);
        corrupt["data/profile.json"] = new TextEncoder().encode("{}");
        assert.throws(() => validateBackup(zipSync(corrupt)), /checksum/);
        const malicious = unzipSync(bytes);
        malicious["../outside.txt"] = new TextEncoder().encode(marker);
        assert.throws(
          () => validateBackup(zipSync(malicious)),
          /unsafe|unsupported/,
        );
        await change("data/profile.json", (p) => ({
          ...p,
          identity: { ...p.identity, name: "Changed " + marker },
        }));
        await restoreBackup(bytes);
        assert.equal(
          (await readJSON("data/profile.json")).data.identity.name,
          marker,
        );
        assert.equal(
          (await readJSON("data/workspace.json")).data.opportunities[0].stage,
          "Shortlisted",
        );
      },
    );
    await t.test(
      "interrupted folder replacement recovers the previous workspace before seeding",
      async () => {
        const previous = data + ".before-" + marker,
          staging = data + ".restore-" + marker;
        await mkdir(staging);
        await writeFile(
          data + ".restore-journal.json",
          JSON.stringify({ root: data, previous, staging }),
        );
        await rename(data, previous);
        await recoverRestore(data);
        assert.equal(
          (await readJSON("data/profile.json")).data.identity.name,
          marker,
        );
      },
    );
    await t.test("quiet hours use the selected timezone", async () => {
      const s = (await readJSON<Settings>("data/settings.json")).data;
      s.timezone = "Europe/Berlin";
      assert.equal(quietNow(s, new Date("2026-12-01T23:00:00Z")), true);
      assert.equal(quietNow(s, new Date("2026-12-01T14:00:00Z")), false);
    });
  } finally {
    globalThis.fetch = originalFetch;
    for (const name of [
      "DATA_DIRECTORY",
      "DATA_BACKEND",
      "CW_RUNTIME_DIRECTORY",
      "CW_MCP_TOKEN",
    ])
      if (oldEnv[name] === undefined) delete process.env[name];
      else process.env[name] = oldEnv[name];
    await vault("delete", "chatgpt-session");
    await rm(folder, { recursive: true, force: true });
  }
});
test(
  "Claude subscription runner protocol completes through the unmodified CLI interface",
  { skip: process.platform === "win32" },
  async () => {
    const folder = await mkdtemp(join(tmpdir(), "career-claude-")),
      data = join(folder, "workspace"),
      oldEnv = { ...process.env },
      binary = join(folder, "claude");
    try {
      await initialiseData(data, process.cwd());
      Object.assign(process.env, {
        DATA_DIRECTORY: data,
        DATA_BACKEND: "local",
        CW_RUNTIME_DIRECTORY: join(folder, "runtime"),
        CW_CLAUDE_BINARY: binary,
      });
      const record = await readJSON("data/settings.json");
      await writeJSON(
        "data/settings.json",
        {
          ...record.data,
          provider: "claude",
          privacy: { allowAI: true, backgroundAI: false },
        },
        record.sha,
        "test",
      );
      await writeFile(
        binary,
        '#!/usr/bin/env node\nif(process.argv.includes("auth")){console.log(JSON.stringify({authMethod:"claude.ai",email:""}));}else{let input="";process.stdin.on("data",d=>input+=d);process.stdin.on("end",()=>{if(!process.argv.includes("--restricted")||process.argv.includes("Bash"))process.exit(2);console.log(JSON.stringify({type:"result",is_error:false,result:JSON.stringify({ok:true})}));});}\n',
      );
      await chmod(binary, 0o755);
      assert.deepEqual(parseAIJSON(await runAI("A harmless protocol check")), {
        ok: true,
      });
    } finally {
      for (const name of [
        "DATA_DIRECTORY",
        "DATA_BACKEND",
        "CW_RUNTIME_DIRECTORY",
        "CW_CLAUDE_BINARY",
      ])
        if (oldEnv[name] === undefined) delete process.env[name];
        else process.env[name] = oldEnv[name];
      await rm(folder, { recursive: true, force: true });
    }
  },
);
