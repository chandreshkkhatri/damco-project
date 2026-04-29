# Context-to-Action System

A small personal knowledge and task system for the Damco build challenge.

The product thesis is simple: capturing notes and tasks is not enough. The useful behavior is deciding what to do next, using the context inside recent notes, deadlines, and task state.

## Current Status

Phase 4 weekly summaries are implemented:

- Root-level Next.js app with TypeScript.
- Prisma plus SQLite for local development.
- Note and task capture flows with create, list, detail, and update paths.
- Basic tag support across notes and tasks.
- Note-task linking from detail pages using the relational join model.
- Today view with top-three deterministic task recommendations and optional Gemini explanation text.
- Weekly view with deterministic completed-work, carry-forward, recent-note, and theme summaries plus optional Gemini wording.
- Vitest integration coverage for health, database, notes API, tasks API, link lifecycle behavior, recommendation ranking, and weekly summaries.
- Production build and lint checks passing for the current slice.

## Stack

- Next.js App Router
- TypeScript
- Prisma ORM
- SQLite for local development
- Vitest for integration testing

## Domain Model

- `Note`: captured context in markdown-friendly text.
- `Task`: user commitments with status, deadline, and priority.
- `NoteTaskLink`: many-to-many link between notes and tasks.
- `ActivityEvent`: event log that later phases can use for recency and summaries.

## Getting Started

1. Copy `.env.example` to `.env`.
2. Install dependencies with `npm install`.
3. Generate Prisma client with `npm run db:generate`.
4. Initialize the local database with `npm run db:push`.
5. Start the app with `npm run dev`.

The default local database URL is `file:./dev.db`, which Prisma stores as `prisma/dev.db` relative to the schema directory.

## Scripts

- `npm run dev`: start the local development server.
- `npm run build`: create a production build.
- `npm run lint`: run the ESLint checks.
- `npm run test`: prepare the test database and run the integration tests.
- `npm run test:watch`: prepare the test database and watch the test suite.
- `npm run db:generate`: regenerate Prisma client.
- `npm run db:migrate`: run Prisma migrations against the active database URL.
- `npm run db:push`: push the schema without creating a migration.
- `npm run db:studio`: inspect the database locally.

## Environment Variables

- `DATABASE_URL`: Prisma connection string for the app database.
- `GEMINI_API_KEY`: optional Gemini key for AI-assisted recommendation explanations and weekly summary wording.
- `AI_PROVIDER`: optional provider selection flag. Leave unset or use `gemini` for the built-in provider.
- `NEXT_PUBLIC_APP_NAME`: display name used by the app and health route.

## QA Directions

Run automated validation first:

1. `npm run test`
2. `npm run lint`
3. `CI=1 npm run build`

Then run `npm run dev` and smoke-test the app locally:

1. Open `/api/health` and verify the response includes `status`, `service`, and `timestamp`.
2. Open `/notes`, create a note with content, create another with comma-separated tags, and verify both appear in the list.
3. Open a note detail page, update its content or tags, save, reload, and verify the update persists.
4. Open `/tasks`, create a task with only a title, and verify it appears with `TODO` status and `MEDIUM` priority.
5. Open a task detail page, update deadline, priority, tags, and status to `IN_PROGRESS`, save, reload, and verify the update persists.
6. Change a task status to `DONE` and verify it remains visible in the task list but is excluded from Today recommendations.
7. Create at least one note and one task, open the note detail page, link the task, and verify the linked task appears on the note.
8. Open the linked task detail page and verify the note appears in linked notes.
9. Unlink from either detail page and verify the relationship disappears from both sides.
10. Return to `/` and verify Today shows at most three open tasks with scores, reason chips, and deterministic fallback explanations when no Gemini key is configured.
11. Open `/weekly` and verify the page shows the current week, completed work, carry-forward open work, recent notes, themes, and deterministic fallback wording without requiring a Gemini key.
12. Optional AI smoke test: set `AI_PROVIDER=gemini` and `GEMINI_API_KEY`, restart the dev server, open `/weekly`, and verify only the summary prose switches to AI-assisted wording while the grouped evidence stays the same.

## Phase 4 Exit Criteria

Phase 4 is complete when:

- The Weekly page answers what happened this week without manual database edits.
- Completed tasks, carry-forward open tasks, recent notes, and themes are separated clearly.
- Older notes and tasks outside the weekly window do not pollute the summary.
- AI wording failure or missing API keys fall back to deterministic summary text.
- Integration tests, lint, and production build all pass for the slice.

## Next Phases

The next slice prepares the project for the final submission. The detailed phase plan lives in `ROADMAP.md`, and the project operating rules live in `AGENTS.md`.


