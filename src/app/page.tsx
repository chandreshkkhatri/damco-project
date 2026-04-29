import Link from "next/link";

const phaseZeroHighlights = [
  {
    title: "Health and runtime",
    body: "The app starts with a smoke-check API route so every later phase can validate the environment quickly."
  },
  {
    title: "Relational foundation",
    body: "Notes, tasks, links, and activity events are modeled up front so the recommendation flow grows on stable data."
  },
  {
    title: "Regression guardrails",
    body: "Vitest integration checks are in place from Phase 0, matching the project rule that each phase closes with tests."
  }
];

export default function HomePage() {
  return (
    <main className="shell">
      <section className="hero">
        <span className="eyebrow">Phase 0 Foundation</span>
        <h1>Turn scattered context into ranked next actions.</h1>
        <p>
          This project is a small context-to-action system: capture notes, connect them to tasks,
          and recommend what to do next with deterministic logic plus AI-assisted explanation.
        </p>
        <div className="grid">
          {phaseZeroHighlights.map((item) => (
            <article className="card" key={item.title}>
              <h2>{item.title}</h2>
              <p>{item.body}</p>
            </article>
          ))}
        </div>
        <div className="stack" aria-label="Phase zero stack">
          <span className="pill">Next.js App Router</span>
          <span className="pill">TypeScript</span>
          <span className="pill">Prisma + SQLite</span>
          <span className="pill">Vitest integration checks</span>
        </div>
        <div className="action-row">
          <Link className="button" href="/notes">
            Open notes
          </Link>
          <Link className="button button-secondary" href="/tasks">
            Open tasks
          </Link>
        </div>
      </section>
    </main>
  );
}

