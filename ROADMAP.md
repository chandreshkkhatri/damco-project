# Roadmap

## Project Thesis

People often capture useful context in notes and track commitments as tasks, but the two stay disconnected. This project builds a small system that links notes to tasks and recommends what to do next based on deadlines, recent context, and task state.

The assessment goal is not to clone Notion or Todoist. The goal is to show clear product judgment, system design, reliable implementation, and thoughtful tradeoffs.

## MVP Scope

### In Scope

- Create, view, and edit notes.
- Create, view, update, and complete tasks.
- Link notes to tasks through a relational join model.
- Support basic tags on notes and tasks.
- Recommend the top three next actions using deterministic scoring plus optional AI explanation.
- Answer a simple weekly summary query from notes and tasks.
- Provide integration tests at the end of each phase.

### Out of Scope

- Authentication and multi-user support.
- Real-time collaboration or sync.
- Rich Notion-style editing.
- Complex graph visualization.
- Mobile app packaging.
- Fully autonomous agent behavior.

## Proposed Architecture

- Frontend: Next.js with TypeScript.
- Backend: Next.js route handlers or server actions for the MVP.
- Database: Prisma with SQLite for local development; Postgres remains the production migration path.
- AI: Gemini API behind a small provider interface.
- Testing: Vitest for service/API integration tests and Playwright for end-to-end UI flows when the UI stabilizes.

## Core Data Model

- `Note`: markdown content, tags, timestamps.
- `Task`: title, optional description, optional deadline, status, priority, tags, timestamps.
- `NoteTaskLink`: many-to-many relationship between notes and tasks.
- `ActivityEvent`: optional event log for later recency and weekly summary features.

## Recommendation Strategy

The recommendation engine should not rely entirely on the LLM.

1. Score candidate tasks deterministically using deadline urgency, priority, status, recency, and linked note context.
2. Select the strongest candidates.
3. Ask the AI provider to explain or refine the top recommendations when an API key is available.
4. Fall back to the deterministic explanation when AI is unavailable or returns an invalid response.

## Phase 0: Foundation

### Goal

Create the runnable project foundation and lock in conventions before product features begin.

### Scope

- Scaffold the app.
- Add TypeScript, linting, formatting, and test tooling.
- Add Prisma and an initial local database setup.
- Add environment documentation.
- Add a minimal health check or smoke path.

### Expected Files

- Root config: `package.json`, `tsconfig.json`, `next.config.mjs`, `.env.example`, `.gitignore`, lint/format config.
- Prisma: `prisma/schema.prisma`.
- App shell: `src/app/layout.tsx`, `src/app/page.tsx`, `src/app/globals.css`.
- Foundation utilities: `src/lib/db.ts`, `src/app/api/health/route.ts`.
- Validation: `vitest.config.ts`, `scripts/prepare-test-db.mjs`, `tests/integration/*.test.ts`.

### Integration Tests

- Verify the app or API health path runs.
- Verify the test database can initialize cleanly.

### Exit Criteria

- Fresh clone setup is documented.
- `npm test` or the chosen equivalent runs successfully.
- The first focused commit can be made after checks pass.

### Implementation Notes

- The project uses a root-level Next.js app instead of a split client/server structure to reduce setup overhead for the assessment.
- SQLite remains the local default so the project is easy to run from a fresh clone.
- The full core relational schema is introduced in Phase 0 so later phases can focus on behavior instead of data-model churn.

## Phase 1: Capture Layer

### Goal

Allow the user to capture the two primary entities: notes and tasks.

### Scope

- Implement note create/list/detail/edit.
- Implement task create/list/detail/update/status changes.
- Add basic tags if it does not complicate the schema.
- Keep UI plain but usable.

### Integration Tests

- Create and retrieve a note through the application boundary.
- Create, update, complete, and retrieve a task through the application boundary.
- Validate required fields and invalid payload handling.

### Exit Criteria

- Notes and tasks are persisted.
- The UI can demonstrate capture without manual database edits.
- Phase completion commit is ready after checks pass.

## Phase 2: Linking Layer

### Goal

Connect notes and tasks so context can inform decisions.

### Scope

- Add the note-task join model.
- Add APIs or server actions to link and unlink notes/tasks.
- Add UI affordances to view and manage links.
- Show linked context on task detail and/or note detail views.

### Integration Tests

- Link a note to a task and verify both sides can retrieve the relationship.
- Unlink a note from a task and verify the relationship is removed.
- Prevent duplicate links.

### Exit Criteria

- Linking works from the UI.
- Relationship behavior is covered by integration tests.
- Phase completion commit is ready after checks pass.

## Phase 3: Recommendation Engine

### Goal

Build the core assessment differentiator: a decision engine that recommends the top three next actions.

### Scope

- Implement deterministic task scoring.
- Add an AI service interface with a Gemini provider.
- Add fallback behavior when no API key is configured.
- Build the Today page with top three recommendations and reasoning.

### Integration Tests

- Verify urgent tasks outrank non-urgent tasks when other factors are equal.
- Verify completed tasks are excluded.
- Verify linked recent notes can influence ranking.
- Verify AI failure falls back to deterministic recommendations.

### Exit Criteria

- Today page can be demoed with seeded or manually entered data.
- Recommendation logic is covered without requiring a live AI call.
- Phase completion commit is ready after checks pass.

## Phase 4: Weekly Query Layer

### Goal

Answer the demo question: "What did I work on this week?"

### Scope

- Add a weekly summary endpoint or server action.
- Summarize notes, completed tasks, pending tasks, and dominant themes.
- Use deterministic grouping first, then optional AI wording.
- Add UI for submitting or triggering the weekly query.

### Integration Tests

- Verify weekly summary includes completed work from the current week.
- Verify pending work is separated from completed work.
- Verify older notes/tasks are excluded or clearly marked as outside the period.
- Verify AI fallback produces a useful deterministic summary.

### Exit Criteria

- Weekly query can be demoed with predictable data.
- Summary behavior is covered without requiring a live AI call.
- Phase completion commit is ready after checks pass.

## Phase 5: Polish and Submission

### Goal

Prepare the project for Damco review and the final walkthrough video.

### Scope

- Improve README setup and architecture documentation.
- Add seed data for a reliable demo.
- Add screenshots or a short demo script if useful.
- Review failure modes and tradeoffs in the documentation.
- Run full test suite and fix regressions caused by project code.

### Integration Tests

- Run all existing integration and end-to-end tests.
- Add one happy-path demo flow test if Playwright is already configured.

### Exit Criteria

- The repo is understandable from a fresh clone.
- The demo flow is reliable.
- The final commit is ready after checks pass.

## Working Rhythm

For each phase:

1. Plan the exact scope and test strategy.
2. Implement the smallest complete slice.
3. Add integration coverage.
4. Run checks.
5. Update docs with any decisions or changes.
6. Make a focused commit after tests pass and commit authorization is clear.

## Final Video Narrative

- Problem: notes and tasks are easy to capture but hard to turn into action.
- Insight: linking context to commitments creates better prioritization signals.
- Solution: a small system with capture, linking, ranking, and AI-assisted explanation.
- Architecture: Next.js app, relational model, recommendation service, optional AI provider.
- Tradeoffs: simple local DB vs production Postgres, heuristic ranking vs LLM reasoning, batch recommendations vs real-time recalculation.
- Failure modes: AI outage, missing data, stale tasks, too much context, weak recommendations.
