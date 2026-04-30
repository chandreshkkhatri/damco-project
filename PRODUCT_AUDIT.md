# Product Audit

This audit reviews the current feature set through a senior product manager lens for the Damco assessment. The goal is to decide whether the app makes sense, whether any feature choices undermine the story, and what should or should not be added before submission.

## Executive Verdict

The product is coherent and submission-ready. It has a clear loop: capture notes and tasks, connect them through links, turn that context into ranked next actions, summarize the week, and use assistive suggestions to reduce manual organization work. That is a stronger assessment narrative than a generic notes app or an LLM-only assistant.

The strongest product choice is that AI does not own the decision. The app ranks and groups evidence deterministically, then Gemini can improve wording or propose suggested actions when available. Suggested actions still require explicit user approval, which makes the system easier to defend technically and safer to demo when external AI access is unavailable.

## Product Thesis

People often capture useful context in notes and track commitments as tasks, but those two stores drift apart. This app makes the connection explicit and uses that connection to answer two practical questions:

- What should I do next?
- What did I work on this week?

That thesis is narrow enough for an assessment, but meaningful enough to show product judgment, architecture, tradeoffs, and failure-mode thinking.

## What Works Well

- The scope is right-sized: capture, linking, recommendations, weekly summary, and deterministic demo data.
- The note-task join model is the right product primitive because it makes context reusable instead of hiding task IDs inside notes or note IDs inside tasks.
- Today recommendations are explainable through deadlines, priority, status, freshness, and linked note context.
- Weekly summary provides a second high-value query and gives the app a review/retrospective angle.
- Optional AI is framed as wording assistance, not core decision-making.
- The Assist queue expands AI from wording into controlled action proposals without crossing into automatic mutation.
- Manual email-text import is a pragmatic precursor to Gmail integration because it demonstrates the workflow without OAuth/token risk.
- The app remains useful with missing or failing Gemini access.
- Seed data makes the demo repeatable and reduces reviewer setup risk.
- README and ROADMAP tell a clear phase-by-phase story.

## Non-Blocking Product Gaps

These are real limitations, but they are acceptable for this assessment if presented as tradeoffs.

- Inline form error feedback is basic. API errors are stable, but server-action forms do not yet provide polished inline validation messages.
- There is no search or filtering across notes/tasks, so the knowledge base does not scale past small demo data.
- Tags support categorization and weekly themes, but tags are not yet first-class navigation.
- The Assist queue proposes tags and links, but it does not yet create true hierarchical projects or nested knowledge structures.
- Weekly summaries use server-local Monday-to-now windows rather than user timezone preferences.
- There is no authentication or multi-user model, which is appropriate for the MVP but important for production.
- There is no delete/archive UI, so demo data is reset through seeding rather than user-facing cleanup tools.
- Activity events exist in the schema as a future hook but are not yet written by product workflows.
- Gmail is represented by manual email-text import only; real OAuth and background sync remain future work.

## Major Flaw Check

No major product flaw blocks submission.

The app avoids the two most common assessment traps: it is not too broad, and it is not AI theater. The deterministic engine gives reviewers something concrete to inspect, while optional AI still demonstrates awareness of modern AI product patterns.

The main risk is not product direction; it is demo clarity. If the reviewer does not see linking before seeing recommendations, the ranking can feel like a scoring widget. The demo should explicitly show a linked note and then return to Today so the context-to-action story lands.

## Demo Risks And Mitigations

| Risk                              | Impact                                              | Mitigation                                                             |
| --------------------------------- | --------------------------------------------------- | ---------------------------------------------------------------------- |
| Reviewer opens app before seeding | Today and Weekly can look sparse                    | Start every demo with `npm run db:migrate:deploy && npm run db:seed`   |
| Gemini unavailable or invalid     | AI-assisted wording or suggestions may be less rich | Frame deterministic fallback as intentional reliability                |
| Scores look arbitrary             | Reviewer questions ranking                          | Explain deadline, priority, status, freshness, and linked-note weights |
| Linking UI is missed              | Core context story is weakened                      | Demo note detail and task detail before returning to Today             |
| Assist suggestions look automatic | Reviewer worries about AI mutating data             | Approve one suggestion live and show the record changes only afterward |
| Weekly period surprises reviewer  | Different timezone expectations                     | Say the MVP uses local server Monday-to-now                            |
| Form validation is not polished   | Basic MVP feel                                      | Point to API validation and call inline UX a future improvement        |

## Recommended Demo Narrative

1. Start with the problem: notes and tasks are captured separately, so useful context does not drive action.
2. Run or mention the deterministic seed flow.
3. Open Today and show the highest-ranked task.
4. Explain why it ranks high: deadline, priority, in-progress status, freshness, and linked context.
5. Open the task detail page and show linked notes.
6. Open the note detail page and show the relationship is bidirectional and persisted.
7. Open Weekly and show completed work, carry-forward tasks, recent notes, and themes.
8. Open Assist, generate or import suggestions, and show approval before mutation.
9. Explain the AI boundary: deterministic decisions first, optional Gemini wording and suggestions second, user approval before writes.
10. Close with architecture and tradeoffs: Next.js, Prisma, PostgreSQL, service layer, tests, fallback behavior.

## What Not To Build Before Submission

- Do not add auth or multi-user support.
- Do not add broad project-management features such as boards, comments, reminders, or notifications.
- Do not replace deterministic ranking with LLM ranking.
- Do not add a chat interface unless it can reuse the existing deterministic services cleanly.
- Do not add live Gmail OAuth before submission unless there is enough time for auth, token-storage, permission, and revocation testing.
- Do not add Playwright just for optics; current integration tests plus manual QA are sufficient.
- Do not expand schema unless a specific demo blocker appears.

## Best Next Product Increment

If there is time after the assessment, the best next feature is a real read-only Gmail connector that feeds the existing approval queue. The important product constraint is to keep mailbox ingestion as suggestion generation, not automatic task creation.

The next broadly useful product increment is lightweight discovery: search and filters across notes/tasks, especially by tags, linked status, and suggestion source. That would make the knowledge-system side stronger while preserving the current product thesis.

The next best UX improvement is inline server-action validation for forms. This would make manual data entry smoother without changing the core architecture.

## Reviewer Questions To Prepare For

- Why not let the LLM rank tasks directly?
- How are recommendation scores calculated?
- What happens if Gemini is unavailable?
- Why require approval for AI suggestions instead of applying them automatically?
- How would Gmail integration handle permissions, token storage, and irrelevant email noise?
- Why PostgreSQL once deployment mattered?
- How would this scale beyond a single Vercel deployment?
- Why use a join table instead of embedded IDs?
- How would this support multiple users?
- How would you handle timezone-aware weekly summaries?
- What would you build next with one more week?

## Final Assessment

The app is a credible personal context-to-action MVP. It demonstrates product judgment by keeping the central behavior small and explainable, and it demonstrates engineering judgment by isolating optional AI from deterministic core behavior and approval-gated writes. The remaining gaps are appropriately documented future work rather than flaws in the current submission.
