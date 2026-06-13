const { app, BrowserWindow, ipcMain, dialog } = require("electron");
const path = require("path");
const { importSourceFromFile } = require("./source-import.cjs");
const { judgeSession } = require("./mentor-judge.cjs");

const isDev = !app.isPackaged;

async function pickAndImportSources() {
  const { canceled, filePaths } = await dialog.showOpenDialog({
    title: "Import study sources",
    properties: ["openFile", "multiSelections"],
    filters: [
      { name: "Study sources", extensions: ["pdf", "pptx", "docx", "txt", "md"] },
      { name: "PDF", extensions: ["pdf"] },
      { name: "PowerPoint", extensions: ["pptx"] },
      { name: "Word", extensions: ["docx"] },
      { name: "Text", extensions: ["txt", "md"] }
    ]
  });

  if (canceled || !filePaths.length) {
    return { sources: [], warnings: [] };
  }

  const sources = [];
  const warnings = [];

  for (const filePath of filePaths) {
    try {
      const source = await importSourceFromFile(filePath);
      sources.push(source);
    } catch (error) {
      warnings.push(error instanceof Error ? error.message : `Failed to import ${path.basename(filePath)}`);
    }
  }

  return { sources, warnings };
}

module.exports = {
  importSourceFromFile,
  pickAndImportSources,
  judgeSession
};

function createWindow() {
  const window = new BrowserWindow({
    width: 1440,
    height: 920,
    minWidth: 1040,
    minHeight: 760,
    backgroundColor: "#f6f4ef",
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  if (isDev) {
    window.loadURL("http://localhost:5173");
  } else {
    window.loadFile(path.join(__dirname, "..", "dist", "index.html"));
  }
}

ipcMain.handle("mentor:pick-and-import-sources", async () => {
  return pickAndImportSources();
});

ipcMain.handle("mentor:judge-session", async (_event, input) => {
  return judgeSession(input);
});

app.whenReady().then(() => {
  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});
