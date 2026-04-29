import { createTaskAction } from "@/app/tasks/actions";
import { PrimaryNav } from "@/app/primary-nav";
import { listTasks, taskPriorities, taskStatuses, type TaskDto } from "@/server/tasks";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function TasksPage() {
  const tasks: TaskDto[] = await listTasks();

  return (
    <main className="page-shell">
      <PrimaryNav />
      <section className="page-header">
        <p className="page-kicker">Phase 1 Capture</p>
        <h1>Tasks</h1>
        <p>Track commitments, deadlines, and status now so later phases can rank what deserves attention next.</p>
      </section>
      <div className="capture-grid">
        <section className="panel">
          <div className="panel-heading">
            <h2>Create task</h2>
            <p>Start simple: title is required, everything else helps future prioritization.</p>
          </div>
          <form action={createTaskAction} className="form-stack">
            <label className="field">
              <span>Title</span>
              <input name="title" placeholder="Finish recommendation engine design" required />
            </label>
            <label className="field">
              <span>Description</span>
              <textarea name="description" placeholder="Add any supporting detail or acceptance notes." rows={5} />
            </label>
            <div className="field-grid">
              <label className="field">
                <span>Deadline</span>
                <input name="deadline" type="date" />
              </label>
              <label className="field">
                <span>Status</span>
                <select defaultValue="TODO" name="status">
                  {taskStatuses.map((status) => (
                    <option key={status} value={status}>
                      {status.replaceAll("_", " ")}
                    </option>
                  ))}
                </select>
              </label>
              <label className="field">
                <span>Priority</span>
                <select defaultValue="MEDIUM" name="priority">
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
              <input name="tags" placeholder="backend, planning, interview" />
            </label>
            <button className="button" type="submit">
              Save task
            </button>
          </form>
        </section>
        <section className="panel">
          <div className="panel-heading">
            <h2>Task list</h2>
            <p>{tasks.length === 0 ? "No tasks tracked yet." : `${tasks.length} task${tasks.length === 1 ? "" : "s"} in the system.`}</p>
          </div>
          {tasks.length === 0 ? (
            <p className="empty-state">Add the first task to make the capture layer useful.</p>
          ) : (
            <ul className="entity-list">
              {tasks.map((task) => (
                <li className="entity-item" key={task.id}>
                  <div>
                    <p className="entity-title">{task.title}</p>
                    <p className="entity-meta">
                      {task.status.replaceAll("_", " ")} · {task.priority}
                      {task.deadline ? ` · due ${new Date(task.deadline).toLocaleDateString()}` : ""}
                    </p>
                    {task.tags.length > 0 ? (
                      <div className="tag-row">
                        {task.tags.map((tag) => (
                          <span className="tag-pill" key={tag}>
                            {tag}
                          </span>
                        ))}
                      </div>
                    ) : null}
                  </div>
                  <Link className="inline-link" href={`/tasks/${task.id}`}>
                    Edit
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </main>
  );
}
