import { db } from "@/lib/db";
import { describe, expect, it } from "vitest";

describe("database initialization", () => {
  it("can create and read the core entities against the test database", async () => {
    const note = await db.note.create({
      data: {
        content: "Capture the context before deciding what to work on next."
      }
    });

    const task = await db.task.create({
      data: {
        title: "Finish Phase 0 scaffold"
      }
    });

    const link = await db.noteTaskLink.create({
      data: {
        noteId: note.id,
        taskId: task.id
      }
    });

    const linkedTasks = await db.note.findUniqueOrThrow({
      where: { id: note.id },
      include: {
        links: {
          include: {
            task: true
          }
        }
      }
    });

    expect(link.id).toEqual(expect.any(String));
    expect(linkedTasks.links).toHaveLength(1);
    expect(linkedTasks.links[0]?.task.title).toBe("Finish Phase 0 scaffold");
  });
});

