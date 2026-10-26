# GapFinder AI project notes

- This is a Next.js App Router application using TypeScript and Tailwind CSS.
- Keep retrieval, PDF extraction, and provider secrets in server-side route handlers. Never expose AI keys to the browser.
- Tutor answers, generated quiz questions, and evaluation must use only the signed-in student's uploaded study material and return source citations.
- New accounts must start empty; never add shared sample documents, demo credentials, or fabricated progress.
- Keep password hashes, sessions, retrieval, PDF extraction, and provider secrets server-side. Scope every workspace query and mutation to the authenticated user.
- Provider-backed generation is optional; make retrieval-only behavior useful and label provider-backed behavior accurately.
- Activity collection is opt-in and limited to in-app study actions; do not add device-wide or covert tracking.
- SQLite account storage requires persistent storage, backups, HTTPS, and sign-in abuse protections before public deployment.
- Run `npm run lint` and `npm run build` after meaningful changes.