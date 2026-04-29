import { updateNoteAction } from "@/app/notes/actions";
import { getNote } from "@/server/notes";
import { notFound } from "next/navigation";
import Link from "next/link";

export const dynamic = "force-dynamic";

type NoteDetailPageProps = {
  params: Promise<{
    noteId: string;
  }>;
};

export default async function NoteDetailPage({ params }: NoteDetailPageProps) {
  try {
    const { noteId } = await params;
    const note = await getNote(noteId);
    const action = updateNoteAction.bind(null, note.id);

    return (
      <main className="page-shell">
        <nav className="page-nav" aria-label="Primary navigation">
          <Link href="/">Overview</Link>
          <Link href="/notes">Notes</Link>
          <Link href="/tasks">Tasks</Link>
        </nav>
        <section className="page-header">
          <p className="page-kicker">Phase 1 Capture</p>
          <h1>Edit note</h1>
          <p>Update the note content and normalized tags. Linking comes in the next phase.</p>
        </section>
        <section className="panel detail-panel">
          <div className="detail-header">
            <div>
              <p className="entity-meta">Created {new Date(note.createdAt).toLocaleString()}</p>
              <p className="entity-meta">Updated {new Date(note.updatedAt).toLocaleString()}</p>
            </div>
            <Link className="inline-link" href="/notes">
              Back to notes
            </Link>
          </div>
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
              <Link className="button button-secondary" href="/notes">
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
