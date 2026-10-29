import {
  mkdir,
  readdir,
  copyFile,
  access,
  readFile,
  writeFile,
  rename,
  rm,
  unlink,
} from "node:fs/promises";
import { join, resolve, dirname } from "node:path";
import { homedir, platform } from "node:os";
export function applicationDirectory() {
  return (
    process.env.CW_APP_DIRECTORY ||
    join(
      platform() === "win32"
        ? process.env.APPDATA || join(homedir(), "AppData", "Roaming")
        : platform() === "darwin"
          ? join(homedir(), "Library", "Application Support")
          : process.env.XDG_CONFIG_HOME || join(homedir(), ".config"),
      "Career Workshop",
    )
  );
}
export async function recoverRestore(directory) {
  const journal = directory + ".restore-journal.json";
  let entry;
  try {
    entry = JSON.parse(await readFile(journal, "utf8"));
  } catch (error) {
    if (error.code === "ENOENT") return;
    throw new Error(
      "Workspace recovery needs attention. The existing files were preserved.",
    );
  }
  if (
    resolve(entry.root) !== resolve(directory) ||
    ![entry.previous, entry.staging].every(
      (p) =>
        typeof p === "string" &&
        dirname(resolve(p)) === dirname(resolve(directory)) &&
        p.startsWith(directory + "."),
    )
  )
    throw new Error("Invalid workspace recovery journal.");
  const exists = async (p) =>
    access(p).then(
      () => true,
      () => false,
    );
  if (!(await exists(directory))) {
    if (await exists(entry.previous)) await rename(entry.previous, directory);
    else
      throw new Error(
        "The original workspace is missing. Restore a complete backup before continuing.",
      );
  }
  await rm(entry.previous, { recursive: true, force: true });
  await rm(entry.staging, { recursive: true, force: true });
  await unlink(journal);
}
export async function initialiseData(directory, templates) {
  await recoverRestore(directory);
  if (resolve(directory) === resolve(templates))
    throw new Error("Personal data must be separate from installed source.");
  await mkdir(directory, { recursive: true, mode: 0o700 });
  async function seed(source, destination) {
    await mkdir(destination, { recursive: true, mode: 0o700 });
    for (const item of await readdir(source, { withFileTypes: true })) {
      if (item.isSymbolicLink())
        throw new Error("The starter contains an unexpected link.");
      const from = join(source, item.name),
        to = join(destination, item.name);
      if (item.isDirectory()) await seed(from, to);
      else {
        try {
          await copyFile(from, to, 1);
        } catch (error) {
          if (error.code !== "EEXIST") throw error;
        }
      }
    }
  }
  for (const name of ["data", "career", "config", "assets"])
    await seed(join(templates, name), join(directory, name));
  const cvPath = join(directory, "career", "cv.json"),
    old = JSON.parse(await readFile(cvPath, "utf8"));
  if (old.schemaVersion === 1) {
    const pick = (value) =>
      typeof value === "string"
        ? value
        : String(
            value?.en ||
              Object.values(value || {}).find((v) => typeof v === "string") ||
              "",
          );
    const language = old.studio?.language || "en",
      summary = Object.values(old.summaries || {})[0];
    const converted = {
      schemaVersion: 2,
      name: old.name || "",
      email: old.email || "",
      phone: old.phone || "",
      location: old.location || "",
      language,
      headline: pick(old.headlines),
      summary: pick(summary),
      skills: Array.isArray(old.skills)
        ? old.skills
        : old.skills?.[language] || [],
      languages: Array.isArray(old.languages)
        ? old.languages
        : old.languages?.[language] || [],
      experience: (old.experience || []).map((e) => ({
        ...e,
        id: e.id || crypto.randomUUID(),
        title: pick(e.title),
        bullets: Array.isArray(e.bullets)
          ? e.bullets
          : e.bullets?.[language] || [],
      })),
      education: (old.education || []).map((e) => ({
        ...e,
        id: e.id || crypto.randomUUID(),
        title: pick(e.title),
        detail: pick(e.detail),
      })),
      projects: (old.projects || []).map((e) => ({
        ...e,
        id: e.id || crypto.randomUUID(),
        detail: pick(e.detail),
      })),
      variants: [],
      reviewStatus: "Review migrated CV source",
      studio: { variantId: "", photo: false, opportunityId: "" },
    };
    const backup = join(dirname(directory), "migration-backups");
    await mkdir(backup, { recursive: true, mode: 0o700 });
    await copyFile(cvPath, join(backup, "cv-" + Date.now() + ".json"));
    await writeFile(
      cvPath + ".tmp",
      JSON.stringify(converted, null, 2) + "\n",
      { mode: 0o600 },
    );
    await rename(cvPath + ".tmp", cvPath);
  }
  const lock = join(directory, "data-lock");
  try {
    const text = await readFile(lock, "utf8");
    const prior = JSON.parse(text);
    try {
      process.kill(prior.pid, 0);
    } catch (error) {
      if (error.code === "ESRCH")
        await import("node:fs/promises").then((fs) => fs.unlink(lock));
    }
  } catch {}
}
