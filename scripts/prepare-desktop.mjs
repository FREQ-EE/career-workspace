import { cp, mkdir, access } from "node:fs/promises";
import { join } from "node:path";
const root = process.cwd(),
  server = join(root, ".next", "standalone");
await access(join(server, "server.js"));
await mkdir(join(server, ".next"), { recursive: true });
await cp(join(root, ".next", "static"), join(server, ".next", "static"), {
  recursive: true,
});
await cp(join(root, "public"), join(server, "public"), { recursive: true });
const sharp = (await import("sharp")).default;
await mkdir("assets/app", { recursive: true });
const icon = Buffer.from(
  '<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024" viewBox="0 0 1024 1024"><rect x="36" y="36" width="952" height="952" rx="220" fill="#343c49"/><path d="M290 685V355h90v330zm174 0V475h90v210zm174 0V255h90v430z" fill="#fff"/><path d="m309 286 181-120 181 34" fill="none" stroke="#a7cdb7" stroke-width="30" stroke-linecap="round"/></svg>',
);
await sharp(icon).png().toFile("assets/app/icon.png");
const tray = Buffer.from(
  '<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32"><path d="M5 27V12h5v15zm9 0V17h5v10zm9 0V5h5v22z" fill="#000"/></svg>',
);
await sharp(tray).png().toFile("assets/app/trayTemplate.png");
console.log("Standalone server, static assets and desktop branding prepared.");
