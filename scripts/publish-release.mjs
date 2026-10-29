import {
  readdir,
  readFile,
  writeFile,
  mkdir,
  copyFile,
} from "node:fs/promises";
import { join } from "node:path";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
const { version } = JSON.parse(await readFile("package.json", "utf8")),
  tag = "v" + version;
const files = [];
async function collect(root) {
  for (const item of await readdir(root, { withFileTypes: true })) {
    const path = join(root, item.name);
    if (item.isDirectory()) await collect(path);
    else if (/\.(exe|dmg|zip|AppImage)$/.test(item.name)) files.push(path);
  }
}
await collect("release-assets");
await mkdir("release-ready", { recursive: true });
const sums = [],
  uploads = [];
for (const source of files) {
  const name = source.split("/").at(-1),
    target = join("release-ready", name);
  if (uploads.includes(target)) throw new Error("Duplicate release filename.");
  await copyFile(source, target);
  sums.push(
    createHash("sha256")
      .update(await readFile(target))
      .digest("hex") +
      "  " +
      name,
  );
  uploads.push(target);
}
if (
  !files.some((p) => p.endsWith(".exe")) ||
  files.filter((p) => p.endsWith(".dmg")).length !== 2
)
  throw new Error("Windows and both Mac installers are required.");
await writeFile("release-ready/SHA256SUMS", sums.join("\n") + "\n");
uploads.push("release-ready/SHA256SUMS");
const gh = (args) => execFileSync("gh", args, { stdio: "inherit" });
let exists = true;
try {
  execFileSync("gh", ["release", "view", tag], { stdio: "ignore" });
} catch {
  exists = false;
}
if (!exists)
  gh([
    "release",
    "create",
    tag,
    "--target",
    process.env.RELEASE_SHA,
    "--title",
    "Career Workshop " + version + " · public preview",
    "--notes-file",
    "docs/release-notes.md",
    "--prerelease",
    ...uploads,
  ]);
else gh(["release", "upload", tag, "--clobber", ...uploads]);
