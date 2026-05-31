// This file is the Electron "main process".
// Think of it as the desktop app launcher: it creates the native Windows app window.

// "app" controls the Electron application lifecycle.
// "BrowserWindow" creates a desktop window that can show our React web UI.
// Safe IPC bridge between the renderer and the Electron main process
const { app, BrowserWindow, ipcMain } = require("electron");

// "path" is a built-in Node.js helper for safely joining file/folder paths.
const path = require("path");

// app.isPackaged is false while we are developing, and true after building an installer.
// So isDev becomes true during "npm run dev".
const isDev = !app.isPackaged;

// OpenRouter endpoint for hosted free-model judging.
const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";
// Ollama local endpoint for zero-cost fallback judging.
const OLLAMA_URL = "http://127.0.0.1:11434/api/generate";

// Build the exact judging instruction sent to the LLM.
function buildJudgePrompt({ sourceText, transcript, languageSpace }) {
  return [
    "You are an explanation judge for a speaking mentor app.",
    "Compare the user's spoken explanation against the provided source material.",
    `Language practice mode: ${languageSpace}.`,
    "Judge understanding of the source, not grammar perfection.",
    "Return JSON only with this exact shape:",
    '{"score":number,"sourceMainIdea":string,"understoodPoints":string[],"missingPoints":string[],"clarityAdvice":string[],"followUpQuestion":string}',
    "",
    "SOURCE MATERIAL:",
    sourceText,
    "",
    "USER TRANSCRIPT:",
    transcript
  ].join("\n");
}

// Extract JSON even if the model wraps it in extra text.
async function parseJsonFromText(text) {
  const trimmed = typeof text === "string" ? text.trim() : "";

  if (!trimmed) {
    throw new Error("The judge returned an empty response.");
  }

  try {
    return JSON.parse(trimmed);
  } catch {
    const jsonMatch = trimmed.match(/\{[\s\S]*\}/);

    if (!jsonMatch) {
      throw new Error("The judge did not return valid JSON.");
    }

    return JSON.parse(jsonMatch[0]);
  }
}

// Normalize the model output into the exact report shape the UI expects.
function normalizeReport(report) {
  if (!report || typeof report !== "object") {
    throw new Error("The judge did not return a structured report.");
  }

  const scoreNumber = typeof report.score === "number" ? report.score : Number(report.score);
  const score = Number.isFinite(scoreNumber) ? Math.max(10, Math.min(100, Math.round(scoreNumber))) : 10;

  if (typeof report.sourceMainIdea !== "string" || typeof report.followUpQuestion !== "string") {
    throw new Error("The judge response is missing required text fields.");
  }

  return {
    score,
    sourceMainIdea: report.sourceMainIdea.trim() || "The judge could not summarize the source clearly.",
    understoodPoints: Array.isArray(report.understoodPoints) ? report.understoodPoints : [],
    missingPoints: Array.isArray(report.missingPoints) ? report.missingPoints : [],
    clarityAdvice: Array.isArray(report.clarityAdvice) ? report.clarityAdvice : [],
    followUpQuestion: report.followUpQuestion.trim() || "Can you explain the same idea one more time using a simpler example?"
  };
}

// Ask OpenRouter free first for a structured judgement report.
async function judgeWithOpenRouter(input, settings) {
  if (!settings.openRouterApiKey || !settings.openRouterApiKey.trim()) {
    throw new Error("OpenRouter API key is missing.");
  }

  const response = await fetch(OPENROUTER_URL, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${settings.openRouterApiKey.trim()}`,
      "Content-Type": "application/json",
      "HTTP-Referer": "https://adaptive-mentor.local",
      "X-Title": "Adaptive Mentor"
    },
        body: JSON.stringify({
      model: settings.openRouterModel?.trim() || "openrouter/auto",
      response_format: { type: "json_object" },
      messages: [
        {
          role: "user",
          content: buildJudgePrompt(input)
        }
      ]
    })
  });
    if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`OpenRouter request failed (${response.status}): ${errorText || "unknown error"}`);
  }

  const payload = await response.json();
  const content = payload?.choices?.[0]?.message?.content;

  if (typeof content !== "string") {
    throw new Error("OpenRouter did not return message content.");
  }

  return normalizeReport(await parseJsonFromText(content));
}

// Ask local Ollama for a structured judgement report when hosted judging is unavailable.
async function judgeWithOllama(input, settings) {
  const response = await fetch(OLLAMA_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
        body: JSON.stringify({
      model: settings.ollamaModel?.trim() || "llama3.1:8b",
      prompt: buildJudgePrompt(input),
      stream: false,
      format: "json"
    })
  });
    if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Ollama request failed (${response.status}): ${errorText || "unknown error"}`);
  }

  const payload = await response.json();
  return normalizeReport(await parseJsonFromText(payload?.response));
}

