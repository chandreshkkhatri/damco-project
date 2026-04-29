import { GET as getNoteRoute, PUT as updateNoteRoute } from "@/app/api/notes/[noteId]/route";
import { GET as listNotesRoute, POST as createNoteRoute } from "@/app/api/notes/route";
import { describe, expect, it } from "vitest";

describe("notes api", () => {
  it("creates, lists, retrieves, and updates a note", async () => {
    const createResponse = await createNoteRoute(
      new Request("http://localhost/api/notes", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          content: "Capture useful interview context in a lightweight note.",
          tags: ["interview", "context"]
        })
      }),
    );
    const createdPayload = await createResponse.json();

    expect(createResponse.status).toBe(201);
    expect(createdPayload.note.tags).toEqual(["interview", "context"]);

    const listResponse = await listNotesRoute();
    const listPayload = await listResponse.json();

    expect(listResponse.status).toBe(200);
    expect(listPayload.notes).toHaveLength(1);

    const detailResponse = await getNoteRoute(new Request(`http://localhost/api/notes/${createdPayload.note.id}`), {
      params: Promise.resolve({ noteId: createdPayload.note.id })
    });
    const detailPayload = await detailResponse.json();

    expect(detailResponse.status).toBe(200);
    expect(detailPayload.note.content).toContain("interview context");

    const updateResponse = await updateNoteRoute(
      new Request(`http://localhost/api/notes/${createdPayload.note.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          content: "Capture useful interview context and turn it into next actions.",
          tags: ["interview", "planning"]
        })
      }),
      {
        params: Promise.resolve({ noteId: createdPayload.note.id })
      },
    );
    const updatePayload = await updateResponse.json();

    expect(updateResponse.status).toBe(200);
    expect(updatePayload.note.tags).toEqual(["interview", "planning"]);
    expect(updatePayload.note.content).toContain("next actions");
  });

  it("rejects an empty note", async () => {
    const response = await createNoteRoute(
      new Request("http://localhost/api/notes", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          content: "   ",
          tags: []
        })
      }),
    );
    const payload = await response.json();

    expect(response.status).toBe(400);
    expect(payload.error).toBe("Validation failed");
  });
});
