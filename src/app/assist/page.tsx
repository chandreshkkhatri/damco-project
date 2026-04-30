import {
  approveSuggestedActionAction,
  dismissSuggestedActionAction,
  generateAssistSuggestionsAction,
  importSourceForSuggestionsAction,
} from "@/app/assist/actions";
import { PrimaryNav } from "@/app/primary-nav";
import {
  getAssistContextCounts,
  listSuggestedActions,
  type SuggestedActionDto,
} from "@/server/assist";

export const dynamic = "force-dynamic";

const actionLabels: Record<SuggestedActionDto["actionType"], string> = {
  LINK_NOTE_TASK: "Link",
  CREATE_NOTE: "Note",
  CREATE_TASK: "Task",
  ADD_NOTE_TAGS: "Note tags",
  ADD_TASK_TAGS: "Task tags",
};

function payloadSummary(action: SuggestedActionDto) {
  if (action.actionType === "LINK_NOTE_TASK") {
    return `Note ${String(action.payload.noteId).slice(0, 8)} to task ${String(action.payload.taskId).slice(0, 8)}`;
  }

  if (action.actionType === "CREATE_NOTE") {
    return String(action.payload.content ?? "")
      .replace(/\s+/g, " ")
      .slice(0, 160);
  }

  if (action.actionType === "CREATE_TASK") {
    return String(action.payload.title ?? "Untitled task");
  }

  const tags = Array.isArray(action.payload.tags)
    ? action.payload.tags.map(String).join(", ")
    : "";

  return tags ? `Add ${tags}` : "Add suggested tags";
}

function SuggestedActionItem({ action }: { action: SuggestedActionDto }) {
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
        <p className="entity-meta">{payloadSummary(action)}</p>
        {action.sourceExcerpt ? (
          <p className="entity-meta">Source: {action.sourceExcerpt}</p>
        ) : null}
      </div>
      {action.status === "PENDING" ? (
        <div className="action-row">
          <form action={approveSuggestedActionAction.bind(null, action.id)}>
            <button className="button button-small" type="submit">
              Approve
            </button>
          </form>
          <form action={dismissSuggestedActionAction.bind(null, action.id)}>
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

export default async function AssistPage() {
  const [actions, contextCounts] = await Promise.all([
    listSuggestedActions(),
    getAssistContextCounts(),
  ]);
  const pendingActions = actions.filter(
    (action) => action.status === "PENDING",
  );
  const decidedActions = actions
    .filter((action) => action.status !== "PENDING")
    .slice(0, 6);
  const hasContext = contextCounts.noteCount > 0 || contextCounts.taskCount > 0;

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
          <form action={generateAssistSuggestionsAction} className="form-stack">
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
            action={importSourceForSuggestionsAction}
            className="form-stack"
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
              <SuggestedActionItem action={action} key={action.id} />
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
              <SuggestedActionItem action={action} key={action.id} />
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
