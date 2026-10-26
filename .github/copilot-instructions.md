# GapFinder AI project notes

- This is a Next.js App Router application using TypeScript and Tailwind CSS.
- Keep retrieval, PDF extraction, and provider secrets in server-side route handlers. Never expose AI keys to the browser.
- Tutor answers, generated quiz questions, and evaluation must use uploaded or seeded study material and return source citations.
- Keep the preloaded Biology demo usable without external credentials; label provider-backed behavior accurately.
- Workspace documents and progress are local-demo data. Do not describe this as production authentication or secure persistent storage.
- Run `npm run lint` and `npm run build` after meaningful changes.