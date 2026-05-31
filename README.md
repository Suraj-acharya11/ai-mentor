# AI Speaking Mentor

A desktop AI mentor application that helps users learn by explaining concepts aloud in their own words.

Instead of only checking grammar or generating transcripts, this project focuses on understanding-based learning. Users paste source material, explain it naturally through speech, and receive source-aware AI feedback about their understanding, clarity, and missing concepts.

Built using React, Electron, Vite, OpenRouter, and Ollama.

# Overview

The goal of this project is to create a mentor-style speaking lab where users can:

Paste study material or notes
Explain the topic back in their own words
Speak naturally in their preferred language mode
Receive AI-generated feedback on their actual understanding

The application evaluates:

What the user understood correctly
What important ideas were missed
How clearly the explanation was delivered
How the explanation can improve

This project is designed especially for practical multilingual usage and supports natural Indian speech patterns instead of forcing strict “pure language only” communication.

# Features
AI-Based Understanding Evaluation
Source-aware explanation judging
LLM-generated scoring and feedback
Focus on conceptual understanding instead of keyword matching
Speech Explanation Workflow
Live speech recognition
Real-time transcript display
Final explanation analysis
Multilingual Modes

Supports:

Tamil
Hindi
Kannada
English

Tamil mode is designed to support:

Tamil
Tanglish-style speaking
Mixed natural speech patterns
LLM Provider System

Primary provider:

OpenRouter free models

Fallback provider:

Ollama local models

This keeps the project:

low-cost
accessible
usable offline when needed
Desktop Application

Built as a desktop app using Electron.

# Tech Stack

Frontend:

React
TypeScript
Vite

Desktop Layer:

Electron

Backend Logic:

Node.js
OpenRouter API
Ollama

Speech:

Browser/Electron Speech Recognition
Current Architecture
Frontend

src/main.tsx

Main single-screen application UI
Topic input
Source material input
Transcript area
Language modes
Mentor report panel
Settings state
Electron Backend

electron/main.cjs
Handles:

Prompt construction
OpenRouter requests
Ollama fallback logic
JSON parsing
Report normalization

electron/preload.cjs

Secure Electron bridge
Safe frontend/backend communication
