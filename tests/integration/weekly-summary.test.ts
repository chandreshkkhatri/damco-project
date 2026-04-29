import { db } from "@/lib/db";
import { linkNoteToTask } from "@/server/links";
import { createNote } from "@/server/notes";
import { createTask } from "@/server/tasks";
import { getWeeklySummary } from "@/server/weekly-summary";
import { describe, expect, it } from "vitest";

const fixedNow = new Date("2026-04-29T12:00:00.000Z");
const thisWeek = new Date("2026-04-28T10:00:00.000Z");
const oldDate = new Date("2026-04-20T10:00:00.000Z");

function getLocalWeekStart(now: Date) {
  const weekStart = new Date(now);
  weekStart.setHours(0, 0, 0, 0);

  const day = weekStart.getDay();
  const daysSinceMonday = day === 0 ? 6 : day - 1;
  weekStart.setDate(weekStart.getDate() - daysSinceMonday);

  return weekStart;
}

async function setTaskDates(taskId: string, dates: { completedAt?: Date | null; updatedAt?: Date }) {
  await db.task.update({
    where: { id: taskId },
    data: dates
  });
}

async function setNoteUpdatedAt(noteId: string, updatedAt: Date) {
  await db.note.update({
    where: { id: noteId },
    data: { updatedAt }
  });
}

describe("weekly summary", () => {
  it("summarizes completed work, recent notes, pending work, and tag themes for the current week", async () => {
    const completedTask = await createTask({
      title: "Ship weekly summary service",
      description: null,
      deadline: null,
      status: "DONE",
      priority: "HIGH",
      tags: ["interview"]
    });
    const pendingTask = await createTask({
      title: "Record walkthrough",
      description: null,
      deadline: "2026-05-01",
      status: "TODO",
      priority: "MEDIUM",
      tags: ["demo"]
    });
    const note = await createNote({
      content: "Interview note: the weekly summary should explain completed work and carry-forward tasks.",
      tags: ["interview"]
    });

    await setTaskDates(completedTask.id, { completedAt: thisWeek, updatedAt: thisWeek });
    await setTaskDates(pendingTask.id, { updatedAt: oldDate });
    await setNoteUpdatedAt(note.id, thisWeek);
    await linkNoteToTask(note.id, { taskId: completedTask.id });

    const summary = await getWeeklySummary({ now: fixedNow, summaryProvider: null });

    expect(summary.periodStart).toBe(getLocalWeekStart(fixedNow).toISOString());
    expect(summary.periodEnd).toBe(fixedNow.toISOString());
    expect(summary.completedTasks.map((task) => task.id)).toEqual([completedTask.id]);
    expect(summary.pendingTasks.map((task) => task.id)).toEqual([pendingTask.id]);
    expect(summary.recentNotes.map((recentNote) => recentNote.id)).toEqual([note.id]);
    expect(summary.completedTasks[0]?.linkedNotes[0]?.id).toBe(note.id);
    expect(summary.recentNotes[0]?.linkedTasks[0]?.id).toBe(completedTask.id);
    expect(summary.themes[0]).toEqual({ label: "interview", count: 2 });
    expect(summary.summarySource).toBe("deterministic");
    expect(summary.summary).toContain("1 completed task");
  });

  it("excludes older notes and tasks that are outside the weekly evidence window", async () => {
    const oldCompletedTask = await createTask({
      title: "Old completed task",
      description: null,
      deadline: null,
      status: "DONE",
      priority: "LOW",
      tags: []
    });
    const oldOpenTask = await createTask({
      title: "Old open task",
      description: null,
      deadline: "2026-05-20",
      status: "TODO",
      priority: "LOW",
      tags: []
    });
    const oldNote = await createNote({
      content: "Old note outside this week's summary window.",
      tags: []
    });

    await setTaskDates(oldCompletedTask.id, { completedAt: oldDate, updatedAt: oldDate });
    await setTaskDates(oldOpenTask.id, { updatedAt: oldDate });
    await setNoteUpdatedAt(oldNote.id, oldDate);

    const summary = await getWeeklySummary({ now: fixedNow, summaryProvider: null });

    expect(summary.completedTasks).toHaveLength(0);
    expect(summary.pendingTasks).toHaveLength(0);
    expect(summary.recentNotes).toHaveLength(0);
    expect(summary.summary).toContain("No completed tasks or recent notes");
  });

  it("uses AI wording without changing deterministic evidence", async () => {
    const task = await createTask({
      title: "Prepare final demo",
      description: null,
      deadline: null,
      status: "DONE",
      priority: "HIGH",
      tags: ["demo"]
    });

    await setTaskDates(task.id, { completedAt: thisWeek, updatedAt: thisWeek });

    const summary = await getWeeklySummary({
      now: fixedNow,
      summaryProvider: {
        async summarizeWeek() {
          return { summary: "AI wording: demo preparation was the main completed work this week." };
        }
      }
    });

    expect(summary.summarySource).toBe("ai");
    expect(summary.summary).toBe("AI wording: demo preparation was the main completed work this week.");
    expect(summary.completedTasks.map((completedTask) => completedTask.id)).toEqual([task.id]);
    expect(summary.themes).toEqual([{ label: "demo", count: 1 }]);
  });

  it("falls back to deterministic wording when AI summary generation fails", async () => {
    const task = await createTask({
      title: "Fallback weekly task",
      description: null,
      deadline: null,
      status: "DONE",
      priority: "MEDIUM",
      tags: []
    });

    await setTaskDates(task.id, { completedAt: thisWeek, updatedAt: thisWeek });

    const summary = await getWeeklySummary({
      now: fixedNow,
      summaryProvider: {
        async summarizeWeek() {
          throw new Error("Provider unavailable");
        }
      }
    });

    expect(summary.summarySource).toBe("deterministic");
    expect(summary.completedTasks.map((completedTask) => completedTask.id)).toEqual([task.id]);
    expect(summary.summary).toContain("1 completed task");
  });
});