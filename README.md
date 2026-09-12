# Horizon Works AI

Horizon AI is the internal operating layer for Horizon Works.

## Purpose

Talk naturally to Horizon. It uses Gemini, workspace context, persistent memory, automatic organization, knowledge retrieval, controlled tools, agents, proactive intelligence, audit history, and daily intelligence to help run the business.

## Stack

- Vite + React + TypeScript
- Vercel serverless API routes
- Gemini via server-side `GEMINI_KEY`
- Optional Upstash/Vercel KV for persistent memory, knowledge, and audit storage

## Local development

```bash
npm install
npm run dev
```

## Required Vercel environment variables

```text
GEMINI_KEY=
GEMINI_MODEL=gemini-2.5-flash
```

For persistent storage:

```text
KV_REST_API_URL=
KV_REST_API_TOKEN=
```

The browser only talks to the Horizon API routes; Gemini credentials stay server-side.
