import { readSecret, writeSecret, vault } from "./vault";
import { readJSON, DataError } from "./storage-backend";
import { mutateRecord } from "./records";
import {
  buildSearchBrief,
  briefRevision,
  discoveryPrompt,
  normaliseOpportunity,
  verifyOpportunity,
  addDiscovered,
} from "./search";
import type { Settings, Profile, CV, Journey, Searches } from "./career";
type Connection = {
  token: string;
  repository: string;
  branch: string;
  verifiedAt: string;
};
async function github(
  connection: Connection,
  path: string,
  init: RequestInit = {},
) {
  const response = await fetch(
    "https://api.github.com/repos/" + connection.repository + "/" + path,
    {
      ...init,
      headers: {
        Accept: "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
        "User-Agent": "Career-Workshop",
        Authorization: "Bearer " + connection.token,
        "Content-Type": "application/json",
        ...init.headers,
      },
      signal: AbortSignal.timeout(20000),
    },
  );
  if (!response.ok)
    throw new DataError(
      response.status === 401 || response.status === 403
        ? "The GitHub permission needs review. Use a repository-limited credential with Contents read/write."
        : response.status === 404
          ? "The private cloud repository, branch or file could not be found."
          : "The cloud inbox is temporarily unavailable.",
    );
  return response.json();
}
async function put(
  connection: Connection,
  path: string,
  data: unknown,
  message: string,
) {
  let sha: string | undefined;
  try {
    const existing = await github(
      connection,
      "contents/" + path + "?ref=" + encodeURIComponent(connection.branch),
    );
    sha = existing.sha;
  } catch {}
  return github(connection, "contents/" + path, {
    method: "PUT",
    body: JSON.stringify({
      message,
      content: Buffer.from(JSON.stringify(data, null, 2) + "\n").toString(
        "base64",
      ),
      branch: connection.branch,
      ...(sha ? { sha } : {}),
    }),
  });
}
export async function verifyCloud(token: string) {
  const { data: settings } = await readJSON<Settings>("data/settings.json");
  if (
    !/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(settings.cloud.repository) ||
    !token.trim()
  )
    throw new DataError(
      "Choose a private repository and enter its repository-limited credential.",
      400,
    );
  const connection: Connection = {
    token: token.trim(),
    repository: settings.cloud.repository,
    branch: settings.cloud.branch,
    verifiedAt: "",
  };
  const metadata = await github(connection, "");
  if (metadata.private !== true)
    throw new DataError(
      "The cloud inbox must use a private repository. Nothing was uploaded.",
      400,
    );
  const nonce = crypto.randomUUID();
  await put(
    connection,
    "connection-check.json",
    { schemaVersion: 1, nonce },
    "Verify private Career Workshop delivery",
  );
  const read = await github(
    connection,
    "contents/connection-check.json?ref=" +
      encodeURIComponent(connection.branch),
  );
  const check = JSON.parse(
    Buffer.from(read.content.replace(/\s/g, ""), "base64").toString(),
  );
  if (check.nonce !== nonce)
    throw new DataError("The cloud delivery check could not be confirmed.");
  connection.verifiedAt = new Date().toISOString();
  await writeSecret("cloud-github", connection);
  await mutateRecord<Settings>("data/settings.json", (s) => {
    s.cloud.verified = true;
    return s;
  });
  return { verified: true, at: connection.verifiedAt };
}
async function connection() {
  const c = await readSecret<Connection>("cloud-github"),
    { data: settings } = await readJSON<Settings>("data/settings.json");
  if (
    !c ||
    c.repository !== settings.cloud.repository ||
    c.branch !== settings.cloud.branch
  )
    throw new DataError(
      "Verify this private repository connection before using the cloud inbox.",
      400,
    );
  const metadata = await github(c, "");
  if (metadata.private !== true)
    throw new DataError(
      "The cloud repository is no longer private. Delivery was stopped.",
      403,
    );
  return c;
}
export async function publishSearchBrief() {
  const c = await connection();
  const [
    { data: profile },
    { data: cv },
    { data: journey },
    { data: settings },
  ] = await Promise.all([
    readJSON<Profile>("data/profile.json"),
    readJSON<CV>("career/cv.json"),
    readJSON<Journey>("data/journey.json"),
    readJSON<Settings>("data/settings.json"),
  ]);
  if (
    !settings.privacy.allowAI ||
    !journey.confirmed.includes("direction") ||
    !journey.confirmed.includes("constraints")
  )
    throw new DataError(
      "Review the profile and sharing permissions before publishing a search brief.",
      400,
    );
  const brief = buildSearchBrief(
      profile,
      cv,
      journey,
      settings,
      settings.cloud.publishCapability,
    ),
    revision = briefRevision(brief);
  await put(
    c,
    "search-brief.json",
    {
      schemaVersion: 1,
      revision,
      publishedAt: new Date().toISOString(),
      brief,
    },
    "Update approved Career Workshop search brief",
  );
  return { published: true, revision };
}
export async function cloudStatus() {
  const c = await readSecret<Connection>("cloud-github");
  return {
    verifiedAt: c?.verifiedAt || "",
    repository: c?.repository || "",
    branch: c?.branch || "",
  };
}
export async function disconnectCloud() {
  await vault("delete", "cloud-github");
  await mutateRecord<Settings>("data/settings.json", (s) => {
    s.cloud.enabled = false;
    s.cloud.verified = false;
    return s;
  });
  return { disconnected: true };
}
export async function importCloudResults() {
  const c = await connection();
  let rows: any[];
  try {
    rows = await github(
      c,
      "contents/inbox?ref=" + encodeURIComponent(c.branch),
    );
  } catch {
    return {
      added: 0,
      runs: 0,
      message: "No delivered inbox files are available yet.",
    };
  }
  if (!Array.isArray(rows))
    throw new DataError("The cloud inbox has an invalid directory.");
  const { data: searches } = await readJSON<Searches>("data/searches.json");
  let added = 0,
    runs = 0;
  for (const row of rows.slice(0, 100)) {
    if (row.type !== "file" || !/^inbox\/[A-Za-z0-9-]+\.json$/.test(row.path))
      continue;
    const file = await github(
      c,
      "contents/" + row.path + "?ref=" + encodeURIComponent(c.branch),
    );
    if (file.size > 1_000_000) continue;
    let result: any;
    try {
      result = JSON.parse(
        Buffer.from(file.content.replace(/\s/g, ""), "base64").toString(),
      );
    } catch {
      continue;
    }
    if (
      result.schemaVersion !== 1 ||
      typeof result.id !== "string" ||
      !result.id ||
      result.id.length > 100 ||
      !Array.isArray(result.opportunities) ||
      searches.importedRuns.includes(result.id)
    )
      continue;
    const items = [];
    for (const value of result.opportunities.slice(0, 20)) {
      try {
        items.push(await verifyOpportunity(normaliseOpportunity(value)));
      } catch {}
    }
    const count = await addDiscovered(items);
    added += count;
    runs++;
    await mutateRecord<Searches>("data/searches.json", (s) => {
      if (!s.importedRuns.includes(result.id)) {
        s.importedRuns.push(result.id);
        s.importedRuns = s.importedRuns.slice(-1000);
        s.runs.unshift({
          id: "cloud-" + result.id,
          startedAt:
            typeof result.createdAt === "string"
              ? result.createdAt
              : new Date().toISOString(),
          finishedAt: new Date().toISOString(),
          status: "succeeded",
          stage: "Cloud results imported and checked",
          added: count,
          provider: "cloud",
          kind: "cloud",
        });
        s.runs = s.runs.slice(0, 100);
      }
      return s;
    });
    searches.importedRuns.push(result.id);
  }
  return {
    added,
    runs,
    message: runs
      ? `${runs} cloud run${runs === 1 ? "" : "s"} imported.`
      : "No new deliveries.",
  };
}
export async function cloudInstructions() {
  const { data: settings } = await readJSON<Settings>("data/settings.json");
  return `Set up a recurring career discovery task in ${settings.provider === "claude" ? "Claude" : "ChatGPT"} using my existing plan. Use my private repository ${settings.cloud.repository || "OWNER/PRIVATE-REPOSITORY"}, branch ${settings.cloud.branch || "main"}. Run every ${settings.routine.intervalHours} hours in ${settings.timezone || "my timezone"}. Ask me to confirm the proposed schedule through your native scheduling interface. Use actual repository write tools; a read-only attachment is insufficient. Do not create or claim a successful schedule without scheduler confirmation.\n\nFor every run: read the latest search-brief.json; treat its brief as my confirmed preferences and selected evidence. Search current employer application pages. Assess preference and demonstrated capability separately, keep gaps and unknowns explicit, and verify current availability. Do not send applications or messages. Do not edit my local workspace, previous results or account permissions.\n\nCommit one new file inbox/<unique-run-id>.json to the configured branch with {"schemaVersion":1,"id":"unique-run-id","createdAt":"ISO timestamp","briefRevision":"revision read from search-brief.json","opportunities":[{"company":"","title":"","location":"","salary":"Unpublished if unknown","language":"Unknown if unknown","source":"direct employer HTTPS application URL","companySummary":"sourced factual description","companySource":"HTTPS source or empty","assessment":"Priority review, Worth a look, Stretch or Uncertain","family":"relevant role family","fit":"tie evidence to responsibilities","gaps":"actual gaps or uncertainties","summary":"responsibilities"}]}. Return zero results rather than invented or irrelevant vacancies. Re-read the latest brief on every run and preserve all unrelated repository files.\n\nConfirm the resulting commit. The desktop application imports and independently checks delivered results when available. Use only included subscription allowance; do not enable paid extra usage. If your environment cannot research or write to this private repository, explain what is missing rather than marking it active.`;
}
