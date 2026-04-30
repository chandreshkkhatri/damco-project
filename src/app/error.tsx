"use client";

type RootErrorProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

export default function RootError({ error, reset }: RootErrorProps) {
  return (
    <main className="page-shell">
      <section className="page-header">
        <p className="page-kicker">Unexpected Error</p>
        <h1>Something went wrong</h1>
        <p>The app hit an unexpected runtime error. Retry once, then refresh or restart the dev server if the issue persists.</p>
      </section>
      <section className="panel detail-panel">
        <div className="panel-heading">
          <h2>Recovery</h2>
          <p>This fallback is only for unexpected failures. Missing notes and tasks should still render the normal not-found page.</p>
        </div>
        <div className="action-row">
          <button className="button" onClick={reset} type="button">
            Try again
          </button>
        </div>
        <p className="entity-meta">{error.message || "Unexpected application error."}</p>
      </section>
    </main>
  );
}