import { DELETE as unlinkRoute } from "@/app/api/notes/[noteId]/links/[taskId]/route";
import { GET as listLinksRoute, POST as linkRoute } from "@/app/api/notes/[noteId]/links/route";
import { createNote, getNote } from "@/server/notes";
import { createTask, getTask } from "@/server/tasks";
import { describe, expect, it } from "vitest";

async function createLinkedFixtures() {
  const note = await createNote({
    content: "Interview debrief: recommendation logic should explain why a task matters.",
    tags: ["interview"]
  });
  const task = await createTask({
    title: "Design recommendation scoring",
    description: "Use linked notes as one signal.",
    deadline: null,
    status: "TODO",
    priority: "HIGH",
    tags: ["planning"]
  });

  return { note, task };
}

describe("note-task links api", () => {
  it("links a note to a task and returns the relationship from both detail reads", async () => {
    const { note, task } = await createLinkedFixtures();

    const linkResponse = await linkRoute(
      new Request(`http://localhost/api/notes/${note.id}/links`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ taskId: task.id })
      }),
      {
        params: Promise.resolve({ noteId: note.id })
      },
    );
    const linkPayload = await linkResponse.json();

    expect(linkResponse.status).toBe(201);
    expect(linkPayload.link.noteId).toBe(note.id);
    expect(linkPayload.link.taskId).toBe(task.id);

    const listResponse = await listLinksRoute(new Request(`http://localhost/api/notes/${note.id}/links`), {
      params: Promise.resolve({ noteId: note.id })
    });
    const listPayload = await listResponse.json();

    expect(listResponse.status).toBe(200);
    expect(listPayload.links).toHaveLength(1);
    expect(listPayload.links[0].task.title).toBe("Design recommendation scoring");

    const noteDetail = await getNote(note.id);
    const taskDetail = await getTask(task.id);

    expect(noteDetail.linkedTasks).toHaveLength(1);
    expect(noteDetail.linkedTasks[0]?.id).toBe(task.id);
    expect(taskDetail.linkedNotes).toHaveLength(1);
    expect(taskDetail.linkedNotes[0]?.id).toBe(note.id);
  });

  it("rejects duplicate links without creating another relationship", async () => {
    const { note, task } = await createLinkedFixtures();
    const requestBody = JSON.stringify({ taskId: task.id });

    await linkRoute(
      new Request(`http://localhost/api/notes/${note.id}/links`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: requestBody
      }),
      {
        params: Promise.resolve({ noteId: note.id })
      },
    );

    const duplicateResponse = await linkRoute(
      new Request(`http://localhost/api/notes/${note.id}/links`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: requestBody
      }),
      {
        params: Promise.resolve({ noteId: note.id })
      },
    );
    const duplicatePayload = await duplicateResponse.json();
    const listResponse = await listLinksRoute(new Request(`http://localhost/api/notes/${note.id}/links`), {
      params: Promise.resolve({ noteId: note.id })
    });
    const listPayload = await listResponse.json();

    expect(duplicateResponse.status).toBe(409);
    expect(duplicatePayload.error).toBe("Note is already linked to this task.");
    expect(listPayload.links).toHaveLength(1);
  });

  it("unlinks a note from a task and clears both detail reads", async () => {
    const { note, task } = await createLinkedFixtures();

    await linkRoute(
      new Request(`http://localhost/api/notes/${note.id}/links`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ taskId: task.id })
      }),
      {
        params: Promise.resolve({ noteId: note.id })
      },
    );

    const unlinkResponse = await unlinkRoute(new Request(`http://localhost/api/notes/${note.id}/links/${task.id}`, { method: "DELETE" }), {
      params: Promise.resolve({ noteId: note.id, taskId: task.id })
    });
    const unlinkPayload = await unlinkResponse.json();
    const noteDetail = await getNote(note.id);
    const taskDetail = await getTask(task.id);

    expect(unlinkResponse.status).toBe(200);
    expect(unlinkPayload.link).toEqual({ noteId: note.id, taskId: task.id });
    expect(noteDetail.linkedTasks).toHaveLength(0);
    expect(taskDetail.linkedNotes).toHaveLength(0);
  });

  it("returns a stable not-found error when the task does not exist", async () => {
    const note = await createNote({
      content: "Context without a matching task yet.",
      tags: []
    });

    const response = await linkRoute(
      new Request(`http://localhost/api/notes/${note.id}/links`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ taskId: "missing-task" })
      }),
      {
        params: Promise.resolve({ noteId: note.id })
      },
    );
    const payload = await response.json();

    expect(response.status).toBe(404);
    expect(payload.error).toBe("Task not found.");
  });

  it("rejects malformed JSON when creating a link", async () => {
    const note = await createNote({
      content: "Context ready for linking.",
      tags: []
    });

    const response = await linkRoute(
      new Request(`http://localhost/api/notes/${note.id}/links`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: "{"
      }),
      {
        params: Promise.resolve({ noteId: note.id })
      },
    );
    const payload = await response.json();

    expect(response.status).toBe(400);
    expect(payload.error).toBe("Request body must be valid JSON.");
  });

  it("rejects an invalid link payload", async () => {
    const note = await createNote({
      content: "Another note ready for linking.",
      tags: []
    });

    const response = await linkRoute(
      new Request(`http://localhost/api/notes/${note.id}/links`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ taskId: "" })
      }),
      {
        params: Promise.resolve({ noteId: note.id })
      },
    );
    const payload = await response.json();

    expect(response.status).toBe(400);
    expect(payload.error).toBe("Validation failed");
  });
});