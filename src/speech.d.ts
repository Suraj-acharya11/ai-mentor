interface SpeechRecognitionAlternative {
  transcript: string;
  confidence: number;
}

interface SpeechRecognitionResult {
  readonly isFinal: boolean;
  readonly length: number;
  item(index: number): SpeechRecognitionAlternative;
  [index: number]: SpeechRecognitionAlternative;
}

interface SpeechRecognitionResultList {
  readonly length: number;
  item(index: number): SpeechRecognitionResult;
  [index: number]: SpeechRecognitionResult;
}

interface SpeechRecognitionEvent extends Event {
  readonly resultIndex: number;
  readonly results: SpeechRecognitionResultList;
}

interface SpeechRecognitionErrorEvent extends Event {
  readonly error: string;
  readonly message: string;
}

interface SpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEvent) => void) | null;
  onend: (() => void) | null;
  start(): void;
  stop(): void;
}

interface SpeechRecognitionConstructor {
  new (): SpeechRecognition;
}

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

type ImportedSourcesResult = {
  sources: StudySource[];
  warnings: string[];
};

interface Window {
  SpeechRecognition?: SpeechRecognitionConstructor;
  webkitSpeechRecognition?: SpeechRecognitionConstructor;
  mentorDesktop?: {
    platform: string;
    pickAndImportSources?: () => Promise<ImportedSourcesResult>;
    judgeSession?: (input: {
      topic: string;
      languageSpace: LanguageSpace;
      practiceMode: PracticeMode;
      sources: StudySource[];
      responseText: string;
      bodyLanguageNotes: string;
      settings: {
        openRouterApiKey: string;
        openRouterModel: string;
        ollamaModel: string;
      };
    }) => Promise<MentorReport>;
  };
}
