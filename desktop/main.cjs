"use strict";
const {
  app,
  BrowserWindow,
  Menu,
  Tray,
  nativeImage,
  ipcMain,
  shell,
  Notification,
  safeStorage,
  utilityProcess,
  powerMonitor,
} = require("electron");
const fs = require("node:fs/promises");
const path = require("node:path");
const os = require("node:os");
const http = require("node:http");
const net = require("node:net");
const { randomBytes, timingSafeEqual } = require("node:crypto");
app.setName("Career Workshop");
const smoke = process.argv.includes("--smoke-test");
const appDirectory =
  smoke && process.env.CW_APP_DIRECTORY
    ? process.env.CW_APP_DIRECTORY
    : path.join(app.getPath("appData"), "Career Workshop");
app.setPath("userData", appDirectory);
const runtime = path.join(appDirectory, "runtime"),
  dataDirectory = path.join(appDirectory, "workspace");
if (process.argv.includes("--mcp")) {
  require("../mcp/bridge.cjs").start({
    connectionPath: path.join(runtime, "connection.json"),
    onClose: () => app.exit(0),
  });
  app.on("window-all-closed", (event) => event?.preventDefault?.());
} else {
  let window,
    tray,
    server,
    bridge,
    origin = "",
    quitting = false,
    finishing = false,
    closeTarget = "",
    prefs = { background: false, startAtLogin: false },
    vaultValues = {};
  const bridgeToken = randomBytes(32).toString("base64url");
  const packaged = app.isPackaged,
    root = packaged ? process.resourcesPath : path.resolve(__dirname, ".."),
    serverRoot = packaged
      ? path.join(root, "server")
      : path.join(root, ".next", "standalone");
  if (!app.requestSingleInstanceLock()) app.quit();
  else {
    app.on("second-instance", () => show());
    const equals = (a, b) => {
      const x = Buffer.from(a || ""),
        y = Buffer.from(b || "");
      return x.length === y.length && timingSafeEqual(x, y);
    };
    const secure = () =>
      safeStorage.isAsyncEncryptionAvailable
        ? safeStorage.isAsyncEncryptionAvailable()
        : Promise.resolve(safeStorage.isEncryptionAvailable());
    const encrypt = (v) =>
      safeStorage.encryptStringAsync
        ? safeStorage.encryptStringAsync(v)
        : Promise.resolve(safeStorage.encryptString(v));
    const decrypt = async (v) =>
      safeStorage.decryptStringAsync
        ? (await safeStorage.decryptStringAsync(v)).result
        : safeStorage.decryptString(v);
    async function writeAtomic(file, value) {
      await fs.mkdir(path.dirname(file), { recursive: true, mode: 0o700 });
      await fs.writeFile(file + ".tmp", value, { mode: 0o600 });
      await fs.rename(file + ".tmp", file);
    }
    async function loadVault() {
      try {
        const bytes = await fs.readFile(
          path.join(appDirectory, "credentials.enc"),
        );
        if (!(await secure())) throw new Error("Credential store unavailable.");
        vaultValues = JSON.parse(await decrypt(bytes));
      } catch (error) {
        if (error.code !== "ENOENT")
          throw new Error(
            "The operating-system credential store could not be unlocked.",
          );
      }
    }
    let vaultQueue = Promise.resolve();
    async function handleVault(body) {
      if (!(await secure()))
        throw new Error("Operating-system encryption is unavailable.");
      if (!/^[a-z][a-z0-9-]{0,80}$/.test(body.name))
        throw new Error("Invalid credential name.");
      if (body.action === "get")
        return { value: vaultValues[body.name] ?? null };
      if (body.action === "set") {
        if (typeof body.value !== "string" || body.value.length > 200000)
          throw new Error("Invalid credential.");
        vaultValues[body.name] = body.value;
      } else if (body.action === "delete") delete vaultValues[body.name];
      else throw new Error("Invalid credential action.");
      const payload = JSON.stringify(vaultValues);
      vaultQueue = vaultQueue.then(async () =>
        writeAtomic(
          path.join(appDirectory, "credentials.enc"),
          await encrypt(payload),
        ),
      );
      await vaultQueue;
      return { value: null };
    }
    function notify(title, body) {
      if (!Notification.isSupported()) return;
      const note = new Notification({
        title: String(title).slice(0, 150),
        body: String(body).slice(0, 500),
        silent: false,
      });
      note.on("click", () => show());
      note.show();
    }
    async function startBridge() {
      bridge = http.createServer(async (req, res) => {
        try {
          if (
            req.method !== "POST" ||
            !equals(req.headers.authorization, "Bearer " + bridgeToken)
          ) {
            res.writeHead(403);
            return res.end();
          }
          let text = "";
          for await (const part of req) {
            text += part;
            if (text.length > 250000) throw new Error("Request too large.");
          }
          const body = JSON.parse(text);
          let result = {};
          if (req.url === "/vault") result = await handleVault(body);
          else if (req.url === "/native") {
            if (body.action === "notify") notify(body.title, body.body);
            else if (body.action === "preferences") {
              prefs = {
                background: !!body.background,
                startAtLogin: !!body.startAtLogin,
              };
              if (["win32", "darwin"].includes(process.platform))
                app.setLoginItemSettings({
                  openAtLogin: prefs.startAtLogin,
                  args: ["--background"],
                });
              updateMenu();
            } else throw new Error("Invalid native action.");
          } else throw new Error("Unknown action.");
          res.writeHead(200, { "Content-Type": "application/json" });
          res.end(JSON.stringify(result));
        } catch {
          res.writeHead(503, { "Content-Type": "application/json" });
          res.end(
            JSON.stringify({ error: "The desktop service is unavailable." }),
          );
        }
      });
      await new Promise((r) => bridge.listen(0, "127.0.0.1", r));
      return "http://127.0.0.1:" + bridge.address().port;
    }
    async function freePort() {
      const listener = net.createServer();
      await new Promise((r) => listener.listen(0, "127.0.0.1", r));
      const port = listener.address().port;
      await new Promise((r) => listener.close(r));
      return port;
    }
    async function localAPI(endpoint, body) {
      const response = await fetch(origin + endpoint, {
        method: body ? "POST" : "GET",
        headers: { "Content-Type": "application/json", Origin: origin },
        ...(body ? { body: JSON.stringify(body) } : {}),
      });
      if (!response.ok)
        throw new Error("The application is not ready for this action.");
      return response.json();
    }
    function show() {
      if (!window || window.isDestroyed()) createWindow();
      else {
        window.show();
        window.focus();
      }
    }
    async function finishQuit() {
      if (finishing) return;
      finishing = true;
      try {
        if (origin)
          await fetch(origin + "/api/background", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Origin: origin,
              "X-Career-Desktop": bridgeToken,
            },
            body: JSON.stringify({ action: "shutdown" }),
            signal: AbortSignal.timeout(15000),
          });
      } catch {}
      quitting = true;
      app.quit();
    }
    function requestClose(quitApp) {
      if (quitting) return;
      if (
        !window ||
        window.isDestroyed() ||
        window.webContents.isLoadingMainFrame()
      ) {
        void finishQuit();
        return;
      }
      closeTarget = quitApp ? "quit" : "hide";
      window.webContents.send("cw:before-close");
    }
    ipcMain.handle("cw:close-ready", (_event, ok) => {
      if (!closeTarget) return;
      if (!ok) {
        closeTarget = "";
        show();
        notify(
          "Changes need attention",
          "Review pending edits before closing the workspace.",
        );
        return;
      }
      const action = closeTarget;
      closeTarget = "";
      if (action === "hide") window.hide();
      else void finishQuit();
    });
    function updateMenu() {
      if (!tray) return;
      tray.setContextMenu(
        Menu.buildFromTemplate([
          { label: "Open Career Workshop", click: show },
          {
            label: "Search for jobs now",
            click: () =>
              localAPI("/api/search", { action: "start" }).catch((e) =>
                notify("Search needs attention", e.message),
              ),
          },
          {
            label: "Pause or resume discovery",
            click: async () => {
              try {
                const r = await fetch(
                  origin + "/api/records?path=data/settings.json",
                ).then((v) => v.json());
                await fetch(origin + "/api/records", {
                  method: "PUT",
                  headers: {
                    "Content-Type": "application/json",
                    Origin: origin,
                  },
                  body: JSON.stringify({
                    path: "data/settings.json",
                    edits: [
                      {
                        path: ["routine", "enabled"],
                        before: r.data.routine.enabled,
                        value: !r.data.routine.enabled,
                      },
                    ],
                  }),
                });
              } catch {
                notify(
                  "Career Workshop",
                  "Open Settings to change the search routine.",
                );
              }
            },
          },
          { type: "separator" },
          { label: "Quit Career Workshop", click: () => requestClose(true) },
        ]),
      );
    }
    function createWindow() {
      window = new BrowserWindow({
        width: 1280,
        height: 840,
        minWidth: 760,
        minHeight: 580,
        show: false,
        title: "Career Workshop",
        backgroundColor: "#f6f7f9",
        webPreferences: {
          preload: path.join(__dirname, "preload.cjs"),
          contextIsolation: true,
          nodeIntegration: false,
          sandbox: true,
        },
      });
      window.loadURL(origin);
      window.once("ready-to-show", () => {
        if (!smoke) window.show();
      });
      window.webContents.setWindowOpenHandler(({ url }) => {
        if (/^https:\/\//.test(url)) shell.openExternal(url);
        return { action: "deny" };
      });
      window.webContents.on("will-navigate", (event, url) => {
        if (new URL(url).origin !== origin) {
          event.preventDefault();
          if (/^https:\/\//.test(url)) shell.openExternal(url);
        }
      });
      window.on("close", (event) => {
        if (!quitting) {
          event.preventDefault();
          requestClose(!prefs.background);
        }
      });
    }
    async function configureMcp(provider) {
      if (!["chatgpt", "claude"].includes(provider))
        throw new Error("Unknown provider.");
      const command = process.execPath,
        args = packaged ? ["--mcp"] : [path.resolve(__dirname, ".."), "--mcp"];
      if (provider === "claude") {
        const base =
          process.platform === "darwin"
            ? path.join(
                os.homedir(),
                "Library",
                "Application Support",
                "Claude",
              )
            : process.platform === "win32"
              ? path.join(process.env.APPDATA || "", "Claude")
              : path.join(os.homedir(), ".config", "Claude");
        const file = path.join(base, "claude_desktop_config.json");
        let settings = {};
        try {
          settings = JSON.parse(await fs.readFile(file, "utf8"));
        } catch (e) {
          if (e.code !== "ENOENT")
            throw new Error(
              "The existing Claude configuration needs review; it was not changed.",
            );
        }
        settings.mcpServers ??= {};
        if (
          settings.mcpServers["career-workshop"] &&
          settings.mcpServers["career-workshop"].command !== command
        )
          throw new Error(
            "An existing Career Workshop connector needs review before replacement.",
          );
        settings.mcpServers["career-workshop"] = { command, args };
        await writeAtomic(file, JSON.stringify(settings, null, 2) + "\n");
      } else {
        const file = path.join(os.homedir(), ".codex", "config.toml");
        let text = "";
        try {
          text = await fs.readFile(file, "utf8");
        } catch (e) {
          if (e.code !== "ENOENT") throw e;
        }
        if (text.includes("career-workshop"))
          return {
            message:
              "A Career Workshop entry already exists. Review it in ChatGPT desktop Settings → MCP servers.",
          };
        text +=
          "\n[mcp_servers.career-workshop]\ncommand = " +
          JSON.stringify(command) +
          "\nargs = " +
          JSON.stringify(args) +
          "\n";
        await writeAtomic(file, text);
      }
      return {
        message:
          "Connection installed. Restart the AI desktop application, select Career Workshop, and ask it to read the profile.",
      };
    }
    ipcMain.handle("cw:info", () => ({
      version: app.getVersion(),
      dataDirectory,
      background: prefs.background,
      platform: process.platform,
    }));
    ipcMain.handle("cw:open-external", async (_event, value) => {
      const url = new URL(String(value));
      if (url.protocol !== "https:")
        throw new Error("Only HTTPS links can be opened.");
      await shell.openExternal(url.href);
    });
    ipcMain.handle("cw:open-data", () => shell.openPath(dataDirectory));
    ipcMain.handle("cw:configure-mcp", (_event, p) => configureMcp(p));
    ipcMain.handle("cw:notifications", () => {
      notify(
        "Career Workshop",
        "Notifications are enabled for jobs and reminders. Change them in Settings.",
      );
      return { supported: Notification.isSupported() };
    });
    ipcMain.handle("cw:quit", () => requestClose(true));
    async function nativeAcceptance() {
      if (window.webContents.isLoadingMainFrame())
        await new Promise((resolve, reject) => {
          window.webContents.once("did-finish-load", resolve);
          window.webContents.once("did-fail-load", () =>
            reject(new Error("Native page failed to load.")),
          );
        });
      for (let n = 0; n < 100; n++) {
        if (
          await window.webContents.executeJavaScript(
            "!!document.querySelector('[aria-label=\"Main navigation\"]')",
          )
        )
          break;
        await new Promise((r) => setTimeout(r, 100));
      }
      const info = await window.webContents.executeJavaScript(
        "window.careerDesktop.info()",
      );
      if (info.dataDirectory !== dataDirectory)
        throw new Error("Preload data path mismatch.");
      if (
        !(await window.webContents.executeJavaScript(
          "!!document.querySelector('[role=\"dialog\"]')",
        ))
      )
        throw new Error("Empty onboarding was not rendered.");
      await handleVault({
        action: "set",
        name: "smoke-check",
        value: "temporary-encryption-check",
      });
      await loadVault();
      if (
        (await handleVault({ action: "get", name: "smoke-check" })).value !==
        "temporary-encryption-check"
      )
        throw new Error("OS credential round trip failed.");
      await handleVault({ action: "delete", name: "smoke-check" });
      const screenshot = await window.webContents.capturePage();
      await fs.writeFile(
        path.join(appDirectory, "native-smoke.png"),
        screenshot.toPNG(),
      );
      await fs.writeFile(
        path.join(appDirectory, "smoke-result.json"),
        JSON.stringify({
          ok: true,
          platform: process.platform,
          arch: process.arch,
          preload: true,
          onboarding: true,
          encryptedCredentials: true,
        }),
      );
      await finishQuit();
    }
    app
      .whenReady()
      .then(async () => {
        await fs.mkdir(runtime, { recursive: true, mode: 0o700 });
        const { initialiseData } = await import("../scripts/init-data.mjs");
        await initialiseData(
          dataDirectory,
          packaged ? path.join(root, "starter") : path.resolve(__dirname, ".."),
        );
        await loadVault();
        const bridgeURL = await startBridge(),
          port = await freePort();
        origin = "http://127.0.0.1:" + port;
        const mcpToken = randomBytes(32).toString("base64url");
        await writeAtomic(
          path.join(runtime, "connection.json"),
          JSON.stringify({ origin, token: mcpToken }),
        );
        let helper = "";
        const executable =
          process.platform === "win32" ? "claude.exe" : "claude";
        for (const candidate of [
          path.join(root, "helpers", executable),
          path.join(
            root,
            "node_modules",
            "@anthropic-ai",
            "claude-code-" + process.platform + "-" + process.arch,
            executable,
          ),
          path.join(
            root,
            "node_modules",
            "@anthropic-ai",
            "claude-code",
            "cli.js",
          ),
        ]) {
          try {
            await fs.access(candidate);
            helper = candidate;
            break;
          } catch {}
        }
        server = utilityProcess.fork(path.join(serverRoot, "server.js"), [], {
          cwd: serverRoot,
          stdio: "pipe",
          env: {
            ...process.env,
            HOSTNAME: "127.0.0.1",
            PORT: String(port),
            DATA_BACKEND: "local",
            APP_RUNTIME: "local",
            DATA_DIRECTORY: dataDirectory,
            CW_RUNTIME_DIRECTORY: runtime,
            CW_MCP_TOKEN: mcpToken,
            CW_SERVER_ACTIVE: "1",
            CW_SECRET_BRIDGE: bridgeURL,
            CW_DESKTOP_TOKEN: bridgeToken,
            ...(helper ? { CW_CLAUDE_BINARY: helper } : {}),
            NEXT_TELEMETRY_DISABLED: "1",
          },
        });
        server.stdout?.on("data", () => {});
        server.stderr?.on("data", () => {});
        let ready = false;
        for (let attempt = 0; attempt < 120; attempt++) {
          try {
            const response = await fetch(origin + "/api/app");
            if (response.ok) {
              ready = true;
              break;
            }
          } catch {}
          await new Promise((r) => setTimeout(r, 250));
        }
        if (!ready) throw new Error("The local application could not start.");
        const image = nativeImage.createFromPath(
          packaged
            ? path.join(
                root,
                "branding",
                process.platform === "darwin" ? "trayTemplate.png" : "icon.png",
              )
            : path.join(
                root,
                "assets",
                "app",
                process.platform === "darwin" ? "trayTemplate.png" : "icon.png",
              ),
        );
        if (process.platform === "darwin") image.setTemplateImage(true);
        tray = new Tray(
          process.platform === "darwin"
            ? image
            : image.resize({ width: 32, height: 32 }),
        );
        tray.setToolTip("Career Workshop");
        tray.on("double-click", show);
        updateMenu();
        powerMonitor.on("resume", () =>
          localAPI("/api/background", { action: "tick" }).catch(() => {}),
        );
        if (!process.argv.includes("--background") || smoke) createWindow();
        if (smoke) await nativeAcceptance();
      })
      .catch(async (error) => {
        if (smoke) {
          await fs
            .writeFile(
              path.join(appDirectory, "smoke-result.json"),
              JSON.stringify({ ok: false, error: error.message }),
            )
            .catch(() => {});
          server?.kill();
          bridge?.close();
          app.exit(1);
        } else {
          require("electron").dialog.showErrorBox(
            "Career Workshop could not start",
            error.message,
          );
          void finishQuit();
        }
      });
    app.on("before-quit", (event) => {
      if (!quitting) {
        event.preventDefault();
        requestClose(true);
        return;
      }
      server?.kill();
      bridge?.close();
    });
    app.on("activate", () => {
      if (origin) show();
    });
    app.on("window-all-closed", () => {
      if (!prefs.background) app.quit();
    });
  }
}
