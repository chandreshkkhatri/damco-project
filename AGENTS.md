# Agent Guidelines

This repository is for the Damco Build challenge project: a personal context-to-action system that connects notes, tasks, and AI-assisted recommendations.

## Product Direction

- Build a small, working system rather than a broad productivity suite.
- Keep the core story centered on turning scattered notes and tasks into ranked next actions.
- Prefer features that strengthen the interview narrative: problem framing, system design, tradeoffs, and failure modes.
- Treat AI as an enhancement layer. The system should keep working with deterministic behavior when the AI provider is unavailable.

## Default Technical Choices

- Use TypeScript throughout the application.
- Prefer a full-stack Next.js app unless a later phase explicitly needs a separate backend service.
- Use a relational data model with Prisma. Prefer PostgreSQL so the same setup stays deployable on Vercel.
- Use a many-to-many join table for note-task links instead of embedding IDs in either record.
- Keep Gemini/OpenAI provider code isolated behind an AI service interface.
- Keep environment variables documented in `.env.example`; never commit real secrets.

## Coding Conventions

- Keep changes small, focused, and tied to the active roadmap phase.
- Do not add unrelated refactors while implementing a phase.
- Use clear domain names: `Note`, `Task`, `NoteTaskLink`, `Recommendation`, and `ActivityEvent` where applicable.
- Validate inputs at boundaries using a schema library such as Zod once request handling is introduced.
- Keep business logic testable outside UI components.
- Prefer simple, readable UI over decorative complexity.
- Add comments only when they explain a non-obvious decision or tradeoff.

## Phase Workflow

- Before starting a phase, write or update the phase plan in `ROADMAP.md` with scope, expected files, test strategy, and exit criteria.
- During a phase, implement only the agreed scope unless the user explicitly expands it.
- At the end of each phase, add or update integration tests that protect the newly introduced behavior.
- Run the relevant checks before considering the phase complete.
- Update `ROADMAP.md` with completion notes and any changed assumptions.

## Commit Discipline

- Keep commits timely and meaningful: one commit for each complete phase or coherent sub-phase.
- Commit only after the relevant tests/checks pass, or clearly document why a check could not run.
- Use concise commit messages in this style:
  - `chore: scaffold project foundation`
  - `feat: add notes and tasks capture flow`
  - `feat: link notes to tasks`
  - `feat: add recommendation engine`
  - `test: cover recommendation ranking`
- Ask before committing if commit authorization is unclear.
- Do not mix unrelated roadmap phases in the same commit.

## Testing Expectations

- Each phase should end with integration coverage, not only unit tests.
- Prefer service/API integration tests for backend behavior.
- Add UI integration or end-to-end tests for critical user flows once the frontend exists.
- Test both happy paths and important failure modes, especially AI fallback behavior.
- Keep test data small, explicit, and easy to reason about.

## Submission Readiness

- Maintain a README that explains the problem, solution, architecture, setup, and demo flow.
- Keep the app easy to run locally from a fresh clone.
- Include demo data or seed scripts once the core schema exists.
- Preserve a clear narrative for the final video: problem, demo, architecture, tradeoffs, and failure modes.
