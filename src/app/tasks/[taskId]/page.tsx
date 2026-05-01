import { linkNoteToTaskAction, unlinkNoteFromTaskAction, updateTaskAction } from "@/app/tasks/actions";
import { PrimaryNav } from "@/app/primary-nav";
import { NotFoundError } from "@/server/http";
import { listNotes } from "@/server/notes";
import { getTask, taskPriorities, taskStatuses } from "@/server/tasks";
import Link from "next/link";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

type TaskDetailPageProps = {
  params: Promise<{
    taskId: string;
  }>;
  searchParams?: Promise<{
    mode?: string;
  }>;
};

export default async function TaskDetailPage({
  params,
  searchParams,
}: TaskDetailPageProps) {
  const { taskId } = await params;
  const resolvedSearchParams = (await searchParams) ?? {};
  const isEditing = resolvedSearchParams.mode === "edit";

  try {
    const task = await getTask(taskId);
    const notes = await listNotes();
    const action = updateTaskAction.bind(null, task.id);
    const linkAction = linkNoteToTaskAction.bind(null, task.id);
    const deadlineValue = task.deadline ? task.deadline.slice(0, 10) : "";
    const linkedNoteIds = new Set(task.linkedNotes.map((note) => note.id));
    const availableNotes = notes.filter((note) => !linkedNoteIds.has(note.id));

    return (
      <main className="page-shell">
        <PrimaryNav />
        <section className="page-header">
          <p className="page-kicker">Phase 2 Linking</p>
          <h1>{isEditing ? "Edit task" : "View task"}</h1>
          <p>
            {isEditing
              ? "Update the commitment and connect it to the notes that explain the context."
              : "Review the full task details and the notes currently connected to this commitment."}
          </p>
        </section>
        <section className="panel detail-panel">
          <div className="detail-header">
            <div>
              <p className="entity-meta">Created {new Date(task.createdAt).toLocaleString()}</p>
              <p className="entity-meta">Updated {new Date(task.updatedAt).toLocaleString()}</p>
            </div>
            <div className="action-row">
              {!isEditing ? (
                <Link className="button button-secondary" href={`/tasks/${task.id}?mode=edit`}>
                  Edit task
                </Link>
              ) : null}
              <Link className="inline-link" href="/tasks">
                Back to tasks
              </Link>
            </div>
          </div>
          {isEditing ? (
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
                <Link className="button button-secondary" href={`/tasks/${task.id}`}>
                  Cancel
                </Link>
              </div>
            </form>
          ) : (
            <div className="form-stack">
              <label className="field">
                <span>Title</span>
                <input defaultValue={task.title} readOnly />
              </label>
              <label className="field">
                <span>Description</span>
                <textarea defaultValue={task.description ?? ""} readOnly rows={6} />
              </label>
              <div className="field-grid">
                <label className="field">
                  <span>Deadline</span>
                  <input defaultValue={deadlineValue || "No deadline"} readOnly />
                </label>
                <label className="field">
                  <span>Status</span>
                  <input defaultValue={task.status.replaceAll("_", " ")} readOnly />
                </label>
                <label className="field">
                  <span>Priority</span>
                  <input defaultValue={task.priority} readOnly />
                </label>
              </div>
              <label className="field">
                <span>Tags</span>
                <input defaultValue={task.tags.join(", ")} readOnly />
              </label>
            </div>
          )}
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
                    <div className="action-row">
                      <Link className="button button-secondary button-small" href={`/notes/${note.id}`}>
                        View
                      </Link>
                      <Link className="inline-link" href={`/notes/${note.id}?mode=edit`}>
                        Edit
                      </Link>
                      {isEditing ? (
                        <form action={unlinkAction}>
                          <button className="button button-secondary button-small" type="submit">
                            Unlink
                          </button>
                        </form>
                      ) : null}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
          {isEditing && availableNotes.length > 0 ? (
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
  } catch (error) {
    if (error instanceof NotFoundError) {
      notFound();
    }

    throw error;
  }
}
