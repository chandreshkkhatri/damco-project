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

### Expected Files

- Services and validation: `src/server/notes.ts`, `src/server/tasks.ts`, shared helpers for tags and API error handling.
- API boundary: `src/app/api/notes/**` and `src/app/api/tasks/**`.
- UI: `src/app/notes/**`, `src/app/tasks/**`, plus small shared styling updates.
- Validation: integration tests covering create/list/detail/update flows for notes and tasks.

### Integration Tests

- Create and retrieve a note through the application boundary.
- Create, update, complete, and retrieve a task through the application boundary.
- Validate required fields and invalid payload handling.

### Exit Criteria

- Notes and tasks are persisted.
- The UI can demonstrate capture without manual database edits.
- Phase completion commit is ready after checks pass.

### Implementation Notes

- Keep tags as a normalized comma-separated field in the database for now, while exposing them as arrays at the API boundary.
- Use Zod validation in the service layer so the same rules back both UI actions and route handlers.
- Prefer simple server-rendered pages and forms over client-heavy state management in this phase.

### Completion Notes

- Notes and tasks now support create, list, detail, and update flows through shared services, route handlers, and server actions.
- The capture UI is implemented with server-rendered forms so the phase stays simple and easy to demo.
- Integration coverage now protects note and task validation plus create/list/detail/update application-boundary behavior.
- Prisma client initialization is lazy and the capture pages are marked dynamic so tests and production builds do not depend on import-time database environment setup.

## Phase 2: Linking Layer

### Goal

Connect notes and tasks through the existing `NoteTaskLink` join model so linked context can inform ranking decisions and weekly summaries.

### Scope

- Implement shared link and unlink operations in `src/server/links.ts`.
- Update `src/server/notes.ts` and `src/server/tasks.ts` so detail reads include linked entities.
- Add note-owned nested routes in `src/app/api/notes/[noteId]/links/route.ts` and `src/app/api/notes/[noteId]/links/[taskId]/route.ts` for listing, creating, and removing links.
- Add link management controls on `src/app/notes/[noteId]/page.tsx` and `src/app/tasks/[taskId]/page.tsx`.
- Reuse the same linking logic from `src/app/notes/actions.ts` and `src/app/tasks/actions.ts`.
- Prevent duplicate links and return stable validation or not-found errors for invalid combinations.

### Expected Files

- New service: `src/server/links.ts`.
- Updated services: `src/server/notes.ts`, `src/server/tasks.ts`.
- API boundary: `src/app/api/notes/[noteId]/links/route.ts`, `src/app/api/notes/[noteId]/links/[taskId]/route.ts`.
- UI and actions: `src/app/notes/[noteId]/page.tsx`, `src/app/tasks/[taskId]/page.tsx`, `src/app/notes/actions.ts`, `src/app/tasks/actions.ts`.
- Validation: `tests/integration/links-api.test.ts`.

### Test Strategy

- Exercise link creation, removal, and detail reads through the application boundary rather than direct Prisma writes.
- Verify detail reads return linked tasks for a note and linked notes for a task after linking, and relationships are cleared after unlinking.
- Verify duplicate link attempts fail cleanly without creating extra join rows.
- Use small fixtures: create one note and one task, link them, assert both sides, unlink them, assert both sides are clear.

### Integration Tests

- Link a note to a task and verify both sides can retrieve the relationship.
- Unlink a note from a task and verify the relationship is removed.
- Prevent duplicate links.
- Return a stable error when the note or task for a requested link does not exist.

### Exit Criteria

- Links can be created and removed from the UI without manual database edits.
- Note and task detail pages display their linked counterparts.
- Relationship behavior is covered by integration tests.
- Phase completion commit is ready after checks pass.

### Implementation Notes

