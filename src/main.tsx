import React from "react";
import { createRoot } from "react-dom/client";
import {
  Mic,
  MicOff,
  Sparkles,
  Languages,
  BookOpen,
  MessageSquareText,
  Brain,
  NotebookPen,
  Orbit,
  AudioLines
} from "lucide-react";
import "./styles.css";

type LanguageSpace = "Tamil" | "Hindi" | "Kannada" | "English";

type JudgementReport = {
  score: number;
  sourceMainIdea: string;
  understoodPoints: string[];
  missingPoints: string[];
  clarityAdvice: string[];
  followUpQuestion: string;
};

type JudgeSettings = {
  openRouterApiKey: string;
  openRouterModel: string;
  ollamaModel: string;
};

const DEFAULT_SETTINGS: JudgeSettings = {
  openRouterApiKey: "",
  openRouterModel: "openrouter/auto",
  ollamaModel: "llama3.1:8b"
};

const SETTINGS_STORAGE_KEY = "mentor-judge-settings-v1";

function loadSettings(): JudgeSettings {
  try {
    const raw = window.localStorage.getItem(SETTINGS_STORAGE_KEY);

    if (!raw) {
      return DEFAULT_SETTINGS;
    }

    const parsed = JSON.parse(raw) as Partial<JudgeSettings>;

    return {
      openRouterApiKey: typeof parsed.openRouterApiKey === "string" ? parsed.openRouterApiKey : DEFAULT_SETTINGS.openRouterApiKey,
      openRouterModel:
        typeof parsed.openRouterModel === "string" && parsed.openRouterModel.trim()
          ? parsed.openRouterModel
          : DEFAULT_SETTINGS.openRouterModel,
      ollamaModel:
        typeof parsed.ollamaModel === "string" && parsed.ollamaModel.trim()
          ? parsed.ollamaModel
          : DEFAULT_SETTINGS.ollamaModel
    };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

const languageSpaces: Array<{
  name: LanguageSpace;
  caption: string;
  speechLang: string;
}> = [
  {
    name: "Tamil",
    caption: "Speak in Tamil the way you naturally do, including Tanglish when it helps you explain clearly.",
    speechLang: "ta-IN"
  },
  {
    name: "Hindi",
    caption: "Practice clear Hindi explanations for study, interviews, teaching, and everyday confidence.",
    speechLang: "hi-IN"
  },
  {
    name: "Kannada",
    caption: "Explain ideas naturally in Kannada, then tighten your structure and clarity over time.",
    speechLang: "kn-IN"
  },
  {
    name: "English",
    caption: "Practice clean English for interviews, presentations, and professional calls.",
    speechLang: "en-IN"
  }
];

function App() {
  const [activeSpace, setActiveSpace] = React.useState<LanguageSpace>("English");
  const [topic, setTopic] = React.useState("Explain something you learned today");
  const [sourceText, setSourceText] = React.useState("");
  const [transcript, setTranscript] = React.useState("");
  const [interimTranscript, setInterimTranscript] = React.useState("");
  const [isListening, setIsListening] = React.useState(false);
  const [speechError, setSpeechError] = React.useState("");
  const [isJudging, setIsJudging] = React.useState(false);
  const [judgementError, setJudgementError] = React.useState("");
  const [judgementReport, setJudgementReport] = React.useState<JudgementReport | null>(null);

  // Use editable settings state so the form can update values live.
  // showSettings decides whether the judge settings panel is visible.
  const [settings, setSettings] = React.useState<JudgeSettings>(() => loadSettings());
  const [showSettings, setShowSettings] = React.useState(false);

  const recognitionRef = React.useRef<SpeechRecognition | null>(null);

  const activeConfig = languageSpaces.find((space) => space.name === activeSpace) ?? languageSpaces[0];
  const canJudge = sourceText.trim().length > 0 && transcript.trim().length > 0 && !isJudging;
  const providerSummary = settings.openRouterApiKey.trim()
    ? `OpenRouter ${settings.openRouterModel} first, Ollama ${settings.ollamaModel} on backup duty.`
    : `OpenRouter key missing, so this screen is ready for Ollama fallback on ${settings.ollamaModel}.`;
  const reportTone = isJudging
    ? "Judging your explanation now."
    : judgementError
      ? "The judge needs a little setup help."
      : judgementReport
        ? "Your latest explanation has a full mentor report."
        : "Paste a source, speak it back, then ask the mentor to judge.";

  const stateCards = [
    {
      label: "Source ready",
      value: sourceText.trim() ? "Loaded" : "Waiting",
      active: Boolean(sourceText.trim())
    },
    {
      label: "Voice capture",
      value: isListening ? "Listening" : transcript.trim() ? "Captured" : "Idle",
      active: isListening || Boolean(transcript.trim())
    },
    {
      label: "Mentor report",
      value: isJudging ? "Thinking" : judgementReport ? "Ready" : "Standby",
      active: isJudging || Boolean(judgementReport)
    }
  ];

  React.useEffect(() => {
    window.localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
  }, [settings]);

  async function judgeExplanation() {
    if (!canJudge) {
      return;
    }

    setIsJudging(true);
    setJudgementError("");

    try {
      const desktopApi = window.mentorDesktop;

      if (!desktopApi?.judgeSpeech) {
        throw new Error("Desktop judging bridge is not available in this build.");
      }

      const report = await desktopApi.judgeSpeech({
        sourceText,
        transcript,
        languageSpace: activeSpace,
        settings
      });

      setJudgementReport(report);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Judging failed. Please check your provider setup and try again.";
      setJudgementError(message);
      setJudgementReport(null);
    } finally {
      setIsJudging(false);
    }
  }

  function startListening() {
    const Recognition = window.SpeechRecognition ?? window.webkitSpeechRecognition;

    if (!Recognition) {
      setSpeechError("Live captions are not available in this Electron/Chromium build yet. We will add a local Whisper adapter next.");
      return;
    }

    const recognition = new Recognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = activeConfig.speechLang;

    recognition.onresult = (event) => {
      let finalText = "";
      let interimText = "";

      for (let index = event.resultIndex; index < event.results.length; index += 1) {
        const phrase = event.results[index][0].transcript;

        if (event.results[index].isFinal) {
          finalText += `${phrase} `;
        } else {
          interimText += phrase;
        }
      }

      if (finalText) {
        setTranscript((current) => `${current} ${finalText}`.trim());
        setJudgementReport(null);
        setJudgementError("");
      }

      setInterimTranscript(interimText);
    };

    recognition.onerror = (event) => {
      setSpeechError(`Speech recognition issue: ${event.error}`);
      setIsListening(false);
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognitionRef.current = recognition;
    setSpeechError("");
    setIsListening(true);
    recognition.start();
  }

  function stopListening() {
    recognitionRef.current?.stop();
    recognitionRef.current = null;
    setIsListening(false);
    setInterimTranscript("");
  }

  return (
    <main className="app-shell">
      <aside className="sidebar">
        <div className="brand-mark">
          <div className="brand-badge">
            <Sparkles size={20} />
          </div>
          <div>
            <p>Adaptive Mentor</p>
            <span>Speak it. Simplify it. Own it.</span>
          </div>
        </div>

        <section className="mentor-note">
          <div className="mentor-note-header">
            <Orbit size={18} />
            <span>{activeSpace} mode</span>
          </div>
          <h2>Make the explanation feel teachable.</h2>
          <p>{activeConfig.caption}</p>
        </section>

        <nav className="space-list" aria-label="Language practice spaces">
          {languageSpaces.map((space) => (
            <button
              className={space.name === activeSpace ? "space-button active" : "space-button"}
              key={space.name}
              type="button"
              onClick={() => {
                setActiveSpace(space.name);
                setJudgementReport(null);
                setJudgementError("");
                stopListening();
              }}
            >
              <Languages size={18} />
              <div className="space-copy">
                <span>{space.name}</span>
                <small>{space.speechLang}</small>
              </div>
            </button>
          ))}
        </nav>

        <section className="settings-glance">
          <div className="settings-glance-header">
            <NotebookPen size={18} />
            <span>Judge setup</span>
          </div>
          <p>{providerSummary}</p>
          <button className="settings-toggle" type="button" onClick={() => setShowSettings((current) => !current)}>
            {showSettings ? "Hide judge settings" : "Edit judge settings"}
          </button>
          {showSettings ? (
            <div className="settings-panel">
              <div className="settings-panel-header">
                <h3>Judge settings</h3>
                <p>Keep your provider key and model names ready before you ask for a mentor report.</p>
              </div>

              <label className="settings-field">
                <span>OpenRouter API key</span>
                <input
                  type="password"
                  value={settings.openRouterApiKey}
                  onChange={(event) =>
                    setSettings((current) => ({
                      ...current,
                      openRouterApiKey: event.target.value
                    }))
                  }
                  placeholder="Paste your OpenRouter key"
                  autoComplete="off"
                />
              </label>

              <label className="settings-field">
                <span>OpenRouter model</span>
                <input
                  value={settings.openRouterModel}
                  onChange={(event) =>
                    setSettings((current) => ({
                      ...current,
                      openRouterModel: event.target.value
                    }))
                  }
                  placeholder="openrouter/auto"
                />
              </label>

              <label className="settings-field">
                <span>Ollama model</span>
                <input
                  value={settings.ollamaModel}
                  onChange={(event) =>
                    setSettings((current) => ({
                      ...current,
                      ollamaModel: event.target.value
                    }))
                  }
                  placeholder="llama3.1:8b"
                />
              </label>

              <p className="settings-panel-note">{providerSummary}</p>
            </div>
          ) : null}
        </section>
      </aside>

      <section className="workspace">
        <header className="hero-panel">
          <div className="hero-copy">
            <p className="eyebrow">One-screen speaking lab</p>
            <h1>Turn rough thoughts into a student-friendly explanation.</h1>
            <p className="hero-summary">{reportTone}</p>
          </div>

          <div className="hero-score">
            <span>LLM judgement score</span>
            <strong>{judgementReport ? judgementReport.score : "--"}</strong>
            <small>{judgementReport ? "Fresh from your latest judged attempt." : "Score appears after a judged attempt."}</small>
          </div>
        </header>

        <section className="journey-strip" aria-label="Current mentor flow status">
          {stateCards.map((card) => (
            <div className={card.active ? "journey-card active" : "journey-card"} key={card.label}>
              <span>{card.label}</span>
              <strong>{card.value}</strong>
            </div>
          ))}
        </section>

        <section className="practice-grid">
          <div className="practice-panel">
            <div className="input-stack">
              <section className="input-card">
                <div className="panel-heading">
                  <BookOpen size={20} />
                  <div>
                    <h2>Topic</h2>
                    <p>Keep the goal simple enough that you could teach it to a classmate.</p>
                  </div>
                </div>

                <input
                  className="topic-input"
                  value={topic}
                  onChange={(event) => setTopic(event.target.value)}
                  aria-label="Practice topic"
                />
              </section>

              <section className="input-card source-card">
                <div className="panel-heading">
                  <NotebookPen size={20} />
                  <div>
                    <h2>Source material</h2>
                    <p>Drop the lesson, paragraph, or summary you are trying to explain back in your own words.</p>
                  </div>
                </div>

                <textarea
                  className="source-input"
                  value={sourceText}
                  onChange={(event) => {
                    setSourceText(event.target.value);
                    setJudgementReport(null);
                    setJudgementError("");
                  }}
                  placeholder="Paste notes, a lesson summary, article paragraph, or transcript here..."
                  aria-label="Source material"
                />
              </section>
            </div>

            <section className={isListening ? "recording-surface live" : "recording-surface"}>
              <div className="recording-header">
                <div>
                  <p className="recording-label">{topic}</p>
                  <h2>Live explanation capture</h2>
                </div>
                <div className={isListening ? "status-pill live" : "status-pill"}>
                  <AudioLines size={16} />
                  <span>{isListening ? "Listening now" : transcript ? "Transcript ready" : "Waiting for your voice"}</span>
                </div>
              </div>

              <div className="transcript-box">
                {transcript || interimTranscript ? (
                  <>
                    <span>{transcript}</span>
                    <em>{interimTranscript}</em>
                  </>
                ) : (
                  <span className="empty-transcript">Start speaking when you are ready. Your explanation will build here in real time.</span>
                )}
              </div>
            </section>

            {speechError ? <p className="inline-alert">{speechError}</p> : null}

            <div className="action-row">
              <button className={isListening ? "primary-action active" : "primary-action"} type="button" onClick={isListening ? stopListening : startListening}>
                {isListening ? <MicOff size={18} /> : <Mic size={18} />}
                {isListening ? "Stop live captions" : "Start live captions"}
              </button>

              <button className="secondary-action judge-action" type="button" onClick={judgeExplanation} disabled={!canJudge}>
                <Brain size={18} />
                {isJudging ? "Judging..." : "Judge explanation"}
              </button>

              <button
                className="ghost-action"
                type="button"
                onClick={() => {
                  setTranscript("");
                  setInterimTranscript("");
                  setJudgementReport(null);
                  setJudgementError("");
                }}
              >
                Clear transcript
              </button>
            </div>
          </div>

          <div className="feedback-panel">
            <div className="panel-heading report-heading">
              <MessageSquareText size={20} />
              <div>
                <h2>Mentor report</h2>
                <p>Hosted judging runs first. Local fallback only steps in when it has to.</p>
              </div>
            </div>

            {judgementError ? (
              <div className="feedback-block error-block">
                <h3>Setup needed</h3>
                <p>{judgementError}</p>
              </div>
            ) : null}

            {!judgementError && !judgementReport ? (
              <div className="feedback-block empty-judge-state">
                <h3>Ready to judge</h3>
                <p>Paste source material, speak your explanation, then use the judge button for a source-aware report.</p>
              </div>
            ) : null}

            {isJudging ? (
              <div className="feedback-block thinking-state">
                <h3>Mentor is thinking</h3>
                <p>Comparing your explanation to the source, checking what landed, and shaping your next retry.</p>
              </div>
            ) : null}

            {judgementReport ? (
              <>
                <div className="feedback-block feature-block">
                  <h3>Source main idea</h3>
                  <p>{judgementReport.sourceMainIdea}</p>
                </div>

                <div className="feedback-block feature-block">
                  <h3>Understood points</h3>
                  {judgementReport.understoodPoints.map((item) => (
                    <p key={item}>{item}</p>
                  ))}
                </div>

                <div className="feedback-block feature-block">
                  <h3>Missing points</h3>
                  {judgementReport.missingPoints.map((item) => (
                    <p key={item}>{item}</p>
                  ))}
                </div>

                <div className="feedback-block feature-block">
                  <h3>Clarity advice</h3>
                  {judgementReport.clarityAdvice.map((item) => (
                    <p key={item}>{item}</p>
                  ))}
                </div>

                <div className="feedback-block feature-block final-block">
                  <h3>Follow-up question</h3>
                  <p>{judgementReport.followUpQuestion}</p>
                </div>
              </>
            ) : null}
          </div>
        </section>
      </section>
    </main>
  );
}

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
