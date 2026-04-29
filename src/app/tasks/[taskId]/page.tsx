import { updateTaskAction } from "@/app/tasks/actions";
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
    const action = updateTaskAction.bind(null, task.id);
    const deadlineValue = task.deadline ? task.deadline.slice(0, 10) : "";

    return (
      <main className="page-shell">
        <nav className="page-nav" aria-label="Primary navigation">
          <Link href="/">Overview</Link>
          <Link href="/notes">Notes</Link>
          <Link href="/tasks">Tasks</Link>
        </nav>
        <section className="page-header">
          <p className="page-kicker">Phase 1 Capture</p>
          <h1>Edit task</h1>
          <p>Update status, deadline, priority, and notes for the commitment. Linking will be added in the next phase.</p>
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
      </main>
    );
  } catch {
    notFound();
  }
}
