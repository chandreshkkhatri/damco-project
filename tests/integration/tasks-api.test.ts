import { GET as getTaskRoute, PUT as updateTaskRoute } from "@/app/api/tasks/[taskId]/route";
import { GET as listTasksRoute, POST as createTaskRoute } from "@/app/api/tasks/route";
import { describe, expect, it } from "vitest";

describe("tasks api", () => {
  it("creates, lists, retrieves, and updates a task including completion", async () => {
    const createResponse = await createTaskRoute(
      new Request("http://localhost/api/tasks", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          title: "Ship Phase 1 capture layer",
          description: "Add note and task CRUD before linking.",
          deadline: "2026-05-02",
          status: "TODO",
          priority: "HIGH",
          tags: ["phase-1", "backend"]
        })
      }),
    );
    const createdPayload = await createResponse.json();

    expect(createResponse.status).toBe(201);
    expect(createdPayload.task.priority).toBe("HIGH");

    const listResponse = await listTasksRoute();
    const listPayload = await listResponse.json();

    expect(listResponse.status).toBe(200);
    expect(listPayload.tasks).toHaveLength(1);

    const detailResponse = await getTaskRoute(new Request(`http://localhost/api/tasks/${createdPayload.task.id}`), {
      params: Promise.resolve({ taskId: createdPayload.task.id })
    });
    const detailPayload = await detailResponse.json();

    expect(detailResponse.status).toBe(200);
    expect(detailPayload.task.title).toBe("Ship Phase 1 capture layer");

    const updateResponse = await updateTaskRoute(
      new Request(`http://localhost/api/tasks/${createdPayload.task.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          title: "Ship Phase 1 capture layer",
          description: "CRUD is now in place.",
          deadline: "2026-05-02",
          status: "DONE",
          priority: "HIGH",
          tags: ["phase-1", "frontend"]
        })
      }),
      {
        params: Promise.resolve({ taskId: createdPayload.task.id })
      },
    );
    const updatePayload = await updateResponse.json();

    expect(updateResponse.status).toBe(200);
    expect(updatePayload.task.status).toBe("DONE");
    expect(updatePayload.task.completedAt).toEqual(expect.any(String));
    expect(updatePayload.task.tags).toEqual(["phase-1", "frontend"]);
  });

  it("rejects a task without a title", async () => {
    const response = await createTaskRoute(
      new Request("http://localhost/api/tasks", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          title: "",
          status: "TODO",
          priority: "MEDIUM",
          tags: []
        })
      }),
    );
    const payload = await response.json();

    expect(response.status).toBe(400);
    expect(payload.error).toBe("Validation failed");
  });
});