- The `NoteTaskLink` schema already exists, so this phase should not expand the data model unless a small naming cleanup is strictly required.
- Keep link mutations in `src/server/links.ts` so routes and server actions share one application-layer path.
- Link management endpoints exist only under note routes (`/api/notes/[noteId]/links/**`); task detail pages manage links through shared server actions and services to avoid duplicating the API surface.
- Keep the UI work centered on the existing detail pages instead of adding new index screens or search-heavy flows.
- Prefer selecting from existing notes and tasks with minimal forms over introducing recommendation or bulk-linking behavior in this phase.

### Completion Notes

- Notes and tasks can now be linked and unlinked through a shared link service, note-owned routes, server actions, and detail-page controls.
- Note detail reads include linked tasks and task detail reads include linked notes, while list reads stay narrow.
- Duplicate links return a stable conflict response instead of surfacing a generic database error.
- Vitest now runs integration files sequentially because the suite shares one SQLite test database.
- Test database preparation now focuses on resetting and pushing the schema; Prisma client generation remains available through `postinstall` and `npm run db:generate`.

## Phase 3: Recommendation Engine

### Goal

Build the core assessment differentiator: a deterministic decision engine that recommends the top three next actions and can optionally enrich the explanation with AI.

### Scope

- Add `src/server/recommendations.ts` to rank open tasks and return a recommendation DTO with task details, score, structured reason breakdown, linked note context, explanation text, and explanation source.
- Score tasks using existing fields only: deadline proximity, priority, status momentum, task freshness, and linked-note recency.
- Add an AI service boundary under `src/server/ai/` with an injectable Gemini-backed implementation that can turn score signals into short user-facing reasoning.
- Keep deterministic scoring as the source of truth and use AI only for explanation text, never for ranking.
- Add fallback behavior when no API key is configured or the provider call fails.
- Build the Today page at `src/app/page.tsx` to show the top three recommendations, score reasons, and the fallback state when there are fewer than three actionable tasks.

### Expected Files

- New recommendation service: `src/server/recommendations.ts`.
- New AI boundary: `src/server/ai/provider.ts`, `src/server/ai/gemini.ts`, and `src/server/ai/index.ts`.
- UI entry point: `src/app/page.tsx`.
- Possible navigation or metadata touch-up: `src/app/layout.tsx`.
- Validation: `tests/integration/recommendations.test.ts`.

### Test Strategy

- Test recommendation behavior through the application layer with real Prisma reads and writes, but no live AI calls.
- Create small fixtures with controlled deadlines, priorities, statuses, and linked notes so ordering is easy to reason about.
- Mock or stub the AI provider boundary to verify both explanation success and deterministic fallback behavior.
- Keep the Today page thin and validate it through TypeScript, lint, and production build rather than adding UI test tooling in this phase.
- Assert both ordering and explanation metadata so the ranking stays explainable during later phases.

### Integration Tests

- Verify urgent tasks outrank non-urgent tasks when other factors are equal.
- Verify completed tasks are excluded.
- Verify linked recent notes can influence ranking.
- Verify AI failure falls back to deterministic recommendations.
- Verify the service returns at most the top three actionable recommendations in stable order.
- Verify AI success can replace deterministic explanation text without changing rank order.

### Exit Criteria

- Today page can be demoed from seeded or manually entered data without hidden setup.
- Recommendation logic is covered without requiring a live AI call.
- The ranking output is explainable enough to defend in the interview.
- Phase completion commit is ready after checks pass.

### Implementation Notes

- This phase should avoid schema changes unless a concrete scoring gap appears during implementation.
- The existing `ActivityEvent` model is out of scope for now; use current task and linked-note fields first.
- Prefer a simple weighted scoring model that can be read and defended quickly during the demo.
- Return structured reasons from the recommendation service so the UI and tests can assert the same ranking logic.
- Keep the root `/` route as the Today view because existing navigation already points there as the overview.
- Use the initial explainable weights: deadline proximity 40 points, priority 25, status momentum 15, linked-note recency 15, and task update freshness 5.
- Use a dedicated eager Prisma query for open tasks and linked notes so recommendation composition does not introduce N+1 reads.
- Keep AI provider and clock injection available in the recommendation service so tests avoid live API calls and date flakiness.
- Do not add a public recommendation API route unless a later phase needs it; the server-rendered Today page can call the service directly.

