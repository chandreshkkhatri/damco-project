import Link from "next/link";
import { getRecommendations } from "@/server/recommendations";

export const dynamic = "force-dynamic";

export default async function TodayPage() {
  const recommendations = await getRecommendations();

  return (
    <main className="page-shell">
      <nav className="page-nav" aria-label="Primary navigation">
        <Link href="/">Today</Link>
        <Link href="/notes">Notes</Link>
        <Link href="/tasks">Tasks</Link>
      </nav>
      <section className="page-header">
        <p className="page-kicker">Phase 3 Recommendations</p>
        <h1>Today</h1>
        <p>Top next actions ranked from deadlines, priority, task state, freshness, and linked note context.</p>
      </section>
      <section className="panel detail-panel">
        <div className="panel-heading">
          <h2>Recommended next actions</h2>
          <p>{recommendations.length === 0 ? "No open tasks are ready for ranking." : `${recommendations.length} recommendation${recommendations.length === 1 ? "" : "s"} ready.`}</p>
        </div>
        {recommendations.length === 0 ? (
          <div className="empty-state">
            <p>Create tasks, add deadlines or priorities, and link relevant notes to make the Today view useful.</p>
            <div className="action-row">
              <Link className="button" href="/tasks">
                Add task
              </Link>
              <Link className="button button-secondary" href="/notes">
                Add note
              </Link>
            </div>
          </div>
        ) : (
          <ol className="recommendation-list">
            {recommendations.map((recommendation) => (
              <li className="recommendation-item" key={recommendation.task.id}>
                <div className="recommendation-rank" aria-label={`Score ${recommendation.score}`}>
                  {recommendation.score}
                </div>
                <div className="recommendation-body">
                  <div className="detail-header">
                    <div>
                      <p className="entity-title">{recommendation.task.title}</p>
                      <p className="entity-meta">
                        {recommendation.task.status.replaceAll("_", " ")} · {recommendation.task.priority}
                        {recommendation.task.deadline ? ` · due ${new Date(recommendation.task.deadline).toLocaleDateString()}` : ""}
                      </p>
                    </div>
                    <Link className="inline-link" href={`/tasks/${recommendation.task.id}`}>
                      Open task
                    </Link>
                  </div>
                  <p className="recommendation-explanation">{recommendation.explanation}</p>
                  <div className="reason-grid" aria-label="Recommendation reasons">
                    {recommendation.reasons.map((reason) => (
                      <div className="reason-chip" key={reason.factor}>
                        <span>{reason.label}</span>
                        <strong>+{reason.score}</strong>
                        <small>{reason.detail}</small>
                      </div>
                    ))}
                  </div>
                  {recommendation.linkedNotes.length > 0 ? (
                    <div className="linked-context">
                      <p className="entity-meta">Linked context</p>
                      <div className="tag-row">
                        {recommendation.linkedNotes.slice(0, 3).map((note) => (
                          <span className="pill" key={note.id}>
                            {note.excerpt || "Untitled note"}
                          </span>
                        ))}
                      </div>
                    </div>
                  ) : null}
                  <p className="entity-meta">Explanation: {recommendation.explanationSource === "ai" ? "AI-assisted" : "deterministic fallback"}</p>
                </div>
              </li>
            ))}
          </ol>
        )}
      </section>
    </main>
  );
}

