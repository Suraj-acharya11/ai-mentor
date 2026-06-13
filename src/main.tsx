import React from "react";
import { createRoot } from "react-dom/client";
import {
  AudioLines,
  Brain,
  BookOpen,
  Camera,
  FilePlus2,
  Languages,
  Link2,
  MessageSquareText,
  Mic,
  MicOff,
  NotebookPen,
  Orbit,
  Sparkles,
  Trash2,
  Video
} from "lucide-react";
import "./styles.css";

type LanguageSpace = "Tamil" | "Hindi" | "Kannada" | "English";
type PracticeMode = "spoken" | "text" | "video";
type SourceType = "pdf" | "pptx" | "docx" | "txt" | "notes" | "youtube" | "web";

type StudySource = {
  id: string;
  title: string;
  type: SourceType;
  content: string;
  url?: string;
  fileName?: string;
  importedAt: string;
};

type MentorReport = {
  score: number;
  sourceMainIdea: string;
  understoodPoints: string[];
  missingPoints: string[];
  clarityAdvice: string[];
  confidenceSignals: string[];
  bodyLanguageAdvice: string[];
  followUpQuestion: string;
};

type JudgeSettings = {
  openRouterApiKey: string;
  openRouterModel: string;
  ollamaModel: string;
};

type DraftState = {
  activeSpace: LanguageSpace;
  practiceMode: PracticeMode;
  topic: string;
  typedResponse: string;
  transcript: string;
  bodyLanguageNotes: string;
  sources: StudySource[];
};

const DEFAULT_SETTINGS: JudgeSettings = {
  openRouterApiKey: "",
  openRouterModel: "openrouter/auto",
  ollamaModel: "llama3.1:8b"
};

const DEFAULT_DRAFT: DraftState = {
  activeSpace: "English",
  practiceMode: "spoken",
  topic: "Explain what you studied today",
  typedResponse: "",
  transcript: "",
  bodyLanguageNotes: "",
  sources: []
};

const SETTINGS_STORAGE_KEY = "mentor-judge-settings-v2";
const DRAFT_STORAGE_KEY = "mentor-practice-draft-v2";

const languageSpaces: Array<{
  name: LanguageSpace;
  caption: string;
  speechLang: string;
}> = [
  {
    name: "Tamil",
    caption: "Practice explain-back answers in Tamil, with Tanglish allowed when it helps you stay natural.",
    speechLang: "ta-IN"
  },
  {
    name: "Hindi",
    caption: "Use Hindi for study answers, viva prep, and practical explanation practice.",
    speechLang: "hi-IN"
  },
  {
    name: "Kannada",
    caption: "Build clarity in Kannada while keeping your structure simple and teachable.",
    speechLang: "kn-IN"
  },
  {
    name: "English",
    caption: "Practice interviews, presentations, and study explanations in clear English.",
    speechLang: "en-IN"
  }
];

const practiceModes: Array<{
  mode: PracticeMode;
  label: string;
  summary: string;
}> = [
  {
    mode: "spoken",
    label: "Speak",
    summary: "Use live captions and judge how well your spoken explanation matches the source pack."
  },
  {
    mode: "text",
    label: "Chat / Text",
    summary: "Type a response when you want a safer draft before speaking aloud."
  },
  {
    mode: "video",
    label: "Video + Body Language",
    summary: "Practice with camera on, add self-review notes, and get body-language reminders with the mentor report."
  }
];

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

function loadDraft(): DraftState {
  try {
    const raw = window.localStorage.getItem(DRAFT_STORAGE_KEY);

    if (!raw) {
      return DEFAULT_DRAFT;
    }

    const parsed = JSON.parse(raw) as Partial<DraftState>;

    return {
      activeSpace: parsed.activeSpace ?? DEFAULT_DRAFT.activeSpace,
      practiceMode: parsed.practiceMode ?? DEFAULT_DRAFT.practiceMode,
      topic: typeof parsed.topic === "string" ? parsed.topic : DEFAULT_DRAFT.topic,
      typedResponse: typeof parsed.typedResponse === "string" ? parsed.typedResponse : DEFAULT_DRAFT.typedResponse,
      transcript: typeof parsed.transcript === "string" ? parsed.transcript : DEFAULT_DRAFT.transcript,
      bodyLanguageNotes: typeof parsed.bodyLanguageNotes === "string" ? parsed.bodyLanguageNotes : DEFAULT_DRAFT.bodyLanguageNotes,
      sources: Array.isArray(parsed.sources) ? parsed.sources : DEFAULT_DRAFT.sources
    };
  } catch {
    return DEFAULT_DRAFT;
  }
}

