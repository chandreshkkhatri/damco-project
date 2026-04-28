# Context-to-Action System

A small personal knowledge and task system for the Damco build challenge.

The product thesis is simple: capturing notes and tasks is not enough. The useful behavior is deciding what to do next, using the context inside recent notes, deadlines, and task state.

## Current Status

Phase 0 is focused on foundation work:

- Root-level Next.js app with TypeScript.
- Prisma plus SQLite for local development.
- Vitest integration checks from the start.
- A smoke-check health route at `/api/health`.
- Core relational models ready for later phases.

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

The default local database URL is `file:./prisma/dev.db`.

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

## Phase 0 Exit Criteria

Phase 0 is complete when:

- The repo is runnable from a fresh clone.
- `/api/health` returns a JSON status payload.
- The Prisma schema initializes cleanly.
- The Phase 0 integration tests pass.

## Next Phases

The next slices add note capture, task capture, linking, recommendation, and weekly summaries. The detailed phase plan lives in `ROADMAP.md`, and the project operating rules live in `AGENTS.md`.


