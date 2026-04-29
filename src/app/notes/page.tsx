import { createNoteAction } from "@/app/notes/actions";
import { listNotes, type NoteDto } from "@/server/notes";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function NotesPage() {
  const notes: NoteDto[] = await listNotes();

  return (
    <main className="page-shell">
      <nav className="page-nav" aria-label="Primary navigation">
        <Link href="/">Overview</Link>
        <Link href="/notes">Notes</Link>
        <Link href="/tasks">Tasks</Link>
      </nav>
      <section className="page-header">
        <p className="page-kicker">Phase 1 Capture</p>
        <h1>Notes</h1>
        <p>Capture context in lightweight markdown-friendly notes, then use it later to power links and recommendations.</p>
      </section>
      <div className="capture-grid">
        <section className="panel">
          <div className="panel-heading">
            <h2>Create note</h2>
            <p>Tags are optional. Separate them with commas.</p>
          </div>
          <form action={createNoteAction} className="form-stack">
            <label className="field">
              <span>Note content</span>
              <textarea name="content" placeholder="Capture what matters here..." required rows={10} />
            </label>
            <label className="field">
              <span>Tags</span>
              <input name="tags" placeholder="interview, context, research" />
            </label>
            <button className="button" type="submit">
              Save note
            </button>
          </form>
        </section>
        <section className="panel">
          <div className="panel-heading">
            <h2>Recent notes</h2>
            <p>{notes.length === 0 ? "No notes captured yet." : `${notes.length} note${notes.length === 1 ? "" : "s"} in the system.`}</p>
          </div>
          {notes.length === 0 ? (
            <p className="empty-state">Create the first note to start building useful context for later phases.</p>
          ) : (
            <ul className="entity-list">
              {notes.map((note) => (
                <li className="entity-item" key={note.id}>
                  <div>
                    <p className="entity-title">{note.excerpt || "Untitled note"}</p>
                    <p className="entity-meta">Updated {new Date(note.updatedAt).toLocaleString()}</p>
                    {note.tags.length > 0 ? (
                      <div className="tag-row">
                        {note.tags.map((tag) => (
                          <span className="tag-pill" key={tag}>
                            {tag}
                          </span>
                        ))}
                      </div>
                    ) : null}
                  </div>
                  <Link className="inline-link" href={`/notes/${note.id}`}>
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