function buildSourceId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function summarizeSources(sources: StudySource[]) {
  const totalChars = sources.reduce((sum, source) => sum + source.content.length, 0);
  return {
    count: sources.length,
    totalChars,
    labels: Array.from(new Set(sources.map((source) => source.type.toUpperCase())))
  };
}

function buildResponseText(mode: PracticeMode, transcript: string, typedResponse: string, bodyLanguageNotes: string) {
  if (mode === "spoken") {
    return transcript.trim();
  }

  if (mode === "text") {
    return typedResponse.trim();
  }

  return [typedResponse.trim(), transcript.trim(), bodyLanguageNotes.trim()].filter(Boolean).join("\n\n");
}

function App() {
  const draft = React.useMemo(() => loadDraft(), []);
  const [activeSpace, setActiveSpace] = React.useState<LanguageSpace>(draft.activeSpace);
  const [practiceMode, setPracticeMode] = React.useState<PracticeMode>(draft.practiceMode);
  const [topic, setTopic] = React.useState(draft.topic);
  const [sources, setSources] = React.useState<StudySource[]>(draft.sources);
  const [typedResponse, setTypedResponse] = React.useState(draft.typedResponse);
  const [transcript, setTranscript] = React.useState(draft.transcript);
  const [interimTranscript, setInterimTranscript] = React.useState("");
  const [bodyLanguageNotes, setBodyLanguageNotes] = React.useState(draft.bodyLanguageNotes);
  const [manualSourceTitle, setManualSourceTitle] = React.useState("");
  const [manualSourceContent, setManualSourceContent] = React.useState("");
  const [linkTitle, setLinkTitle] = React.useState("");
  const [linkUrl, setLinkUrl] = React.useState("");
  const [linkNotes, setLinkNotes] = React.useState("");
  const [isListening, setIsListening] = React.useState(false);
  const [speechError, setSpeechError] = React.useState("");
  const [importMessage, setImportMessage] = React.useState("");
  const [cameraError, setCameraError] = React.useState("");
  const [isCameraOn, setIsCameraOn] = React.useState(false);
  const [isJudging, setIsJudging] = React.useState(false);
  const [judgementError, setJudgementError] = React.useState("");
  const [report, setReport] = React.useState<MentorReport | null>(null);
  const [settings, setSettings] = React.useState<JudgeSettings>(() => loadSettings());
  const [showSettings, setShowSettings] = React.useState(false);

  const recognitionRef = React.useRef<SpeechRecognition | null>(null);
  const videoRef = React.useRef<HTMLVideoElement | null>(null);
  const cameraStreamRef = React.useRef<MediaStream | null>(null);

  const activeConfig = languageSpaces.find((space) => space.name === activeSpace) ?? languageSpaces[0];
  const responseText = buildResponseText(practiceMode, transcript, typedResponse, bodyLanguageNotes);
  const canJudge = sources.length > 0 && responseText.trim().length > 0 && !isJudging;
  const sourceSummary = summarizeSources(sources);
  const providerSummary = settings.openRouterApiKey.trim()
    ? `OpenRouter ${settings.openRouterModel} is ready, with Ollama ${settings.ollamaModel} as fallback.`
    : `OpenRouter key missing, so the app will rely on Ollama ${settings.ollamaModel} if it is running locally.`;
  const reportTone = isJudging
    ? "The mentor is reviewing your mixed-source answer."
    : judgementError
      ? "The practice flow is ready, but the judge needs setup help."
      : report
        ? "Your source pack has a fresh mentor review."
        : "Build a source pack, choose a practice mode, and ask the mentor to judge your answer.";

  React.useEffect(() => {
    window.localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
  }, [settings]);

  React.useEffect(() => {
    const nextDraft: DraftState = {
      activeSpace,
      practiceMode,
      topic,
      typedResponse,
      transcript,
      bodyLanguageNotes,
      sources
    };

    window.localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(nextDraft));
  }, [activeSpace, practiceMode, topic, typedResponse, transcript, bodyLanguageNotes, sources]);

  React.useEffect(() => {
    return () => {
      stopListening();
      stopCamera();
    };
  }, []);

  function clearJudgementState() {
    setReport(null);
    setJudgementError("");
  }

  function addManualSource() {
    if (!manualSourceTitle.trim() || !manualSourceContent.trim()) {
      setImportMessage("Add both a title and source notes before saving a manual study source.");
      return;
    }

    setSources((current) => [
      {
        id: buildSourceId("notes"),
        title: manualSourceTitle.trim(),
        type: "notes",
        content: manualSourceContent.trim(),
        importedAt: new Date().toISOString()
      },
      ...current
    ]);
    setManualSourceTitle("");
    setManualSourceContent("");
    setImportMessage("Manual source added to your study pack.");
    clearJudgementState();
  }

  function addLinkSource() {
    if (!linkUrl.trim()) {
      setImportMessage("Paste a YouTube or web link before adding it to the study pack.");
      return;
    }

    const normalizedTitle = linkTitle.trim() || "Linked source";
    const normalizedUrl = linkUrl.trim();
    const sourceType: SourceType = normalizedUrl.includes("youtube.com") || normalizedUrl.includes("youtu.be") ? "youtube" : "web";

    setSources((current) => [
      {
        id: buildSourceId(sourceType),
        title: normalizedTitle,
        type: sourceType,
        url: normalizedUrl,
        content: linkNotes.trim() || `Reference link: ${normalizedUrl}`,
        importedAt: new Date().toISOString()
      },
      ...current
    ]);
    setLinkTitle("");
    setLinkUrl("");
    setLinkNotes("");
    setImportMessage("Linked source added. Add notes if you want the mentor to judge against key takeaways from that resource.");
    clearJudgementState();
  }

  async function importLocalSources() {
    setImportMessage("");

    try {
      const desktopApi = window.mentorDesktop;

      if (!desktopApi?.pickAndImportSources) {
        throw new Error("Desktop file import is not available in this build.");
      }

      const result = await desktopApi.pickAndImportSources();

      if (!result.sources.length && !result.warnings.length) {
        setImportMessage("No files were selected.");
        return;
      }

      if (result.sources.length) {
        setSources((current) => [...result.sources, ...current]);
        clearJudgementState();
      }

      const messageBits = [
        result.sources.length ? `${result.sources.length} file source${result.sources.length === 1 ? "" : "s"} imported.` : "",
        result.warnings.length ? result.warnings.join(" ") : ""
      ].filter(Boolean);

      setImportMessage(messageBits.join(" "));
    } catch (error) {
      const message = error instanceof Error ? error.message : "File import failed.";
      setImportMessage(message);
    }
  }

  function removeSource(sourceId: string) {
    setSources((current) => current.filter((source) => source.id !== sourceId));
    clearJudgementState();
  }

  function startListening() {
    const Recognition = window.SpeechRecognition ?? window.webkitSpeechRecognition;

    if (!Recognition) {
      setSpeechError("Live captions are not available in this Electron/Chromium build yet.");
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
        clearJudgementState();
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

  async function startCamera() {
    if (!navigator.mediaDevices?.getUserMedia) {
      setCameraError("Camera access is not available in this build.");
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user" },
        audio: false
      });

      cameraStreamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }

      setCameraError("");
      setIsCameraOn(true);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Camera access failed.";
      setCameraError(message);
      setIsCameraOn(false);
    }
  }

  function stopCamera() {
    cameraStreamRef.current?.getTracks().forEach((track) => track.stop());
    cameraStreamRef.current = null;

    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }

    setIsCameraOn(false);
  }

  async function judgeSession() {
    if (!canJudge) {
      return;
    }

    setIsJudging(true);
    setJudgementError("");

    try {
      const desktopApi = window.mentorDesktop;

      if (!desktopApi?.judgeSession) {
        throw new Error("Desktop judging bridge is not available in this build.");
      }

      const nextReport = await desktopApi.judgeSession({
        topic,
        languageSpace: activeSpace,
        practiceMode,
        sources,
        responseText,
        bodyLanguageNotes,
        settings
      });

      setReport(nextReport);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Judging failed. Please check your provider setup and try again.";
      setJudgementError(message);
      setReport(null);
    } finally {
      setIsJudging(false);
    }
  }

  function resetPractice() {
    setTypedResponse("");
    setTranscript("");
    setInterimTranscript("");
    setBodyLanguageNotes("");
    clearJudgementState();
  }

  return (
    <main className="app-shell">
      <aside className="sidebar">
        <div className="brand-mark">
          <div className="brand-badge">
            <Sparkles size={20} />
          </div>
          <div>
            <p>AI Mentor</p>
            <span>Multi-source speaking and clarity lab</span>
          </div>
        </div>

        <section className="mentor-note">
          <div className="mentor-note-header">
            <Orbit size={18} />
            <span>{activeSpace} mode</span>
          </div>
          <h2>Teach back what you studied from many sources.</h2>
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
                stopListening();
                clearJudgementState();
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
            </div>
          ) : null}
        </section>
      </aside>

      <section className="workspace">
        <header className="hero-panel">
          <div className="hero-copy">
            <p className="eyebrow">Study pack + explanation lab</p>
            <h1>Mix PDFs, PPTs, docs, notes, and links before you answer.</h1>
            <p className="hero-summary">{reportTone}</p>
          </div>

          <div className="hero-score">
            <span>Mentor score</span>
            <strong>{report ? report.score : "--"}</strong>
            <small>{report ? "Updated from your latest judged attempt." : "Appears after the mentor reviews your answer."}</small>
          </div>
        </header>

        <section className="journey-strip" aria-label="Current mentor flow status">
          <div className={sources.length ? "journey-card active" : "journey-card"}>
            <span>Study pack</span>
            <strong>{sourceSummary.count ? `${sourceSummary.count} sources` : "Empty"}</strong>
          </div>
          <div className={responseText ? "journey-card active" : "journey-card"}>
            <span>Response mode</span>
            <strong>{practiceModes.find((item) => item.mode === practiceMode)?.label ?? "Speak"}</strong>
          </div>
          <div className={report ? "journey-card active" : "journey-card"}>
            <span>Mentor report</span>
            <strong>{report ? "Ready" : isJudging ? "Thinking" : "Standby"}</strong>
          </div>
        </section>

        <section className="content-grid">
          <div className="main-column">
            <section className="workspace-card">
              <div className="panel-heading">
                <BookOpen size={20} />
                <div>
                  <h2>Source studio</h2>
                  <p>Build one study pack from many materials before you answer.</p>
                </div>
              </div>

              <div className="source-toolbar">
                <button className="primary-action" type="button" onClick={importLocalSources}>
                  <FilePlus2 size={18} />
                  Import PDF / PPTX / DOCX / TXT
                </button>
                <div className="source-stats">
                  <span>{sourceSummary.count} sources</span>
                  <span>{sourceSummary.totalChars.toLocaleString()} chars</span>
                  <span>{sourceSummary.labels.join(", ") || "No source types yet"}</span>
                </div>
              </div>

              {importMessage ? <p className="inline-note">{importMessage}</p> : null}

              <div className="source-entry-grid">
                <div className="input-card">
                  <div className="mini-heading">
                    <NotebookPen size={18} />
                    <h3>Quick notes source</h3>
                  </div>
                  <input
                    className="topic-input"
                    value={manualSourceTitle}
                    onChange={(event) => setManualSourceTitle(event.target.value)}
                    placeholder="Faculty notes, revision sheet, handout summary..."
                  />
                  <textarea
                    className="source-input compact"
                    value={manualSourceContent}
                    onChange={(event) => setManualSourceContent(event.target.value)}
                    placeholder="Paste the important points from your notes here..."
                  />
                  <button className="secondary-action" type="button" onClick={addManualSource}>
                    Save notes source
                  </button>
                </div>

                <div className="input-card">
                  <div className="mini-heading">
                    <Link2 size={18} />
                    <h3>YouTube or web link</h3>
                  </div>
                  <input
                    className="topic-input"
                    value={linkTitle}
                    onChange={(event) => setLinkTitle(event.target.value)}
                    placeholder="Source title"
                  />
                  <input
                    className="topic-input"
                    value={linkUrl}
                    onChange={(event) => setLinkUrl(event.target.value)}
                    placeholder="https://youtube.com/... or https://..."
                  />
                  <textarea
                    className="source-input compact"
                    value={linkNotes}
                    onChange={(event) => setLinkNotes(event.target.value)}
                    placeholder="Optional notes, timestamp takeaways, or summary from this link..."
                  />
                  <button className="secondary-action" type="button" onClick={addLinkSource}>
                    Add linked source
                  </button>
                </div>
              </div>

              <div className="source-list">
                {sources.length ? (
                  sources.map((source) => (
                    <article className="source-card" key={source.id}>
                      <div className="source-card-top">
                        <div>
                          <span className="source-type-tag">{source.type.toUpperCase()}</span>
                          <h3>{source.title}</h3>
                          <p className="source-meta">{source.fileName ?? source.url ?? "Manual study source"}</p>
                        </div>
                        <button className="icon-button" type="button" onClick={() => removeSource(source.id)} aria-label={`Remove ${source.title}`}>
                          <Trash2 size={16} />
                        </button>
                      </div>
                      <p className="source-preview">{source.content.slice(0, 280) || "No extracted text preview yet."}</p>
                    </article>
                  ))
                ) : (
                  <div className="empty-block">
                    <h3>No sources yet</h3>
                    <p>Import files, add links, or paste notes so the mentor can compare your answer against all of them together.</p>
                  </div>
                )}
              </div>
            </section>

            <section className="workspace-card">
              <div className="panel-heading">
                <MessageSquareText size={20} />
                <div>
                  <h2>Practice lab</h2>
                  <p>Choose how you want to answer: spoken, text, or video-assisted practice.</p>
                </div>
              </div>

              <div className="mode-toggle-row">
                {practiceModes.map((mode) => (
                  <button
                    className={practiceMode === mode.mode ? "mode-toggle active" : "mode-toggle"}
                    key={mode.mode}
                    type="button"
                    onClick={() => {
                      setPracticeMode(mode.mode);
                      clearJudgementState();
                    }}
                  >
                    <span>{mode.label}</span>
                    <small>{mode.summary}</small>
                  </button>
                ))}
              </div>

              <section className="input-card topic-card">
                <div className="mini-heading">
                  <Brain size={18} />
                  <h3>Practice prompt</h3>
                </div>
                <input
                  className="topic-input"
                  value={topic}
                  onChange={(event) => {
                    setTopic(event.target.value);
                    clearJudgementState();
                  }}
                  aria-label="Practice topic"
                  placeholder="Explain your answer goal, interview question, or study topic..."
                />
              </section>

              {practiceMode === "spoken" || practiceMode === "video" ? (
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
                      <span className="empty-transcript">Use live captions to capture your answer while you speak.</span>
                    )}
                  </div>

                  {speechError ? <p className="inline-alert">{speechError}</p> : null}

                  <div className="action-row">
                    <button className={isListening ? "primary-action active" : "primary-action"} type="button" onClick={isListening ? stopListening : startListening}>
                      {isListening ? <MicOff size={18} /> : <Mic size={18} />}
                      {isListening ? "Stop live captions" : "Start live captions"}
                    </button>
                  </div>
                </section>
              ) : null}

              {practiceMode === "text" || practiceMode === "video" ? (
                <section className="input-card">
                  <div className="mini-heading">
                    <MessageSquareText size={18} />
                    <h3>Typed answer / chat draft</h3>
                  </div>
                  <textarea
                    className="source-input answer-box"
                    value={typedResponse}
                    onChange={(event) => {
                      setTypedResponse(event.target.value);
                      clearJudgementState();
                    }}
                    placeholder="Type your explanation, structured answer, or chat-style draft here..."
                  />
                </section>
              ) : null}

              {practiceMode === "video" ? (
                <section className="video-practice-grid">
                  <div className="input-card">
                    <div className="mini-heading">
                      <Video size={18} />
                      <h3>Body language practice</h3>
                    </div>
                    <div className="camera-frame">
                      {isCameraOn ? <video autoPlay muted playsInline ref={videoRef} /> : <p>Turn on your camera to practice eye contact, posture, and confidence.</p>}
                    </div>
                    {cameraError ? <p className="inline-alert">{cameraError}</p> : null}
                    <div className="action-row">
                      <button className="primary-action" type="button" onClick={isCameraOn ? stopCamera : startCamera}>
                        <Camera size={18} />
                        {isCameraOn ? "Stop camera" : "Start camera"}
                      </button>
                    </div>
                  </div>

                  <div className="input-card">
                    <div className="mini-heading">
                      <NotebookPen size={18} />
                      <h3>Body language notes</h3>
                    </div>
                    <textarea
                      className="source-input answer-box"
                      value={bodyLanguageNotes}
                      onChange={(event) => {
                        setBodyLanguageNotes(event.target.value);
                        clearJudgementState();
                      }}
                      placeholder="Add self-review notes like: eye contact weak, too much looking down, posture okay, hand movements stiff..."
                    />
                  </div>
                </section>
              ) : null}

              <div className="action-row">
                <button className="secondary-action judge-action" type="button" onClick={judgeSession} disabled={!canJudge}>
                  <Brain size={18} />
                  {isJudging ? "Judging..." : "Judge explanation"}
                </button>

                <button className="ghost-action" type="button" onClick={resetPractice}>
                  Clear current response
                </button>
              </div>
            </section>
          </div>

          <aside className="feedback-panel">
            <div className="panel-heading report-heading">
              <Brain size={20} />
              <div>
                <h2>Mentor report</h2>
                <p>The judge uses every source in the pack, not just one file.</p>
              </div>
            </div>

            {judgementError ? (
              <div className="feedback-block error-block">
                <h3>Setup needed</h3>
                <p>{judgementError}</p>
              </div>
            ) : null}

            {!judgementError && !report ? (
              <div className="feedback-block empty-judge-state">
                <h3>Ready to review</h3>
                <p>Import or add multiple sources, answer in any mode, then ask the mentor to judge your clarity and coverage.</p>
              </div>
            ) : null}

            {isJudging ? (
              <div className="feedback-block thinking-state">
                <h3>Mentor is thinking</h3>
                <p>Comparing your answer with the full study pack and shaping the next coaching step.</p>
              </div>
            ) : null}

            {report ? (
              <>
                <div className="feedback-block feature-block">
                  <h3>Source main idea</h3>
                  <p>{report.sourceMainIdea}</p>
                </div>

                <div className="feedback-block feature-block">
                  <h3>Understood points</h3>
                  {report.understoodPoints.map((item) => (
                    <p key={item}>{item}</p>
                  ))}
                </div>

                <div className="feedback-block feature-block">
                  <h3>Missing points</h3>
                  {report.missingPoints.map((item) => (
                    <p key={item}>{item}</p>
                  ))}
                </div>

                <div className="feedback-block feature-block">
                  <h3>Clarity advice</h3>
                  {report.clarityAdvice.map((item) => (
                    <p key={item}>{item}</p>
                  ))}
                </div>

                <div className="feedback-block feature-block">
                  <h3>Confidence signals</h3>
                  {report.confidenceSignals.map((item) => (
                    <p key={item}>{item}</p>
                  ))}
                </div>

                <div className="feedback-block feature-block">
                  <h3>Body language reminders</h3>
                  {report.bodyLanguageAdvice.map((item) => (
                    <p key={item}>{item}</p>
                  ))}
                </div>

                <div className="feedback-block feature-block final-block">
                  <h3>Follow-up question</h3>
                  <p>{report.followUpQuestion}</p>
                </div>
              </>
            ) : null}
          </aside>
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
