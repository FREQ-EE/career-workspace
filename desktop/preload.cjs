const { contextBridge, ipcRenderer } = require("electron");
contextBridge.exposeInMainWorld("careerDesktop", {
  onCloseRequested: (handler) => {
    const listener = async () => {
      let ok = false;
      try {
        await handler();
        ok = true;
      } catch {}
      await ipcRenderer.invoke("cw:close-ready", ok);
    };
    ipcRenderer.on("cw:before-close", listener);
    return () => ipcRenderer.removeListener("cw:before-close", listener);
  },
  info: () => ipcRenderer.invoke("cw:info"),
  openExternal: (url) => ipcRenderer.invoke("cw:open-external", url),
  openData: () => ipcRenderer.invoke("cw:open-data"),
  configureMcp: (provider) => ipcRenderer.invoke("cw:configure-mcp", provider),
  requestNotifications: () => ipcRenderer.invoke("cw:notifications"),
  quit: () => ipcRenderer.invoke("cw:quit"),
});
