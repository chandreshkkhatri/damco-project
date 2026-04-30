# QA Checklist

Use this checklist before recording the demo or sharing the project with a reviewer. It covers automated gates, seeded demo behavior, manual UI flows, API boundaries, fallback behavior, and documentation consistency.

## 1. Setup And Automated Gates

- [ ] Copy `.env.example` to `.env`.
- [ ] Point `DATABASE_URL` at a PostgreSQL database and confirm the connection works.
- [ ] Run `npm install` from a fresh clone or clean workspace.
- [ ] Run `npm run db:generate` and confirm Prisma Client generation succeeds.
- [ ] Run `npm run db:migrate:deploy` and confirm PostgreSQL migrations apply cleanly.
- [ ] If tests use a separate database URL, set `TEST_DATABASE_URL` or confirm the main URL can use `schema=test` safely.
- [ ] Run `npm run test` and confirm all integration tests pass.
- [ ] Run `npm run lint` and confirm there are no warnings or errors.
- [ ] Run `CI=1 npm run build` and confirm the production build completes.

## 2. Seeded Demo Readiness

- [ ] Run `npm run db:seed` once and confirm it reports 4 notes, 5 tasks, and 5 links.
- [ ] Run `npm run db:seed` a second time and confirm it removes the previous demo records before recreating them.
- [ ] Open a seeded note detail page and confirm `[damco-demo-seed]` is not visible in the editable note content.
- [ ] Open a seeded task detail page and confirm `[damco-demo-seed]` is not visible in the editable description.
- [ ] Confirm the seeded data includes an urgent open task, at least one completed current-week task, recent notes, and linked note-task context.
- [ ] Confirm the seeded urgent task is suitable for the demo narrative: deadline soon, high priority, in progress, and linked to recent notes.

## 3. Route Smoke Test

Start the app with `npm run dev`, then verify these routes return `200` and render useful content:

- [ ] `/`
- [ ] `/weekly`
- [ ] `/notes`
- [ ] `/tasks`
- [ ] One seeded note detail page at `/notes/{noteId}`
- [ ] One seeded task detail page at `/tasks/{taskId}`
- [ ] `/api/health`
- [ ] `/api/notes`
- [ ] `/api/tasks`

## 4. Notes Workflow

- [ ] Create a note with content only from `/notes`.
- [ ] Create a note with comma-separated tags from `/notes`.
- [ ] Confirm new notes appear in the notes list.
- [ ] Confirm note list items show excerpt, updated time, and visible tags.
- [ ] Open a note detail page from the list.
- [ ] Update note content, save, reload, and confirm persistence.
- [ ] Update note tags, save, reload, and confirm persistence.
- [ ] Clear visible note tags, save, reload, and confirm the visible tags are empty.
- [ ] Confirm seeded notes do not show the hidden `__damco_seed__` tag in the UI or API DTOs.
- [ ] Submit empty note content through the API and confirm a `400` validation response.
- [ ] Request a missing note through the API and confirm a `404` response.

## 5. Tasks Workflow

- [ ] Create a task with only a title from `/tasks`.
- [ ] Confirm the new task defaults to `TODO` status and `MEDIUM` priority.
- [ ] Create a task with description, deadline, status, priority, and tags.
- [ ] Confirm tasks appear in the task list with status, priority, deadline when present, and tags.
- [ ] Open a task detail page from the list.
- [ ] Update title, description, deadline, priority, status, and tags, then reload and confirm persistence.
- [ ] Mark a task `DONE` and confirm `completedAt` is set through the API response or page behavior.
- [ ] Move a completed task back to `TODO` or `IN_PROGRESS` and confirm `completedAt` clears.
- [ ] Confirm completed tasks remain visible in `/tasks`.
- [ ] Confirm completed tasks do not appear in Today recommendations.
- [ ] Submit an empty task title through the API and confirm a `400` validation response.
- [ ] Request a missing task through the API and confirm a `404` response.

## 6. Linking Workflow

