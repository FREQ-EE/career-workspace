import { execFileSync } from "node:child_process";
import {
  readFileSync,
  readdirSync,
  writeFileSync,
  mkdirSync,
  existsSync,
  realpathSync,
  statSync,
} from "node:fs";
import { join } from "node:path";
import { zipSync, strToU8, unzipSync } from "fflate";
import { createHash } from "node:crypto";
execFileSync(process.execPath, ["scripts/audit.mjs"], { stdio: "inherit" });
const root = process.cwd(),
  pkg = JSON.parse(readFileSync("package.json", "utf8")),
  excluded = new Set([
    "node_modules",
    ".git",
    ".next",
    "dist",
    "releases",
    ".wrangler",
    "artifacts",
    ".desktop-app",
    "playwright-report",
    "test-results",
  ]);
function safe(name) {
  return (
    !excluded.has(name) &&
    (!name.startsWith(".env") || name === ".env.example") &&
    !name.startsWith(".dev.vars") &&
    !/\.(log|tsbuildinfo|tmp)$/.test(name) &&
    name !== "data-lock"
  );
}
function files(
  directory,
  prefix = "",
  filter = safe,
  linkRoot = "",
  ancestors = [],
) {
  const real = realpathSync(directory);
  if (ancestors.includes(real)) throw Error("Archive link cycle.");
  const result = {};
  for (const item of readdirSync(directory, { withFileTypes: true })) {
    if (!filter(item.name)) continue;
    const path = join(directory, item.name),
      key = prefix + item.name;
    let directoryEntry = item.isDirectory();
    if (item.isSymbolicLink()) {
      if (!linkRoot || !realpathSync(path).startsWith(linkRoot + "/"))
        throw Error("An archive cannot include an external link: " + key);
      directoryEntry = statSync(path).isDirectory();
    }
    if (directoryEntry)
      Object.assign(
        result,
        files(path, key + "/", filter, linkRoot, [...ancestors, real]),
      );
    else result[key] = new Uint8Array(readFileSync(path));
  }
  return result;
}
mkdirSync("releases", { recursive: true });
const outputs = [];
function save(suffix, entries) {
  for (const key of Object.keys(entries)) {
    if (
      key
        .split("/")
        .some(
          (part) =>
            part === ".git" ||
            (part.startsWith(".env") && part !== ".env.example") ||
            part === "credentials.enc",
        )
    )
      throw Error("Unsafe archive path " + key);
    if (/\.(js|mjs|json|map|ts|tsx)$/.test(key)) {
      const text = new TextDecoder().decode(entries[key]);
      if (text.includes(root))
        entries[key] = strToU8(text.replaceAll(root, "/app/career-workspace"));
    }
  }
  const filename = "career-workspace-" + suffix + ".zip",
    bytes = zipSync(entries, { level: 6 });
  const check = unzipSync(bytes);
  for (const path of ["data/workspace.json", "career/cv.json"])
    if (check[path]) {
      const data = JSON.parse(new TextDecoder().decode(check[path]));
      if (
        (path.includes("workspace") && data.opportunities.length) ||
        (path.includes("cv.json") && data.name)
      )
        throw Error("Personal records entered an archive.");
    }
  writeFileSync("releases/" + filename, bytes);
  outputs.push({
    filename,
    bytes: bytes.length,
    sha256: createHash("sha256").update(bytes).digest("hex"),
  });
}
save("source", files(root));
if (existsSync(".next/standalone/server.js")) {
  const entries = {
    ...files(
      join(root, ".next/standalone"),
      "",
      (n) =>
        (!n.startsWith(".env") || n === ".env.example") &&
        !/\.(log|tmp)$/.test(n) &&
        n !== ".git" &&
        n !== "artifacts" &&
        n !== "credentials.enc",
      realpathSync(".next/standalone"),
    ),
  };
  for (const directory of ["data", "career", "config", "assets"])
    Object.assign(entries, files(join(root, directory), directory + "/"));
  for (const file of ["LICENSE", "NOTICE"])
    entries[file] = new Uint8Array(readFileSync(file));
  entries["RUN.md"] = strToU8(
    "Contributor server archive. Requires Node.js 24 or newer. For ordinary use install a native desktop package from Releases. Configure DATA_DIRECTORY to a separate copy of the included data folders, HOSTNAME=127.0.0.1 and PORT=3000, then run node server.js. Credentials are never part of this archive.\n",
  );
  save("local", entries);
}
if (existsSync("dist/server/index.js"))
  save("sites", {
    ...files(join(root, "dist"), "dist/"),
    ".openai/hosting.json": new Uint8Array(
      readFileSync(".openai/hosting.json"),
    ),
    "DEPLOYMENT.md": strToU8(
      "Optional private Worker compatibility build. Configure a new owner-private hosting identity and remote record backend. Desktop-only capabilities require the installed local application. See source documentation.\n",
    ),
  });
writeFileSync(
  "releases/SHA256SUMS",
  outputs.map((o) => o.sha256 + "  " + o.filename).join("\n") + "\n",
);
console.log(JSON.stringify(outputs, null, 2));
