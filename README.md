# Context-to-Action System

A small personal knowledge and task system for the Damco build challenge.

The product thesis is simple: capturing notes and tasks is not enough. The useful behavior is deciding what to do next, using the context inside recent notes, deadlines, and task state.

## Current Status

Phase 2 linking is complete:

- Root-level Next.js app with TypeScript.
- Prisma plus SQLite for local development.
- Note and task capture flows with create, list, detail, and update paths.
- Basic tag support across notes and tasks.
- Note-task linking from detail pages using the relational join model.
- Vitest integration coverage for health, database, notes API, tasks API, and link lifecycle behavior.
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
4. Initialize the local database with `npm run db:migrate -- --name init`.
5. Start the app with `npm run dev`.

The default local database URL is `file:./dev.db`, which Prisma stores as `prisma/dev.db` relative to the schema directory.

## Scripts

- `npm run dev`: start the local development server.
- `npm run build`: create a production build.
- `npm run lint`: run the Next.js lint checks.
- `npm run test`: prepare the test database and run the integration tests.
- `npm run test:watch`: prepare the test database and watch the test suite.
- `npm run db:generate`: regenerate Prisma client.
- `npm run db:migrate`: run Prisma migrations against the active database URL.
- `npm run db:push`: push the schema without creating a migration.
- `npm run db:studio`: inspect the database locally.

## Environment Variables

- `DATABASE_URL`: Prisma connection string for the app database.
- `GEMINI_API_KEY`: reserved for the recommendation phase.
- `AI_PROVIDER`: future provider selection flag.
- `NEXT_PUBLIC_APP_NAME`: display name used by the app and health route.

## Phase 2 Exit Criteria

Phase 2 is complete when:

- Notes and tasks can be linked and unlinked through the application boundary.
- The detail UI shows linked context without manual database edits.
- Integration tests, lint, and production build all pass for the slice.

## Next Phases

The next slices add recommendation ranking and weekly summaries. The detailed phase plan lives in `ROADMAP.md`, and the project operating rules live in `AGENTS.md`.


