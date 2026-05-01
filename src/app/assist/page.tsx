import { PrimaryNav } from "@/app/primary-nav";
import { listNotes, type NoteDto } from "@/server/notes";
import {
  listSuggestedActions,
  type SuggestedActionDto,
} from "@/server/assist";
import { listTasks, type TaskDto } from "@/server/tasks";

export const dynamic = "force-dynamic";

type AssistPageProps = {
  searchParams?: Promise<{
    count?: string;
    error?: string;
    status?: string;
  }>;
};

const actionLabels: Record<SuggestedActionDto["actionType"], string> = {
  LINK_NOTE_TASK: "Link",
  CREATE_NOTE: "Note",
  CREATE_TASK: "Task",
  ADD_NOTE_TAGS: "Note tags",
  ADD_TASK_TAGS: "Task tags",
};

type AssistEntityReferences = {
  notesById: Map<string, NoteDto>;
  tasksById: Map<string, TaskDto>;
};

function noteLabel(noteId: string, refs: AssistEntityReferences) {
  return refs.notesById.get(noteId)?.excerpt ?? `Note ${noteId.slice(0, 8)}`;
}

function taskLabel(taskId: string, refs: AssistEntityReferences) {
  return refs.tasksById.get(taskId)?.title ?? `Task ${taskId.slice(0, 8)}`;
}

function NoteLink({
  noteId,
  refs,
}: {
  noteId: string;
  refs: AssistEntityReferences;
}) {
  return <a href={`/notes/${noteId}`}>{`"${noteLabel(noteId, refs)}"`}</a>;
}

function TaskLink({
  taskId,
  refs,
}: {
  taskId: string;
  refs: AssistEntityReferences;
}) {
  return <a href={`/tasks/${taskId}`}>{`"${taskLabel(taskId, refs)}"`}</a>;
}

function payloadSummary(
  action: SuggestedActionDto,
  refs: AssistEntityReferences,
) {
  if (action.actionType === "LINK_NOTE_TASK") {
    const noteId = String(action.payload.noteId ?? "");
    const taskId = String(action.payload.taskId ?? "");

    return (
      <>
        Link note <NoteLink noteId={noteId} refs={refs} /> to task{" "}
        <TaskLink refs={refs} taskId={taskId} />.
      </>
    );
  }

  if (action.actionType === "CREATE_NOTE") {
    return `Create note "${String(action.payload.content ?? "")
      .replace(/\s+/g, " ")
      .slice(0, 160)}"`;
  }

  if (action.actionType === "CREATE_TASK") {
    return `Create task "${String(action.payload.title ?? "Untitled task")}"`;
  }

  const tags = Array.isArray(action.payload.tags)
    ? action.payload.tags.map(String).join(", ")
    : "";

  if (action.actionType === "ADD_NOTE_TAGS") {
    const noteId = String(action.payload.noteId ?? "");

    return (
      <>
        Add {tags || "suggested tags"} to note <NoteLink noteId={noteId} refs={refs} />.
      </>
    );
  }

  if (action.actionType === "ADD_TASK_TAGS") {
    const taskId = String(action.payload.taskId ?? "");

    return (
      <>
        Add {tags || "suggested tags"} to task <TaskLink refs={refs} taskId={taskId} />.
      </>
    );
  }

  return tags ? `Add ${tags}` : "Add suggested tags";
}

function SuggestedActionItem({
  action,
  refs,
}: {
  action: SuggestedActionDto;
  refs: AssistEntityReferences;
}) {
  return (
    <li className="entity-item">
      <div>
        <div className="tag-row" aria-label="Suggestion metadata">
          <span className="tag-pill">{actionLabels[action.actionType]}</span>
          <span className="tag-pill">{action.status}</span>
          {action.sourceType ? (
            <span className="tag-pill">
              {action.sourceType.replaceAll("_", " ")}
            </span>
          ) : null}
        </div>
        <p className="entity-title">{action.title}</p>
        <p className="entity-meta">{action.rationale}</p>
        <p className="entity-meta">{payloadSummary(action, refs)}</p>
        {action.sourceExcerpt ? (
          <p className="entity-meta">Source: {action.sourceExcerpt}</p>
        ) : null}
      </div>
      {action.status === "PENDING" ? (
        <div className="action-row">
          <form action={`/api/assist/${action.id}/approve`} method="post">
            <button className="button button-small" type="submit">
              Approve
            </button>
          </form>
          <form action={`/api/assist/${action.id}/dismiss`} method="post">
            <button
              className="button button-secondary button-small"
              type="submit"
            >
              Dismiss
            </button>
          </form>
        </div>
      ) : null}
    </li>
  );
}

