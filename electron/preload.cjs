// This file is the Electron "preload" script.
// It is the controlled bridge between the desktop side and the React UI side.

// contextBridge safely exposes selected values to the browser window.
//We need ipcRenderer so the safe browser-side bridge can send the judge request into the Electron main process.
const { contextBridge, ipcRenderer} = require("electron");

// exposeInMainWorld creates window.mentorDesktop inside React/browser code.
contextBridge.exposeInMainWorld("mentorDesktop", {
  // This tells the UI which OS it is running on, for example "win32" on Windows.
  platform: process.platform,
  // Send source text plus transcript to the Electron main process for judging.
  judgeSpeech: (input) => ipcRenderer.invoke("mentor:judge-speech", input)
});
