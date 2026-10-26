# GapFinder AI

GapFinder helps students find what to study next from their own syllabus, notes, textbook extracts, and past papers. Each student creates an account, uploads their own material, gets a topic map, completes cited diagnostics, and receives a revision plan based on their results.

## Start locally

Requirements: Node.js 22 or newer.

```bash
npm install
npm run dev
```

Open `http://localhost:3000`, create an account, and upload a PDF, TXT, or Markdown file. New accounts start empty: there are no shared sample documents, seeded topics, demo credentials, or inherited progress. Workspaces are stored in the local SQLite file `data/gapfinder.sqlite`, which is ignored by Git.

For generated tutor explanations, diagnostic questions, and semantic answer evaluation, create `.env.local`:

```env
GEMINI_API_KEY=your_google_ai_studio_key
GEMINI_MODEL=gemini-2.5-flash
```

The key is used only in the server-side study route; do not use a `NEXT_PUBLIC_` prefix. Without a key, topic mapping, lexical retrieval, source-cited answers, excerpt-based questions, and exact-reference answer feedback still work locally.

## Student workflow

1. Create an account with name, email, and a password of at least 12 characters, or sign in to an existing account.
2. Upload the student's own syllabus, notes, textbook extract, or past paper. PDFs with selectable text are parsed server-side; scanned image-only PDFs need OCR first.
3. GapFinder maps headings and sections in those sources into unassessed topics.
4. A diagnostic generates multiple-choice questions from the student's retrieved excerpts. Each question has a source document/section; answers receive feedback and a citation.
5. Completed diagnostics update topic confidence and reorder revision sessions. Sessions and progress are saved in that student's workspace.
6. The tutor retrieves source chunks before answering and returns passage citations. With Gemini configured, generation receives only the retrieved excerpts and the student's prompt.

## Architecture

```text
Next.js App Router + TypeScript
  ├─ /api/auth: account registration, sign-in, session validation, sign-out
  ├─ HTTP-only same-site session cookie; only a token hash is stored
  ├─ SQLite: users, sessions, and user-scoped documents/topics/tasks/activity
  ├─ /api/materials/parse: server-side PDF text extraction (unpdf)
  ├─ /api/workspace: authenticated, per-user workspace persistence
  ├─ /api/study: chunking → lexical retrieval → optional Gemini generation
  └─ /api/activity: consented, in-app learning activity only
```

Passwords are salted and hashed with Node's scrypt. Session cookies are HTTP-only, same-site, and secure in production. Workspace tables include a `user_id`; reads, writes, exports, and activity queries are scoped to the authenticated user.

The SQLite database is initialized automatically under `data/gapfinder.sqlite`. Back up the file with the server stopped or use the authenticated **Data & privacy → Export backup** control. The activity feature is off by default. If enabled, it records pages/topics opened, visible study time, completed sessions, and diagnostic scores; it does not monitor device-wide activity, browser history, other apps, keystrokes, or raw tutor messages.

## Retrieval and generation

- Uploaded text is normalized into sections and chunks. The current retrieval baseline scores token overlap at request time; it does not use embeddings or a vector database.
- Chat and question generation receive only the highest-ranked material excerpts. Responses cite the source title and section. If Gemini is unavailable, answers and questions use those excerpts directly.
- Local answer evaluation compares the selected answer against the source-backed key. Gemini-backed evaluation can assess equivalent wording against the same source excerpt.
- Topic confidence starts as **Unassessed**, not a fabricated score. Diagnostic results update mapped topics and reorder the personalized revision plan.

## Deployment and limitations

This is a functional self-hosted account prototype, not a hardened public identity service. Before exposing it to students on the internet, deploy behind HTTPS, use persistent managed storage or managed PostgreSQL, add sign-in rate limiting and email verification, configure backups and account deletion, review privacy/retention requirements, and test authorization boundaries. SQLite must live on a persistent writable volume; ephemeral serverless filesystems will lose account data.

Other next steps include OCR, embedding-based retrieval with pgvector, broader file formats, teacher/class analytics, measured confidence calibration, spaced repetition, and LMS integrations. Topic mapping and confidence estimates should be evaluated on real course material before being used for high-stakes decisions.