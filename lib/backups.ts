import {
  readFile,
  readdir,
  mkdir,
  writeFile,
  rename,
  rm,
  open,
  unlink,
} from "node:fs/promises";
import { join, resolve, dirname, sep } from "node:path";
import { zipSync, unzipSync, strToU8 } from "fflate";
import { createHash } from "node:crypto";
import { config } from "./runtime";
import { DataError, backend } from "./storage-backend";
import { validateRecord } from "./validation";
import mapping from "../config/record-schemas.json";
const limit = 64 * 1024 * 1024;
function directory() {
  if (backend() !== "local")
    throw new DataError(
      "Complete backup and restore require the local workspace.",
      400,
    );
  return config("DATA_DIRECTORY") || process.cwd();
}
function allowed(path: string) {
  return (
    Object.hasOwn(mapping, path) ||
    (/^(assets\/(cv|evidence)|applications\/generated)\/[A-Za-z0-9_./-]+$/.test(
      path,
    ) &&
      !path
        .split("/")
        .some((p) => p === ".." || p === "." || p.startsWith(".")))
  );
}
async function snapshotBytes() {
  const root = directory(),
    entries: Record<string, Uint8Array> = {};
  let size = 0;
  async function walk(path: string, prefix = "") {
    for (const e of await readdir(path, { withFileTypes: true })) {
      if (e.isSymbolicLink())
        throw new DataError("A workspace link cannot be backed up safely.");
      const key = prefix + e.name;
      if (e.isDirectory()) {
        if (
          ["data", "career", "config", "assets", "applications"].includes(
            key,
          ) ||
          /^(assets|applications)\//.test(key)
        )
          await walk(join(path, e.name), key + "/");
      } else if (allowed(key)) {
        const bytes = new Uint8Array(await readFile(join(path, e.name)));
        size += bytes.length;
        if (size > limit)
          throw new DataError(
            "The complete backup exceeds 64 MB. Copy large evidence documents separately.",
            413,
          );
        if (Object.hasOwn(mapping, key))
          validateRecord(key, JSON.parse(new TextDecoder().decode(bytes)));
        entries[key] = bytes;
      }
    }
  }
  await walk(root);
  for (const path of Object.keys(mapping))
    if (!entries[path])
      throw new DataError(
        "A required record is missing; the backup was not created.",
      );
  const hashes = Object.fromEntries(
    Object.entries(entries).map(([path, bytes]) => [
      path,
      createHash("sha256").update(bytes).digest("hex"),
    ]),
  );
  entries["backup-manifest.json"] = strToU8(
    JSON.stringify({
      format: "career-workshop-backup",
      version: 2,
      createdAt: new Date().toISOString(),
      hashes,
    }),
  );
  return zipSync(entries, { level: 6 });
}
async function workspaceLock(root: string) {
  const lock = await open(join(root, "data-lock"), "wx", 0o600).catch(() => {
    throw new DataError(
      "The workspace is busy. Wait for saving or searching to finish before continuing.",
      409,
    );
  });
  await lock.writeFile(JSON.stringify({ pid: process.pid, at: Date.now() }));
  return lock;
}
export async function backupBytes() {
  const root = directory(),
    lock = await workspaceLock(root);
  try {
    return await snapshotBytes();
  } finally {
    await lock.close();
    await unlink(join(root, "data-lock")).catch(() => {});
  }
}
export function validateBackup(bytes: Uint8Array) {
  if (bytes.length > limit)
    throw new DataError("The backup exceeds 64 MB.", 413);
  let declared = 0;
  const entries = unzipSync(bytes, {
    filter: (file) => {
      declared += file.originalSize;
      if (declared > limit)
        throw new DataError("The expanded backup exceeds 64 MB.", 413);
      return true;
    },
  });
  const manifest = entries["backup-manifest.json"];
  if (!manifest)
    throw new DataError("This is not a complete Career Workshop backup.", 400);
  const meta = JSON.parse(new TextDecoder().decode(manifest));
  if (meta.format !== "career-workshop-backup" || meta.version !== 2)
    throw new DataError("This backup format is not supported.", 400);
  for (const [path, data] of Object.entries(entries)) {
    if (path === "backup-manifest.json") continue;
    if (!allowed(path) || path.startsWith("/") || path.includes("\\"))
      throw new DataError(
        "The backup contains an unsafe or unsupported path.",
        400,
      );
    if (meta.hashes?.[path] !== createHash("sha256").update(data).digest("hex"))
      throw new DataError("The backup checksum does not match.", 400);
    if (Object.hasOwn(mapping, path))
      validateRecord(path, JSON.parse(new TextDecoder().decode(data)));
  }
  for (const path of Object.keys(mapping))
    if (!entries[path])
      throw new DataError("The backup is missing required records.", 400);
  return entries;
}
export async function saveAutomaticBackup(locked = false) {
  const bytes = await (locked ? snapshotBytes() : backupBytes()),
    folder = join(dirname(directory()), "backups");
  await mkdir(folder, { recursive: true, mode: 0o700 });
  const name =
    "backup-" +
    new Date().toISOString().replace(/[:.]/g, "-") +
    "-" +
    crypto.randomUUID().slice(0, 8) +
    ".zip";
  await writeFile(join(folder, name), bytes, { mode: 0o600 });
  const files = (await readdir(folder))
    .filter((n) => /^backup-[A-Za-z0-9-]+\.zip$/.test(n))
    .sort()
    .reverse();
  for (const old of files.slice(10)) await unlink(join(folder, old));
  return { name, bytes: bytes.length };
}
export async function restoreBackup(bytes: Uint8Array) {
  const entries = validateBackup(bytes),
    root = directory(),
    previous = root + ".before-" + crypto.randomUUID(),
    staging = root + ".restore-" + crypto.randomUUID(),
    journal = root + ".restore-journal.json";
  const lock = await workspaceLock(root);
  (globalThis as any)[Symbol.for("career-workshop.restoring")] = true;
  let moved = false,
    installed = false;
  try {
    await saveAutomaticBackup(true);
    await mkdir(staging, { recursive: true, mode: 0o700 });
    for (const [path, data] of Object.entries(entries)) {
      if (path === "backup-manifest.json") continue;
      const target = resolve(staging, path);
      if (!target.startsWith(resolve(staging) + sep))
        throw new DataError("Unsafe backup path.", 400);
      await mkdir(dirname(target), { recursive: true, mode: 0o700 });
      await writeFile(target, data, { mode: 0o600 });
    }
    await writeFile(journal, JSON.stringify({ root, previous, staging }), {
      mode: 0o600,
    });
    await rename(root, previous);
    moved = true;
    await rename(staging, root);
    installed = true;
    return { restored: true };
  } finally {
    try {
      if (moved && !installed) await rename(previous, root);
      await lock.close();
      if (moved && installed)
        await rm(previous, { recursive: true, force: true });
      else await unlink(join(root, "data-lock")).catch(() => {});
      await rm(staging, { recursive: true, force: true });
      await unlink(journal).catch(() => {});
    } finally {
      (globalThis as any)[Symbol.for("career-workshop.restoring")] = false;
    }
  }
}
