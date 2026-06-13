const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";
const OLLAMA_URL = "http://127.0.0.1:11434/api/generate";

function clipText(text, maxLength = 6000) {
  if (!text || text.length <= maxLength) {
    return text;
  }

  return `${text.slice(0, maxLength)} ...[truncated]`;
}

function buildJudgePrompt({ topic, practiceMode, languageSpace, sources, responseText, bodyLanguageNotes }) {
  const sourceSections = sources
    .map((source, index) => {
      return [
        `SOURCE ${index + 1}`,
        `Title: ${source.title}`,
        `Type: ${source.type}`,
        source.url ? `URL: ${source.url}` : "",
        "Content:",
        clipText(source.content, 5000)
      ]
        .filter(Boolean)
        .join("\n");
    })
    .join("\n\n");

  return [
    "You are an explanation judge for a study mentor app.",
    "The learner may study from many sources at the same time.",
    "Judge how well the learner combined the source pack into one clear answer.",
    `Topic: ${topic || "General explanation practice"}.`,
    `Language practice mode: ${languageSpace}.`,
    `Practice mode: ${practiceMode}.`,
    "Judge understanding first, clarity second, grammar third.",
    "If body language notes are present, give short body-language advice.",
    "Return JSON only with this exact shape:",
    '{"score":number,"sourceMainIdea":string,"understoodPoints":string[],"missingPoints":string[],"clarityAdvice":string[],"confidenceSignals":string[],"bodyLanguageAdvice":string[],"followUpQuestion":string}',
    "",
    "SOURCE PACK:",
    sourceSections,
    "",
    "LEARNER RESPONSE:",
    clipText(responseText, 8000),
    "",
    "BODY LANGUAGE NOTES:",
    bodyLanguageNotes || "No body language notes provided."
  ].join("\n");
}

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

function normalizeStringArray(value, fallback) {
  return Array.isArray(value) && value.length ? value.map((item) => String(item).trim()).filter(Boolean) : fallback;
}

function normalizeReport(report) {
  if (!report || typeof report !== "object") {
    throw new Error("The judge did not return a structured report.");
  }

  const scoreNumber = typeof report.score === "number" ? report.score : Number(report.score);
  const score = Number.isFinite(scoreNumber) ? Math.max(10, Math.min(100, Math.round(scoreNumber))) : 10;

  return {
    score,
    sourceMainIdea: typeof report.sourceMainIdea === "string" && report.sourceMainIdea.trim()
      ? report.sourceMainIdea.trim()
      : "The mentor could not summarize the combined source pack clearly.",
    understoodPoints: normalizeStringArray(report.understoodPoints, ["The mentor needs another attempt to list clear strengths."]),
    missingPoints: normalizeStringArray(report.missingPoints, ["The mentor did not isolate missing points clearly this time."]),
    clarityAdvice: normalizeStringArray(report.clarityAdvice, ["Slow down, structure your answer, and connect the sources more explicitly."]),
    confidenceSignals: normalizeStringArray(report.confidenceSignals, ["Confidence signals were not strong enough to judge yet."]),
    bodyLanguageAdvice: normalizeStringArray(report.bodyLanguageAdvice, ["Keep your posture open and your eye line steady while answering."]),
    followUpQuestion:
      typeof report.followUpQuestion === "string" && report.followUpQuestion.trim()
        ? report.followUpQuestion.trim()
        : "What is the single most important point shared across all the sources you studied?"
  };
}

async function judgeWithOpenRouter(input, settings) {
  if (!settings.openRouterApiKey || !settings.openRouterApiKey.trim()) {
    throw new Error("OpenRouter API key is missing.");
  }

  const response = await fetch(OPENROUTER_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${settings.openRouterApiKey.trim()}`,
      "Content-Type": "application/json",
      "HTTP-Referer": "https://ai-mentor.local",
      "X-Title": "AI Mentor"
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

async function judgeSession(input) {
  const sources = Array.isArray(input?.sources) ? input.sources.filter((source) => typeof source?.content === "string" && source.content.trim()) : [];
  const responseText = typeof input?.responseText === "string" ? input.responseText.trim() : "";

  if (!sources.length) {
    throw new Error("Add at least one source before asking the mentor to judge.");
  }

  if (!responseText) {
    throw new Error("Capture a spoken answer, type a response, or add video practice notes before judging.");
  }

  const cleanInput = {
    topic: typeof input?.topic === "string" ? input.topic.trim() : "",
    languageSpace: input?.languageSpace,
    practiceMode: input?.practiceMode,
    sources,
    responseText,
    bodyLanguageNotes: typeof input?.bodyLanguageNotes === "string" ? input.bodyLanguageNotes.trim() : ""
  };

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
        `Both judges failed. OpenRouter: ${openRouterMessage}. Ollama: ${ollamaMessage}. Add a valid OpenRouter API key or make sure Ollama is running locally with the configured model.`
      );
    }
  }
}

module.exports = {
  judgeSession
};
