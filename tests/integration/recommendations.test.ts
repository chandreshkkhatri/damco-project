import { db } from "@/lib/db";
import { linkNoteToTask } from "@/server/links";
import { createNote } from "@/server/notes";
import { getRecommendations } from "@/server/recommendations";
import { createTask } from "@/server/tasks";
import { describe, expect, it } from "vitest";

const fixedNow = new Date("2026-04-29T12:00:00.000Z");
const oldUpdate = new Date("2026-04-20T12:00:00.000Z");

async function setTaskUpdatedAt(taskId: string, updatedAt = oldUpdate) {
  await db.task.update({
    where: { id: taskId },
    data: { updatedAt }
  });
}

async function setNoteUpdatedAt(noteId: string, updatedAt: Date) {
  await db.note.update({
    where: { id: noteId },
    data: { updatedAt }
  });
}

describe("recommendations", () => {
  it("ranks urgent tasks above non-urgent tasks when other factors are equal", async () => {
    const urgentTask = await createTask({
      title: "Submit interview writeup",
      description: null,
      deadline: "2026-04-30",
      status: "TODO",
      priority: "MEDIUM",
      tags: []
    });
    const laterTask = await createTask({
      title: "Refine backlog labels",
      description: null,
      deadline: "2026-05-10",
      status: "TODO",
      priority: "MEDIUM",
      tags: []
    });

    await setTaskUpdatedAt(urgentTask.id);
    await setTaskUpdatedAt(laterTask.id);

    const recommendations = await getRecommendations({ now: fixedNow, explanationProvider: null });

    expect(recommendations.map((recommendation) => recommendation.task.id)).toEqual([urgentTask.id, laterTask.id]);
    expect(recommendations[0]?.reasons.find((reason) => reason.factor === "deadline")?.score).toBeGreaterThan(
      recommendations[1]?.reasons.find((reason) => reason.factor === "deadline")?.score ?? 0,
    );
  });

  it("excludes completed tasks", async () => {
    const completedTask = await createTask({
      title: "Already shipped",
      description: null,
      deadline: "2026-04-28",
      status: "DONE",
      priority: "HIGH",
      tags: []
    });
    const openTask = await createTask({
      title: "Prepare recommendation demo",
      description: null,
      deadline: null,
      status: "TODO",
      priority: "LOW",
      tags: []
    });

    const recommendations = await getRecommendations({ now: fixedNow, explanationProvider: null });

    expect(recommendations.map((recommendation) => recommendation.task.id)).toEqual([openTask.id]);
    expect(recommendations.map((recommendation) => recommendation.task.id)).not.toContain(completedTask.id);
  });

  it("lets linked recent notes influence ranking", async () => {
    const taskWithContext = await createTask({
      title: "Use interview feedback in scoring",
      description: null,
      deadline: null,
      status: "TODO",
      priority: "LOW",
      tags: []
    });
    const taskWithoutContext = await createTask({
      title: "Clean up old labels",
      description: null,
      deadline: null,
      status: "TODO",
      priority: "LOW",
      tags: []
    });
    const note = await createNote({
      content: "Recent interview note: ranking must explain why linked context matters.",
      tags: ["interview"]
    });

    await setTaskUpdatedAt(taskWithContext.id);
    await setTaskUpdatedAt(taskWithoutContext.id);
    await setNoteUpdatedAt(note.id, fixedNow);
    await linkNoteToTask(note.id, { taskId: taskWithContext.id });

    const recommendations = await getRecommendations({ now: fixedNow, explanationProvider: null });

    expect(recommendations[0]?.task.id).toBe(taskWithContext.id);
    expect(recommendations[0]?.reasons.find((reason) => reason.factor === "linked_notes")?.score).toBe(15);
    expect(recommendations[0]?.linkedNotes[0]?.id).toBe(note.id);
  });

  it("returns at most the top three recommendations in stable order", async () => {
    const taskInputs = [
      ["Highest priority", "HIGH", "2026-05-10"],
      ["Due tomorrow", "MEDIUM", "2026-04-30"],
      ["In progress", "MEDIUM", null],
      ["Low signal", "LOW", null]
    ] as const;

    for (const [title, priority, deadline] of taskInputs) {
      const task = await createTask({
        title,
        description: null,
        deadline,
        status: title === "In progress" ? "IN_PROGRESS" : "TODO",
        priority,
        tags: []
      });

      await setTaskUpdatedAt(task.id);
    }

    const recommendations = await getRecommendations({ now: fixedNow, explanationProvider: null });

    expect(recommendations).toHaveLength(3);
    expect(recommendations.map((recommendation) => recommendation.score)).toEqual(
      [...recommendations.map((recommendation) => recommendation.score)].sort((left, right) => right - left),
    );
    expect(recommendations.map((recommendation) => recommendation.task.title)).not.toContain("Low signal");
  });

  it("uses AI explanations when the provider returns task-specific copy", async () => {
    const task = await createTask({
      title: "Explain recommendation",
      description: null,
      deadline: null,
      status: "TODO",
      priority: "MEDIUM",
      tags: []
    });

    const recommendations = await getRecommendations({
      now: fixedNow,
      explanationProvider: {
        async explainRecommendations() {
          return [{ taskId: task.id, explanation: "AI says this task has a clear next step." }];
        }
      }
    });

    expect(recommendations[0]?.explanation).toBe("AI says this task has a clear next step.");
    expect(recommendations[0]?.explanationSource).toBe("ai");
  });

  it("falls back to deterministic explanations when AI fails", async () => {
    const task = await createTask({
      title: "Fallback task",
      description: null,
      deadline: null,
      status: "TODO",
      priority: "MEDIUM",
      tags: []
    });

    const recommendations = await getRecommendations({
      now: fixedNow,
      explanationProvider: {
        async explainRecommendations() {
          throw new Error("Provider unavailable");
        }
      }
    });

    expect(recommendations[0]?.task.id).toBe(task.id);
    expect(recommendations[0]?.explanationSource).toBe("deterministic");
    expect(recommendations[0]?.explanation).toContain("Fallback task");
  });
});