// Validate input, then try hosted judging first and local judging second.
async function judgeSpeech(input) {
  const cleanInput = {
    sourceText: typeof input?.sourceText === "string" ? input.sourceText.trim() : "",
    transcript: typeof input?.transcript === "string" ? input.transcript.trim() : "",
    languageSpace: input?.languageSpace
  };

  if (!cleanInput.sourceText || !cleanInput.transcript) {
    throw new Error("Paste source material and capture a transcript before judging.");
  }
    const settings = {
    openRouterApiKey: typeof input?.settings?.openRouterApiKey === "string" ? input.settings.openRouterApiKey : "",
    openRouterModel: typeof input?.settings?.openRouterModel === "string" ? input.settings.openRouterModel : "openrouter/auto",
    ollamaModel: typeof input?.settings?.ollamaModel === "string" ? input.settings.ollamaModel : "llama3.1:8b"
  };
    try {
    return await judgeWithOpenRouter(cleanInput, settings);
  } catch (openRouterError) {
    try {
      return await judgeWithOllama(cleanInput, settings);
    } catch (ollamaError) {
      const openRouterMessage = openRouterError instanceof Error ? openRouterError.message : "unknown OpenRouter error";
      const ollamaMessage = ollamaError instanceof Error ? ollamaError.message : "unknown Ollama error";

      throw new Error(
        `Both zero-cost judges failed. OpenRouter: ${openRouterMessage}. Ollama: ${ollamaMessage}. Add a valid OpenRouter API key or make sure Ollama is running locally with the configured model.`
      );
    }
  }
}

// This function creates one desktop window for the mentor app.
function createWindow() {
  // BrowserWindow is the actual native desktop window.
  const window = new BrowserWindow({
    // Starting width of the app window.
    width: 1280,

    // Starting height of the app window.
    height: 820,

    // Smallest width the user can resize the window to.
    minWidth: 980,

    // Smallest height the user can resize the window to.
    minHeight: 680,

    // Background color shown before React finishes loading.
    backgroundColor: "#f6f4ef",

    // Security and connection settings for the React page inside the window.
    webPreferences: {
      // preload.cjs runs before React and exposes only safe desktop info to the UI.
      preload: path.join(__dirname, "preload.cjs"),

      // Keeps the Electron/Node world separate from the React/browser world.
      contextIsolation: true,

      // Prevents React code from directly using Node.js APIs like file access.
      nodeIntegration: false
    }
  });

  // During development, React is served by Vite at localhost:5173.
  if (isDev) {
    window.loadURL("http://localhost:5173");
  } else {
    // After production build, React files live inside the dist folder.
    window.loadFile(path.join(__dirname, "..", "dist", "index.html"));
  }
}

// Ask the Electron main process to run the real speech-judging pipeline.
ipcMain.handle("mentor:judge-speech", async (_event, input) => {
  return judgeSpeech(input);
});

// Electron must finish starting before we create windows.
app.whenReady().then(() => {
  // Create the first app window.
  createWindow();

  // On macOS, clicking the dock icon should recreate a window if none are open.
  // This does not matter much on Windows, but it is common Electron boilerplate.
  app.on("activate", () => {
    // If no windows exist, create a new one.
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

// This event runs when all app windows are closed.
app.on("window-all-closed", () => {
  // On Windows/Linux, closing all windows usually exits the app.
  // On macOS, apps often stay open until the user quits explicitly.
  if (process.platform !== "darwin") {
    app.quit();
  }
});