- [ ] Open a note detail page and link it to an available task from the dropdown.
- [ ] Confirm the linked task appears under the note's linked tasks.
- [ ] Open that task detail page and confirm the linked note appears under linked notes.
- [ ] Unlink from the note detail page and confirm the relationship disappears from both sides.
- [ ] Link again from the task detail page and confirm the relationship appears on both sides.
- [ ] Unlink from the task detail page and confirm the relationship disappears from both sides.
- [ ] Create a duplicate link through the API and confirm a `409` conflict response.
- [ ] Submit an invalid link payload through the API and confirm a `400` validation response.
- [ ] Link a note to a missing task through the API and confirm a `404` response.
- [ ] Confirm linked notes influence the Today recommendation reasons when the linked note is recent.

## 7. Today Recommendations

- [ ] Confirm `/` shows at most three recommendations.
- [ ] Confirm only non-`DONE` tasks are recommended.
- [ ] Confirm the seeded urgent task ranks near the top because it has a near deadline, high priority, in-progress status, and linked context.
- [ ] Confirm each recommendation shows a score, explanation, task metadata, and an open-task link.
- [ ] Confirm reason chips only show positive-score factors.
- [ ] Confirm linked note context appears for linked recommended tasks.
- [ ] Confirm deterministic fallback explanation appears when `GEMINI_API_KEY` is empty.
- [ ] If Gemini is configured, confirm AI wording can replace the explanation without changing task order.

## 8. Weekly Summary

- [ ] Confirm `/weekly` shows a Monday-to-now summary period.
- [ ] Confirm the current-week completed seeded task appears under completed work.
- [ ] Confirm the intentionally old completed seeded task does not appear as current-week completed work.
- [ ] Confirm carry-forward tasks include open work that was updated this week or due soon.
- [ ] Confirm recent notes include notes updated during the current week.
- [ ] Confirm themes are derived from visible tags when tags exist.
- [ ] Confirm weekly summary text is useful without Gemini.
- [ ] If Gemini is configured, confirm only the summary wording changes while evidence groups stay the same.

## 9. AI Fallback And Failure Modes

- [ ] Leave `GEMINI_API_KEY` empty and confirm `/` renders deterministic recommendation explanations.
- [ ] Leave `GEMINI_API_KEY` empty and confirm `/weekly` renders deterministic summary wording.
- [ ] Set an invalid Gemini key and confirm `/` still renders without crashing.
- [ ] Set an invalid Gemini key and confirm `/weekly` still renders without crashing.
- [ ] Confirm AI-assisted text never changes ranking order or weekly evidence groups.

## 10. API Boundary And Error Handling

- [ ] Send malformed JSON to `POST /api/notes` and confirm `400` with `Request body must be valid JSON.`
- [ ] Send malformed JSON to `PUT /api/notes/{noteId}` and confirm `400`.
- [ ] Send malformed JSON to `POST /api/tasks` and confirm `400`.
- [ ] Send malformed JSON to `PUT /api/tasks/{taskId}` and confirm `400`.
- [ ] Send malformed JSON to `POST /api/notes/{noteId}/links` and confirm `400`.
- [ ] Request missing note and task detail APIs and confirm stable `404` responses.
- [ ] Confirm unexpected runtime errors are not converted into fake not-found responses.
- [ ] Confirm the app-level error boundary in `src/app/error.tsx` is present for unexpected page failures.

## 11. Documentation And Demo Script

- [ ] Follow the README setup flow exactly from a clean local database.
- [ ] Confirm README Demo Flow matches the actual seeded app behavior.
- [ ] Confirm README Tradeoffs and Failure Modes are still accurate.
- [ ] Confirm ROADMAP completion notes match the current implementation.
- [ ] Rehearse the final story in 5-7 minutes: problem, capture, linking, Today, Weekly, AI fallback, architecture, tradeoffs.

## 12. Product Acceptance Criteria

- [ ] The app works without Gemini access.
- [ ] The demo can be reset without manual database edits.
- [ ] A reviewer can understand why a task is recommended.
- [ ] Linked notes visibly improve the recommendation story.
- [ ] Weekly summary answers what happened this week from real persisted data.
- [ ] The project remains small and defensible rather than becoming a broad productivity suite.