### Completion Notes

- The Today page at `/` now renders at most three open-task recommendations with scores, reason chips, linked note context, and explanation source.
- `src/server/recommendations.ts` ranks open tasks with a deterministic weighted model and excludes `DONE` tasks.
- `src/server/ai/` contains an injectable explanation provider boundary and fetch-based Gemini provider; missing keys or provider failures fall back to deterministic explanations.
- Recommendation integration tests cover urgency, completed-task exclusion, linked-note influence, top-three limiting, AI explanation success, and AI fallback.

## Phase 4: Weekly Query Layer

### Goal

Answer the demo question: "What did I work on this week?"

### Scope

- Add a weekly summary service that answers the question from existing notes, tasks, and note-task links.
- Define the default week as local Monday 00:00 through the current time, with clock injection for tests.
- Summarize completed tasks, carry-forward pending tasks, recent notes, dominant themes, and the exact summary period.
- Use deterministic grouping and evidence selection as the source of truth, then optionally let AI rewrite only the summary prose.
- Add a dedicated server-rendered `/weekly` page that calls the service directly and is discoverable from the existing navigation.
- Avoid schema changes and avoid depending on `ActivityEvent`, since no event capture behavior writes to it yet.

### Expected Files

- New service: `src/server/weekly-summary.ts`.
- Updated AI boundary: `src/server/ai/provider.ts`, `src/server/ai/gemini.ts`, and `src/server/ai/index.ts`.
- UI: `src/app/weekly/page.tsx`, plus navigation updates where the current page navigation lives.
- Documentation: `README.md` QA directions and status.
- Validation: `tests/integration/weekly-summary.test.ts`.

### Test Strategy

- Test weekly summary behavior through the service with real Prisma reads and writes, but no live AI calls.
- Use a fixed `now` so Monday week boundaries and older-item behavior are deterministic.
- Seed completed tasks, open tasks, recent notes, older notes, and linked context with small explicit fixtures.
- Verify AI success can replace deterministic summary prose without changing grouped evidence.
- Verify AI failure falls back to the deterministic summary.
- Validate the `/weekly` page through TypeScript, lint, and production build rather than adding frontend test tooling in this phase.

### Integration Tests

- Verify weekly summary includes completed work from the current week.
- Verify pending work is separated from completed work.
- Verify older notes/tasks are excluded or clearly marked as outside the period.
- Verify dominant themes are derived from tags when tags are present.
- Verify AI success updates only summary wording while preserving deterministic evidence.
- Verify AI fallback produces a useful deterministic summary.

### Exit Criteria

- Weekly query can be demoed with predictable data.
- Summary behavior is covered without requiring a live AI call.
- `/weekly` works without `GEMINI_API_KEY` and clearly indicates deterministic fallback wording.
- AI wording does not introduce unsupported facts or alter grouped evidence.
- Phase completion commit is ready after checks pass.

### Implementation Notes

- Prefer `getWeeklySummary()` and `WeeklySummaryDto` names to keep the phase framed as a computed feature rather than a chat endpoint.
- Keep completed tasks as the strongest signal for work done, recent notes as context, and open due or recently updated tasks as carry-forward work.
- Prefer tag-based theme extraction; use simple content/title keywords only when tags are absent.
- Add weekly-summary-specific provider types instead of overloading recommendation explanation types.
- Use the same fetch-based Gemini implementation and timeout behavior already used for recommendation explanations.
- Do not add a public weekly summary API route unless a later phase needs one; the server-rendered page can call the service directly.

### Completion Notes

