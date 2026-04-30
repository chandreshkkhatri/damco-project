import { db } from "@/lib/db";
import { createNote, getNote, updateNote } from "@/server/notes";
import { createTask, getTask, updateTask } from "@/server/tasks";
import { demoSeedTag } from "@/server/tags";
import { describe, expect, it } from "vitest";

describe("internal tag handling", () => {
  it("hides the demo seed tag from note DTOs while preserving it on update", async () => {
    const note = await createNote({
      content: "A seeded note that should keep its hidden ownership tag.",
      tags: [demoSeedTag, "demo"]
    });

    expect(note.tags).toEqual(["demo"]);

    const updated = await updateNote(note.id, {
      content: "An updated seeded note.",
      tags: ["edited"]
    });
    const stored = await db.note.findUnique({
      where: { id: note.id },
      select: { tags: true }
    });
    const detail = await getNote(note.id);

    expect(updated.tags).toEqual(["edited"]);
    expect(detail.tags).toEqual(["edited"]);
    expect(stored?.tags).toContain(demoSeedTag);
    expect(stored?.tags).toContain("edited");
  });

  it("hides the demo seed tag from task DTOs while preserving it on update", async () => {
    const task = await createTask({
      title: "A seeded task",
      description: "This task should keep its hidden ownership tag.",
      deadline: null,
      status: "TODO",
      priority: "HIGH",
      tags: [demoSeedTag, "demo"]
    });

    expect(task.tags).toEqual(["demo"]);

    const updated = await updateTask(task.id, {
      title: "An updated seeded task",
      description: "Updated task content.",
      deadline: null,
      status: "IN_PROGRESS",
      priority: "MEDIUM",
      tags: ["edited"]
    });
    const stored = await db.task.findUnique({
      where: { id: task.id },
      select: { tags: true }
    });
    const detail = await getTask(task.id);

    expect(updated.tags).toEqual(["edited"]);
    expect(detail.tags).toEqual(["edited"]);
    expect(stored?.tags).toContain(demoSeedTag);
    expect(stored?.tags).toContain("edited");
  });
});