function assistFlashMessage(
  status: string | undefined,
  error: string | undefined,
  count: string | undefined,
) {
  if (error) {
    return {
      tone: "error",
      text: "Assist action failed. Reload the page and try again.",
    } as const;
  }

  if (status === "generated") {
    const total = Number(count ?? "0");

    return {
      tone: "success",
      text: `Generated ${total} suggestion${total === 1 ? "" : "s"} from current context.`,
    } as const;
  }

  if (status === "imported") {
    const total = Number(count ?? "0");

    return {
      tone: "success",
      text: `Drafted ${total} suggestion${total === 1 ? "" : "s"} from imported source text.`,
    } as const;
  }

  if (status === "approved") {
    return {
      tone: "success",
      text: "Suggestion approved and applied.",
    } as const;
  }

  if (status === "dismissed") {
    return {
      tone: "success",
      text: "Suggestion dismissed.",
    } as const;
  }

  if (status === "no-suggestions") {
    return {
      tone: "info",
      text: "No new suggestions were generated from the current input.",
    } as const;
  }

  return null;
}

export default async function AssistPage({ searchParams }: AssistPageProps) {
  const resolvedSearchParams = (await searchParams) ?? {};
  const [actions, notes, tasks] = await Promise.all([
    listSuggestedActions(),
    listNotes(),
    listTasks(),
  ]);
  const contextCounts = {
    noteCount: notes.length,
    taskCount: tasks.length,
  };
  const pendingActions = actions.filter(
    (action) => action.status === "PENDING",
  );
  const decidedActions = actions
    .filter((action) => action.status !== "PENDING")
    .slice(0, 6);
  const hasContext = contextCounts.noteCount > 0 || contextCounts.taskCount > 0;
  const flash = assistFlashMessage(
    resolvedSearchParams.status,
    resolvedSearchParams.error,
    resolvedSearchParams.count,
  );
  const refs: AssistEntityReferences = {
    notesById: new Map(notes.map((note) => [note.id, note])),
    tasksById: new Map(tasks.map((task) => [task.id, task])),
  };

  return (
    <main className="page-shell">
      <PrimaryNav />
      <section className="page-header">
        <p className="page-kicker">Phase 6 AI Assist</p>
        <h1>Assist</h1>
        <p>
          Review AI-assisted suggestions for links, tags, notes, and tasks
          before anything changes in the system.
        </p>
      </section>
      {flash ? (
        <section className="panel">
          <p
            className={flash.tone === "error" ? "entity-title" : "entity-meta"}
          >
            {flash.text}
          </p>
        </section>
      ) : null}
      <div className="capture-grid">
        <section className="panel">
          <div className="panel-heading">
            <h2>Generate suggestions</h2>
            <p>
              {hasContext
                ? `Scan ${contextCounts.noteCount} note${contextCounts.noteCount === 1 ? "" : "s"} and ${contextCounts.taskCount} task${contextCounts.taskCount === 1 ? "" : "s"} for likely links and organization tags.`
                : "There are no notes or tasks yet. Create some records first or use Import source text below to draft suggestions from pasted content."}
            </p>
          </div>
          <form
            action="/api/assist/generate"
            className="form-stack"
            method="post"
          >
            <button className="button" disabled={!hasContext} type="submit">
              Scan current context
            </button>
          </form>
        </section>
        <section className="panel">
          <div className="panel-heading">
            <h2>Import source text</h2>
            <p>
              Paste an email or message thread to draft notes and follow-up
              tasks for review.
            </p>
          </div>
          <form
            action="/api/assist/import"
            className="form-stack"
            method="post"
          >
            <label className="field">
              <span>Email or message text</span>
              <textarea
                name="sourceText"
                placeholder="Subject: Follow-up on launch review..."
                required
                rows={9}
              />
            </label>
            <button className="button" type="submit">
              Draft suggestions
            </button>
          </form>
        </section>
      </div>
      <section className="panel">
        <div className="panel-heading">
          <h2>Pending review</h2>
          <p>
            {pendingActions.length === 0
              ? "No pending suggestions. Generate from current context or import source text to populate the queue."
              : `${pendingActions.length} suggestion${pendingActions.length === 1 ? "" : "s"} waiting for approval.`}
          </p>
        </div>
        {pendingActions.length === 0 ? (
          <p className="empty-state">
            The system will only write data after you approve a specific
            suggestion.
          </p>
        ) : (
          <ul className="entity-list">
            {pendingActions.map((action) => (
              <SuggestedActionItem action={action} key={action.id} refs={refs} />
            ))}
          </ul>
        )}
      </section>
      <section className="panel">
        <div className="panel-heading">
          <h2>Recent decisions</h2>
          <p>
            {decidedActions.length === 0
              ? "No suggestions have been approved or dismissed yet."
              : "Recently reviewed suggestions stay visible for auditability."}
          </p>
        </div>
        {decidedActions.length === 0 ? null : (
          <ul className="entity-list">
            {decidedActions.map((action) => (
              <SuggestedActionItem action={action} key={action.id} refs={refs} />
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
