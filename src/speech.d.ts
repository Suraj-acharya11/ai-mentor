// This file teaches TypeScript about the browser SpeechRecognition API.
// Some browsers expose this API, but TypeScript does not always know its types.

// One possible transcript returned by speech recognition.
interface SpeechRecognitionAlternative {
  // The text that the speech recognizer heard.
  transcript: string;

  // How confident the recognizer is, from 0 to 1.
  confidence: number;
}

// One recognition result can contain one or more alternative transcripts.
interface SpeechRecognitionResult {
  // true means this phrase is final; false means it is still changing live.
  readonly isFinal: boolean;

  // Number of transcript alternatives in this result.
  readonly length: number;

  // Lets us read an alternative by index.
  item(index: number): SpeechRecognitionAlternative;

  // Lets us use result[0] style access.
  [index: number]: SpeechRecognitionAlternative;
}

// A list of speech recognition results.
interface SpeechRecognitionResultList {
  // Number of results in the list.
  readonly length: number;

  // Lets us read a result by index.
  item(index: number): SpeechRecognitionResult;

  // Lets us use results[0] style access.
  [index: number]: SpeechRecognitionResult;
}

// Event fired whenever speech recognition produces text.
interface SpeechRecognitionEvent extends Event {
  // Where the new results start inside the results list.
  readonly resultIndex: number;

  // The full list of recognition results.
  readonly results: SpeechRecognitionResultList;
}

// Event fired when speech recognition fails.
interface SpeechRecognitionErrorEvent extends Event {
  // Short error code, like "not-allowed" or "network".
  readonly error: string;

  // Longer error message if the browser provides one.
  readonly message: string;
}

// The speech recognizer object itself.
interface SpeechRecognition extends EventTarget {
  // true means keep listening instead of stopping after one phrase.
  continuous: boolean;

  // true means show partial text while the person is still speaking.
  interimResults: boolean;

  // Language code, for example "en-IN" or "ta-IN".
  lang: string;

  // Function called when new speech text arrives.
  onresult: ((event: SpeechRecognitionEvent) => void) | null;

  // Function called when recognition has an error.
  onerror: ((event: SpeechRecognitionErrorEvent) => void) | null;

  // Function called when listening stops.
  onend: (() => void) | null;

  // Starts listening.
  start(): void;

  // Stops listening.
  stop(): void;
}

// Constructor type so we can call: new SpeechRecognition().
interface SpeechRecognitionConstructor {
  new (): SpeechRecognition;
}

// One structured report returned by the LLM judge.
type JudgementReport = {
  score: number;
  sourceMainIdea: string;
  understoodPoints: string[];
  missingPoints: string[];
  clarityAdvice: string[];
  followUpQuestion: string;
};

// Extra properties that may exist on the browser window.
interface Window {
  // Standard browser name for the speech recognition constructor.
  SpeechRecognition?: SpeechRecognitionConstructor;

  // Chrome/Electron often exposes the API using this older prefixed name.
  webkitSpeechRecognition?: SpeechRecognitionConstructor;

  // Safe desktop info exposed from electron/preload.cjs.
  mentorDesktop?: {
    // Current operating system, for example "win32".
    platform: string;

    // Ask the desktop side to judge the current explanation.
    judgeSpeech?: (input: {
      sourceText: string;
      transcript: string;
      languageSpace: "Tamil" | "Hindi" | "Kannada" | "English";
      settings: {
        openRouterApiKey: string;
        openRouterModel: string;
        ollamaModel: string;
      };
    }) => Promise<JudgementReport>;
  };
}
