import { linkNoteToTaskAction, unlinkNoteFromTaskAction, updateTaskAction } from "@/app/tasks/actions";
import { listNotes } from "@/server/notes";
import { getTask, taskPriorities, taskStatuses } from "@/server/tasks";
import Link from "next/link";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

type TaskDetailPageProps = {
  params: Promise<{
    taskId: string;
  }>;
};

export default async function TaskDetailPage({ params }: TaskDetailPageProps) {
  try {
    const { taskId } = await params;
    const task = await getTask(taskId);
    const notes = await listNotes();
    const action = updateTaskAction.bind(null, task.id);
    const linkAction = linkNoteToTaskAction.bind(null, task.id);
    const deadlineValue = task.deadline ? task.deadline.slice(0, 10) : "";
    const linkedNoteIds = new Set(task.linkedNotes.map((note) => note.id));
    const availableNotes = notes.filter((note) => !linkedNoteIds.has(note.id));

    return (
      <main className="page-shell">
        <nav className="page-nav" aria-label="Primary navigation">
          <Link href="/">Overview</Link>
          <Link href="/notes">Notes</Link>
          <Link href="/tasks">Tasks</Link>
        </nav>
        <section className="page-header">
          <p className="page-kicker">Phase 2 Linking</p>
          <h1>Edit task</h1>
          <p>Update the commitment and connect it to the notes that explain the context.</p>
        </section>
        <section className="panel detail-panel">
          <div className="detail-header">
            <div>
              <p className="entity-meta">Created {new Date(task.createdAt).toLocaleString()}</p>
              <p className="entity-meta">Updated {new Date(task.updatedAt).toLocaleString()}</p>
            </div>
            <Link className="inline-link" href="/tasks">
              Back to tasks
            </Link>
          </div>
          <form action={action} className="form-stack">
            <label className="field">
              <span>Title</span>
              <input defaultValue={task.title} name="title" required />
            </label>
            <label className="field">
              <span>Description</span>
              <textarea defaultValue={task.description ?? ""} name="description" rows={6} />
            </label>
            <div className="field-grid">
              <label className="field">
                <span>Deadline</span>
                <input defaultValue={deadlineValue} name="deadline" type="date" />
              </label>
              <label className="field">
                <span>Status</span>
                <select defaultValue={task.status} name="status">
                  {taskStatuses.map((status) => (
                    <option key={status} value={status}>
                      {status.replaceAll("_", " ")}
                    </option>
                  ))}
                </select>
              </label>
              <label className="field">
                <span>Priority</span>
                <select defaultValue={task.priority} name="priority">
                  {taskPriorities.map((priority) => (
                    <option key={priority} value={priority}>
                      {priority}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <label className="field">
              <span>Tags</span>
              <input defaultValue={task.tags.join(", ")} name="tags" placeholder="backend, planning, interview" />
            </label>
            <div className="action-row">
              <button className="button" type="submit">
                Save changes
              </button>
              <Link className="button button-secondary" href="/tasks">
                Cancel
              </Link>
            </div>
          </form>
        </section>
        <section className="panel detail-panel">
          <div className="panel-heading">
            <h2>Linked notes</h2>
            <p>{task.linkedNotes.length === 0 ? "No notes linked yet." : `${task.linkedNotes.length} linked note${task.linkedNotes.length === 1 ? "" : "s"}.`}</p>
          </div>
          {task.linkedNotes.length === 0 ? (
            <p className="empty-state">Link a note to preserve the context behind this task.</p>
          ) : (
            <ul className="entity-list">
              {task.linkedNotes.map((note) => {
                const unlinkAction = unlinkNoteFromTaskAction.bind(null, task.id, note.id);

                return (
                  <li className="entity-item" key={note.id}>
                    <div>
                      <p className="entity-title">{note.excerpt || "Untitled note"}</p>
                      <p className="entity-meta">Updated {new Date(note.updatedAt).toLocaleString()}</p>
                    </div>
                    <form action={unlinkAction}>
                      <button className="button button-secondary button-small" type="submit">
                        Unlink
                      </button>
                    </form>
                  </li>
                );
              })}
            </ul>
          )}
          {availableNotes.length > 0 ? (
            <form action={linkAction} className="form-stack compact-form">
              <label className="field">
                <span>Add note link</span>
                <select name="noteId" required>
                  <option value="">Choose a note</option>
                  {availableNotes.map((note) => (
                    <option key={note.id} value={note.id}>
                      {note.excerpt || "Untitled note"}
                    </option>
                  ))}
                </select>
              </label>
              <button className="button" type="submit">
                Link note
              </button>
            </form>
          ) : null}
        </section>
      </main>
    );
  } catch {
    notFound();
  }
}
