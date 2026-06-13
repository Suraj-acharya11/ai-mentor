const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("mentorDesktop", {
  platform: process.platform,
  pickAndImportSources: () => ipcRenderer.invoke("mentor:pick-and-import-sources"),
  judgeSession: (input) => ipcRenderer.invoke("mentor:judge-session", input)
});
