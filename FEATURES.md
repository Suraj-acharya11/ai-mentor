# AI Mentor Features

## Current App Capabilities

- Multi-source study packs:
  - Import multiple `PDF`, `PPTX`, `DOCX`, `TXT`, and `MD` files at the same time.
  - Add manual note sources for faculty material or personal revision notes.
  - Add `YouTube` or general web links with optional notes so they can still be part of the study pack.
- Mixed-source judging:
  - The mentor judges one answer against the full source pack instead of only one pasted source.
  - The report is designed to show what the learner understood across all the added materials.
- Multiple practice modes:
  - `Speak`: live speech-to-text explanation capture.
  - `Chat / Text`: typed answer or draft response mode.
  - `Video + Body Language`: camera-based practice plus self-review notes for posture, eye contact, and confidence.
- Mentor report output:
  - score
  - source main idea
  - understood points
  - missing points
  - clarity advice
  - confidence signals
  - body language reminders
  - follow-up question
- Language practice spaces:
  - English
  - Tamil
  - Hindi
  - Kannada
- Judge provider flow:
  - `OpenRouter` first
  - `Ollama` local fallback
- Draft persistence:
  - keeps current topic, source pack, language mode, typed answer, transcript, and body-language notes in local storage

## Important Notes

- YouTube links are accepted as study sources, but the app currently uses the link plus any user-added notes. It does not fetch or transcribe the video automatically.
- Video mode currently supports camera-based practice and body-language self-review notes. It does not yet perform automatic computer-vision scoring on gestures or posture.
- Speech capture depends on the browser/Electron speech-recognition capability available in the current desktop environment.

## What Makes This Different From Airlearn

- Focuses on `explain-back` practice rather than short lesson drills.
- Lets learners combine many study resources into one judged answer.
- Supports source-aware speaking, text answering, and video-assisted reflection in one workspace.
- Optimized for clarity, understanding, and response confidence rather than only vocabulary or grammar practice.
