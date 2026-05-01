import { linkTaskToNoteAction, unlinkTaskFromNoteAction, updateNoteAction } from "@/app/notes/actions";
import { PrimaryNav } from "@/app/primary-nav";
import { NotFoundError } from "@/server/http";
import { getNote } from "@/server/notes";
import { listTasks } from "@/server/tasks";
import { notFound } from "next/navigation";
import Link from "next/link";

export const dynamic = "force-dynamic";

type NoteDetailPageProps = {
  params: Promise<{
    noteId: string;
  }>;
  searchParams?: Promise<{
    mode?: string;
  }>;
};

export default async function NoteDetailPage({
  params,
  searchParams,
}: NoteDetailPageProps) {
  const { noteId } = await params;
  const resolvedSearchParams = (await searchParams) ?? {};
  const isEditing = resolvedSearchParams.mode === "edit";

  try {
    const note = await getNote(noteId);
    const tasks = await listTasks();
    const action = updateNoteAction.bind(null, note.id);
    const linkAction = linkTaskToNoteAction.bind(null, note.id);
    const linkedTaskIds = new Set(note.linkedTasks.map((task) => task.id));
    const availableTasks = tasks.filter((task) => !linkedTaskIds.has(task.id));

    return (
      <main className="page-shell">
        <PrimaryNav />
        <section className="page-header">
          <p className="page-kicker">Phase 2 Linking</p>
          <h1>{isEditing ? "Edit note" : "View note"}</h1>
          <p>
            {isEditing
              ? "Update the note content and connect it to the tasks that can use this context."
              : "Review the full note content and the tasks currently using this note as context."}
          </p>
        </section>
        <section className="panel detail-panel">
          <div className="detail-header">
            <div>
              <p className="entity-meta">Created {new Date(note.createdAt).toLocaleString()}</p>
              <p className="entity-meta">Updated {new Date(note.updatedAt).toLocaleString()}</p>
            </div>
            <div className="action-row">
              {!isEditing ? (
                <Link className="button button-secondary" href={`/notes/${note.id}?mode=edit`}>
                  Edit note
                </Link>
              ) : null}
              <Link className="inline-link" href="/notes">
                Back to notes
              </Link>
            </div>
          </div>
          {isEditing ? (
            <form action={action} className="form-stack">
              <label className="field">
                <span>Note content</span>
                <textarea defaultValue={note.content} name="content" required rows={14} />
              </label>
              <label className="field">
                <span>Tags</span>
                <input defaultValue={note.tags.join(", ")} name="tags" placeholder="interview, context, research" />
              </label>
              <div className="action-row">
                <button className="button" type="submit">
                  Save changes
                </button>
                <Link className="button button-secondary" href={`/notes/${note.id}`}>
                  Cancel
                </Link>
              </div>
            </form>
          ) : (
            <div className="form-stack">
              <label className="field">
                <span>Note content</span>
                <textarea defaultValue={note.content} readOnly rows={14} />
              </label>
              <label className="field">
                <span>Tags</span>
                <input defaultValue={note.tags.join(", ")} readOnly />
              </label>
            </div>
          )}
        </section>
        <section className="panel detail-panel">
          <div className="panel-heading">
            <h2>Linked tasks</h2>
            <p>{note.linkedTasks.length === 0 ? "No tasks linked yet." : `${note.linkedTasks.length} linked task${note.linkedTasks.length === 1 ? "" : "s"}.`}</p>
          </div>
          {note.linkedTasks.length === 0 ? (
            <p className="empty-state">Link a task to make this note available as decision context.</p>
          ) : (
            <ul className="entity-list">
              {note.linkedTasks.map((task) => {
                const unlinkAction = unlinkTaskFromNoteAction.bind(null, note.id, task.id);

                return (
                  <li className="entity-item" key={task.id}>
                    <div>
                      <p className="entity-title">{task.title}</p>
                      <p className="entity-meta">
                        {task.status.replaceAll("_", " ")} · {task.priority}
                        {task.deadline ? ` · due ${new Date(task.deadline).toLocaleDateString()}` : ""}
                      </p>
                    </div>
                    <div className="action-row">
                      <Link className="button button-secondary button-small" href={`/tasks/${task.id}`}>
                        View
                      </Link>
                      <Link className="inline-link" href={`/tasks/${task.id}?mode=edit`}>
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
          {isEditing && availableTasks.length > 0 ? (
            <form action={linkAction} className="form-stack compact-form">
              <label className="field">
                <span>Add task link</span>
                <select name="taskId" required>
                  <option value="">Choose a task</option>
                  {availableTasks.map((task) => (
                    <option key={task.id} value={task.id}>
                      {task.title}
                    </option>
                  ))}
                </select>
              </label>
              <button className="button" type="submit">
                Link task
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
