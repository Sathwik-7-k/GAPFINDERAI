# GapFinder AI

GapFinder diagnoses a student's knowledge gaps from their own study materials, then turns the results into a focused revision plan. This runnable demo ships with sample A-level Biology sources and a preloaded student workspace.

## Run locally

Requirements: Node.js 22 or newer.

```bash
npm install
npm run dev
```

Open `http://localhost:3000`. The sample workspace is ready immediately; no login or API key is required for the demo. SQLite stores documents, topics, revision tasks, and attempt counts in `data/gapfinder.sqlite`; the database file is excluded from Git. This single-workspace demo has no authentication or per-student access control and must not be exposed as a production service.

To enable generated tutor explanations, quiz questions, and answer feedback, create `.env.local`:

```env
GEMINI_API_KEY=your_google_ai_studio_key
GEMINI_MODEL=gemini-2.5-flash
```

The key is read only by the server route and must never use a `NEXT_PUBLIC_` prefix. Without a key, retrieval, cited answers, source-derived quiz questions, and exact-reference answer evaluation continue in demo mode.

## What works

- Preloaded syllabus, class notes, and a past-paper excerpt with topic-level confidence and explanations.
- PDF and text/Markdown upload; selectable PDF text is extracted server-side. Scanned image-only PDFs require OCR and are reported as unsupported.
- Topic map with evidence, source references, confidence levels, and links into the tutor.
- Material-grounded diagnostic questions with citations, answer feedback, and updates to the topic map and revision plan.
- Prioritized revision sessions that can be completed and persisted in SQLite.
- An optional, user-controlled activity history for in-app pages/topics opened, visible study time, completed sessions, and quiz scores. Tracking is off by default; no device-wide activity, browser history, other apps, keystrokes, or raw tutor messages are captured.
- A Data & privacy screen to view activity, switch tracking off, clear history, and export a JSON backup of the workspace database.
- Study companion that retrieves relevant chunks from the student's sources before answering. The Gemini route receives only retrieved excerpts and the user's request.
- Responsive dashboard and sample student workspace (Amina Mercer).

## Architecture

```text
Browser workspace
  ├─ Dashboard, topic map, quiz, revision plan, tutor
  ├─ Opt-in in-app activity only (consent-controlled)
  └─ Next.js Route Handlers
       ├─ GET/POST /api/workspace: SQLite workspace persistence
       ├─ GET/POST/DELETE /api/activity: activity consent and history
       ├─ GET /api/workspace/export: downloadable JSON backup
       ├─ POST /api/materials/parse: PDF text extraction with unpdf
       └─ POST /api/study: chunking → lexical retrieval → optional Gemini generation
```

The SQLite file is created automatically on first run and is stored locally at `data/gapfinder.sqlite`. Back it up from the Data & privacy screen or copy the database file while the server is stopped.

```text
Database tables
  ├─ workspaces: demo attempt count and analytics consent
  ├─ documents: uploaded/seeded extracted text
  ├─ topics: mastery scores and explanations
  ├─ tasks: revision sessions and completion
  └─ activity_events: opted-in page/topic/session/diagnostic metadata
```

## RAG and AI workflow

1. Materials are normalized into sections and chunks; PDFs are converted to selectable text before entering the workspace.
2. `/api/study` scores chunks against the question using token overlap, then passes only the best matching excerpts to the optional Gemini call. This demo uses lexical retrieval at request time, not embeddings or a vector database.
3. Tutor answers are constrained to retrieved excerpts. The route returns matching document, section, and passage separately as citations.
4. Quiz generation receives retrieved excerpts and is asked to return source identifiers and quotes. If Gemini is unavailable or returns invalid JSON, source-derived questions use sentences from those same excerpts.
5. Answer evaluation compares the response with the source-backed answer and excerpt. Provider-backed evaluation can recognize equivalent phrasing; local demo evaluation uses exact option matching.
6. Quiz outcomes adjust topic confidence and the prioritized study list. Initial confidence values are illustrative demo data, not validated psychometric measurements.

## Limitations and next steps

- SQLite is a local, single-user demo database with no authentication or per-student authorization. Before real student use or public deployment, add Supabase Auth, per-user data isolation, managed encrypted storage, deletion controls, and a privacy/retention policy.
- Replace lexical ranking with embeddings and a persistent vector store such as pgvector; evaluate retrieval quality on real course material.
- Add OCR for scanned PDFs, broader file formats, document-level permissions, and upload malware scanning.
- Calibrate confidence with larger question sets, rubric-based evaluation, teacher review, and measured learning outcomes.
- Add class analytics, spaced-repetition reminders, more subjects/languages, and LMS integrations.
- Set `GEMINI_API_KEY` only in the server environment. Never commit secrets or send source material to a provider without appropriate consent.

## Demo workspace

The home screen opens directly into Amina Mercer's Biology · A level workspace, with syllabus, class notes, past-paper excerpt, diagnostic findings, and a starter revision plan. No shared demo password is needed because this local demo does not implement authentication.