- The `/weekly` page now answers the weekly summary question with completed tasks, carry-forward tasks, recent notes, theme counts, summary text, and summary source.
- `src/server/weekly-summary.ts` computes the week as local Monday 00:00 through the current time and keeps deterministic evidence selection independent from AI wording.
- The AI boundary now includes weekly-summary-specific provider types, and the Gemini provider can generate recommendation explanations or weekly summary wording with the existing timeout behavior.
- Primary navigation is shared through `src/app/primary-nav.tsx` so Today, Weekly, Notes, and Tasks stay discoverable across core pages.
- Weekly summary integration tests cover current-week evidence, older item exclusion, tag themes, AI wording success, and deterministic fallback.

## Phase 5: Polish and Submission

### Goal

Prepare the project for Damco review and the final walkthrough video.

### Scope

- Improve README setup, architecture, product narrative, and demo-flow documentation for a fresh reviewer.
- Add a deterministic seed script for a reliable local demo with notes, linked tasks, recommendations, and weekly summary evidence.
- Add an npm script for resetting/loading demo data without requiring manual database edits.
- Add a concise final walkthrough script covering problem, demo path, architecture, tradeoffs, and failure modes.
- Review environment variable docs and AI fallback behavior so the app remains demoable without live Gemini access.
- Run the full validation suite and fix regressions caused by project code.

### Expected Files

- Demo data: `scripts/seed-demo.mjs` or a similarly small root-owned script.
- Package scripts: `package.json` for a `db:seed` or `demo:seed` command.
- Documentation: `README.md` and possibly `ROADMAP.md` completion notes.
- Optional supporting docs: a short demo script section in `README.md` rather than a separate document unless the README becomes hard to scan.

### Test Strategy

- Keep existing integration tests as the regression gate for product behavior.
- Smoke-test the seed script against the local SQLite database after `npm run db:push`.
- Avoid adding Playwright unless there is a clear need and enough time; manual QA plus integration coverage is sufficient for this assessment slice.
- Do not broaden app features during polish unless a reviewer-facing gap blocks the demo.

### Integration Tests

- Run all existing integration and end-to-end tests.
- Add or adjust integration coverage only if the seed/polish work changes behavior.
- Verify seeded demo data produces at least one Today recommendation and one Weekly summary item.

### Exit Criteria

- The repo is understandable from a fresh clone.
- The demo flow is reliable.
- Seed data can recreate the demo state locally without manual database edits.
- README explains setup, architecture, core tradeoffs, AI fallback behavior, and final walkthrough flow.
- `npm run test`, `npm run lint`, and `CI=1 npm run build` pass.
- The final commit is ready after checks pass.

### Implementation Notes

- Use existing service functions where practical for seed data, or Prisma directly if that keeps the script simpler and idempotent.
- Make the seed script idempotent by clearing owned demo records or using stable unique content/title markers before recreating fixtures.
- Seed at least: two notes, three open tasks with different priorities/deadlines, one completed task for Weekly, and one note-task link that affects recommendations.
- Keep screenshots optional; prioritize a reproducible local demo over static assets.
- Treat this phase as submission readiness, not a new feature phase.

### Completion Notes

- README reviewer guidance now covers setup, architecture, demo flow, QA steps, tradeoffs, and deterministic fallback behavior.
- `scripts/seed-demo.mjs` plus `npm run db:seed` provide idempotent local demo seeding with notes, tasks, links, weekly evidence, and recommendation-friendly urgency.
- The seed flow mirrors runtime SQLite path normalization so fresh-clone setup works whether the local database URL uses `file:./dev.db` or an older `file:./prisma/...` form.
- Seed verification confirms the demo state includes open work, a completed task in the current week, recent notes, and linked context before the script exits successfully.
- Validation passed for `npm run db:push`, `npm run db:seed` twice, `npm run test`, `npm run lint`, and `CI=1 npm run build`; a refreshed local dev server also returned `200` for `/` and `/weekly` without requiring Gemini.
- Playwright, screenshots, and new product behavior remained out of scope so the phase stayed focused on submission readiness.

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
