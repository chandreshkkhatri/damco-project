import Link from "next/link";
import { PrimaryNav } from "@/app/primary-nav";
import { getWeeklySummary, type WeeklySummaryDto, type WeeklySummaryNoteDto, type WeeklySummaryTaskDto } from "@/server/weekly-summary";

export const dynamic = "force-dynamic";

function formatDate(value: string) {
  return new Date(value).toLocaleDateString();
}

function taskMeta(task: WeeklySummaryTaskDto) {
  const details = [task.status.replaceAll("_", " "), task.priority];

  if (task.completedAt) {
    details.push(`completed ${formatDate(task.completedAt)}`);
  } else if (task.deadline) {
    details.push(`due ${formatDate(task.deadline)}`);
  }

  return details.join(" · ");
}

function TaskList({ emptyText, tasks }: { emptyText: string; tasks: WeeklySummaryTaskDto[] }) {
  if (tasks.length === 0) {
    return <p className="empty-state">{emptyText}</p>;
  }

  return (
    <ul className="entity-list">
      {tasks.map((task) => (
        <li className="entity-item" key={task.id}>
          <div>
            <p className="entity-title">{task.title}</p>
            <p className="entity-meta">{taskMeta(task)}</p>
            {task.linkedNotes.length > 0 ? (
              <div className="tag-row">
                {task.linkedNotes.slice(0, 2).map((note) => (
                  <span className="pill" key={note.id}>
                    {note.excerpt || "Untitled note"}
                  </span>
                ))}
              </div>
            ) : null}
          </div>
          <Link className="inline-link" href={`/tasks/${task.id}`}>
            Open
          </Link>
        </li>
      ))}
    </ul>
  );
}

function NoteList({ notes }: { notes: WeeklySummaryNoteDto[] }) {
  if (notes.length === 0) {
    return <p className="empty-state">No notes were updated during this week.</p>;
  }

  return (
    <ul className="entity-list">
      {notes.map((note) => (
        <li className="entity-item" key={note.id}>
          <div>
            <p className="entity-title">{note.excerpt || "Untitled note"}</p>
            <p className="entity-meta">Updated {new Date(note.updatedAt).toLocaleString()}</p>
            {note.linkedTasks.length > 0 ? (
              <div className="tag-row">
                {note.linkedTasks.slice(0, 2).map((task) => (
                  <span className="pill" key={task.id}>
                    {task.title}
                  </span>
                ))}
              </div>
            ) : null}
          </div>
          <Link className="inline-link" href={`/notes/${note.id}`}>
            Open
          </Link>
        </li>
      ))}
    </ul>
  );
}

function SummaryStats({ summary }: { summary: WeeklySummaryDto }) {
  const stats = [
    ["Completed", summary.completedTasks.length],
    ["Open", summary.pendingTasks.length],
    ["Notes", summary.recentNotes.length],
    ["Themes", summary.themes.length]
  ] as const;

  return (
    <div className="summary-stats" aria-label="Weekly summary counts">
      {stats.map(([label, value]) => (
        <div className="summary-stat" key={label}>
          <strong>{value}</strong>
          <span>{label}</span>
        </div>
      ))}
    </div>
  );
}

export default async function WeeklyPage() {
  const summary = await getWeeklySummary();
  const periodLabel = `${formatDate(summary.periodStart)} - ${formatDate(summary.periodEnd)}`;

  return (
    <main className="page-shell">
      <PrimaryNav />
      <section className="page-header">
        <p className="page-kicker">Phase 4 Weekly Summary</p>
        <h1>Weekly</h1>
        <p>A compact answer built from completed tasks, recent notes, open work, and dominant themes for the current week.</p>
      </section>

      <section className="panel detail-panel">
        <div className="panel-heading">
          <h2>Weekly answer</h2>
          <p>
            {periodLabel} · Summary: {summary.summarySource === "ai" ? "AI-assisted" : "deterministic fallback"}
          </p>
        </div>
        <p className="summary-text">{summary.summary}</p>
        <SummaryStats summary={summary} />
      </section>

      <div className="summary-grid">
        <section className="panel detail-panel">
          <div className="panel-heading">
            <h2>Completed work</h2>
            <p>{summary.completedTasks.length === 0 ? "No completed tasks this week." : `${summary.completedTasks.length} completed task${summary.completedTasks.length === 1 ? "" : "s"}.`}</p>
          </div>
          <TaskList emptyText="Mark tasks as DONE to make completed work appear here." tasks={summary.completedTasks} />
        </section>

        <section className="panel detail-panel">
          <div className="panel-heading">
            <h2>Carry-forward work</h2>
            <p>{summary.pendingTasks.length === 0 ? "No open tasks were updated or due near this week." : `${summary.pendingTasks.length} open task${summary.pendingTasks.length === 1 ? "" : "s"}.`}</p>
          </div>
          <TaskList emptyText="Open tasks show here when they are updated this week or due soon." tasks={summary.pendingTasks} />
        </section>
      </div>

      <div className="summary-grid">
        <section className="panel detail-panel">
          <div className="panel-heading">
            <h2>Recent notes</h2>
            <p>{summary.recentNotes.length === 0 ? "No updated notes this week." : `${summary.recentNotes.length} recent note${summary.recentNotes.length === 1 ? "" : "s"}.`}</p>
          </div>
          <NoteList notes={summary.recentNotes} />
        </section>

        <section className="panel detail-panel">
          <div className="panel-heading">
            <h2>Themes</h2>
            <p>{summary.themes.length === 0 ? "No clear theme signals yet." : `${summary.themes.length} theme${summary.themes.length === 1 ? "" : "s"} found.`}</p>
          </div>
          {summary.themes.length === 0 ? (
            <p className="empty-state">Add tags to notes and tasks to make weekly themes more useful.</p>
          ) : (
            <ul className="theme-list">
              {summary.themes.map((theme) => (
                <li className="theme-item" key={theme.label}>
                  <span>{theme.label}</span>
                  <strong>{theme.count}</strong>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </main>
  );
}