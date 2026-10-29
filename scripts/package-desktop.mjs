import { build, Platform, Arch } from "electron-builder";
import {
  readFile,
  mkdir,
  cp,
  writeFile,
  access,
  copyFile,
  readdir,
} from "node:fs/promises";
import { join } from "node:path";
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
execFileSync(process.execPath, ["scripts/audit.mjs"], { stdio: "inherit" });
const root = process.cwd(),
  pkg = JSON.parse(await readFile("package.json", "utf8")),
  stage = join(root, ".desktop-app");
await mkdir(stage, { recursive: true });
for (const directory of ["desktop", "mcp"])
  await cp(directory, join(stage, directory), { recursive: true });
await mkdir(join(stage, "scripts"), { recursive: true });
await copyFile("scripts/init-data.mjs", join(stage, "scripts/init-data.mjs"));
await writeFile(
  join(stage, "package.json"),
  JSON.stringify(
    {
      name: "career-workshop-desktop",
      productName: "Career Workshop",
      version: pkg.version,
      description: pkg.description,
      main: "desktop/main.cjs",
      author: "Career Workshop contributors",
      license: "MIT",
    },
    null,
    2,
  ),
);
const architecture = process.argv.includes("--arm64")
    ? "arm64"
    : process.argv.includes("--x64")
      ? "x64"
      : process.arch,
  executable = process.platform === "win32" ? "claude.exe" : "claude",
  helper = join(
    root,
    "node_modules",
    "@anthropic-ai",
    "claude-code-" + process.platform + "-" + architecture,
    executable,
  );
await access(helper);
const resources = [
  { from: join(root, "assets/app"), to: "branding" },
  { from: helper, to: "helpers/" + executable },
  {
    from: join(root, "node_modules/@anthropic-ai/claude-code/LICENSE.md"),
    to: "helpers/CLAUDE-CODE-LICENSE.md",
  },
];
for (const directory of ["data", "career", "config", "assets"])
  resources.push({ from: join(root, directory), to: "starter/" + directory });
for (const name of ["LICENSE", "NOTICE", "README.md"])
  resources.push({ from: join(root, name), to: name });
const target =
    process.platform === "darwin"
      ? Platform.MAC
      : process.platform === "win32"
        ? Platform.WINDOWS
        : Platform.LINUX,
  targets = target.createTarget(
    process.argv.includes("--dir")
      ? "dir"
      : process.platform === "darwin"
        ? ["dmg", "zip"]
        : process.platform === "win32"
          ? ["nsis", "zip"]
          : ["AppImage"],
    architecture === "arm64" ? Arch.arm64 : Arch.x64,
  );
await build({
  projectDir: stage,
  targets,
  config: {
    appId: "org.careerworkshop.desktop",
    productName: "Career Workshop",
    electronVersion: pkg.devDependencies.electron.replace(/^[^0-9]+/, ""),
    artifactName: "Career-Workshop-${version}-${os}-${arch}.${ext}",
    directories: {
      output: join(root, "artifacts"),
      buildResources: join(root, "assets/app"),
    },
    files: ["desktop/**", "mcp/**", "scripts/init-data.mjs", "package.json"],
    extraResources: resources,
    afterPack: async context => {
      // Preserve the standalone dependency tree; the packager's default copy
      // filters exclude nested node_modules from extraResources.
      const destination=join(context.packager.getResourcesDir(context.appOutDir),'server');
      await cp(join(root,'.next/standalone'),destination,{recursive:true,dereference:true,filter:source=>!source.split(/[\\/]/).some(part=>part.startsWith('.env')||part==='credentials.enc'||part.endsWith('.log'))});
      await access(join(destination,'node_modules/next/package.json'));
    },
    asar: true,
    mac: {
      category: "public.app-category.productivity",
      identity: null,
      icon: join(root, "assets/app/icon.png"),
    },
    win: { icon: join(root, "assets/app/icon.png") },
    linux: { category: "Office", icon: join(root, "assets/app/icon.png") },
    nsis: {
      oneClick: false,
      perMachine: false,
      allowElevation: false,
      allowToChangeInstallationDirectory: true,
      deleteAppDataOnUninstall: false,
    },
  },
});
const sums = [];
for (const name of (await readdir("artifacts")).filter((n) =>
  /\.(exe|dmg|zip|AppImage)$/.test(n),
)) {
  const bytes = await readFile(join("artifacts", name));
  sums.push(createHash("sha256").update(bytes).digest("hex") + "  " + name);
}
await writeFile("artifacts/SHA256SUMS", sums.join("\n") + "\n");
console.log("Native desktop packages prepared.");
