import { db } from "@/lib/db";
import {
  approveSuggestedAction,
  dismissSuggestedAction,
  generateSuggestedActions,
  listSuggestedActions,
} from "@/server/assist";
import { createNote, getNote } from "@/server/notes";
import { createTask, getTask } from "@/server/tasks";
import { describe, expect, it } from "vitest";

async function createLinkableFixtures() {
  const note = await createNote({
    content:
      "Onboarding workflow notes mention launch blockers and customer handoff details.",
    tags: ["onboarding"],
  });
  const task = await createTask({
    title: "Plan onboarding workflow",
    description: "Resolve customer handoff blockers before launch.",
    deadline: null,
    status: "TODO",
    priority: "HIGH",
    tags: ["onboarding"],
  });

  return { note, task };
}

describe("assist suggested actions", () => {
  it("generates deterministic link suggestions without mutating links", async () => {
    const { note, task } = await createLinkableFixtures();

    const suggestions = await generateSuggestedActions({
      provider: null,
      limit: 4,
    });
    const linkSuggestion = suggestions.find(
      (suggestion) => suggestion.actionType === "LINK_NOTE_TASK",
    );

    expect(linkSuggestion?.payload).toEqual({
      noteId: note.id,
      taskId: task.id,
    });
    expect(await db.noteTaskLink.count()).toBe(0);
  });

  it("approves a link suggestion through the existing link service", async () => {
    const { note, task } = await createLinkableFixtures();
    const suggestions = await generateSuggestedActions({
      provider: null,
      limit: 4,
    });
    const linkSuggestion = suggestions.find(
      (suggestion) => suggestion.actionType === "LINK_NOTE_TASK",
    );

    expect(linkSuggestion).toBeDefined();

    const approved = await approveSuggestedAction(linkSuggestion!.id);
    const noteDetail = await getNote(note.id);
    const taskDetail = await getTask(task.id);

    expect(approved.status).toBe("APPROVED");
    expect(noteDetail.linkedTasks.map((linkedTask) => linkedTask.id)).toEqual([
      task.id,
    ]);
    expect(taskDetail.linkedNotes.map((linkedNote) => linkedNote.id)).toEqual([
      note.id,
    ]);
  });

  it("dismisses a suggestion without applying its mutation", async () => {
    await createLinkableFixtures();
    const suggestions = await generateSuggestedActions({
      provider: null,
      limit: 4,
    });
    const linkSuggestion = suggestions.find(
      (suggestion) => suggestion.actionType === "LINK_NOTE_TASK",
    );

    expect(linkSuggestion).toBeDefined();

    const dismissed = await dismissSuggestedAction(linkSuggestion!.id);

    expect(dismissed.status).toBe("DISMISSED");
    expect(await db.noteTaskLink.count()).toBe(0);
  });

  it("accepts provider-backed task suggestions and applies them after approval", async () => {
    const suggestions = await generateSuggestedActions({
      provider: {
        async suggestActions() {
          return [
            {
              actionType: "CREATE_TASK",
              title: "Create follow-up task",
              rationale: "The imported context has a clear next action.",
              payload: {
                title: "Send launch follow-up",
                description: "Confirm owners and next checkpoint.",
                deadline: null,
                status: "TODO",
                priority: "MEDIUM",
                tags: ["launch"],
              },
            },
          ];
        },
      },
      limit: 2,
    });
    const taskSuggestion = suggestions.find(
      (suggestion) => suggestion.actionType === "CREATE_TASK",
    );

    expect(taskSuggestion).toBeDefined();

    await approveSuggestedAction(taskSuggestion!.id);

    const createdTask = await db.task.findFirst({
      where: {
        title: "Send launch follow-up",
      },
    });

    expect(createdTask?.title).toBe("Send launch follow-up");
  });

  it("falls back to deterministic suggestions when the provider fails", async () => {
    const { note, task } = await createLinkableFixtures();
    const suggestions = await generateSuggestedActions({
      provider: {
        async suggestActions() {
          throw new Error("Gemini unavailable");
        },
      },
      limit: 4,
    });
    const linkSuggestion = suggestions.find(
      (suggestion) => suggestion.actionType === "LINK_NOTE_TASK",
    );

    expect(linkSuggestion?.payload).toEqual({
      noteId: note.id,
      taskId: task.id,
    });
  });

  it("falls back to deterministic suggestions when provider output is invalid", async () => {
    const { note, task } = await createLinkableFixtures();
    const suggestions = await generateSuggestedActions({
      provider: {
        async suggestActions() {
          return [
            {
              actionType: "CREATE_TASK",
              title: "Invalid task suggestion",
              rationale:
                "This provider output is structurally present but not usable.",
              payload: {
                title: "",
              },
            },
          ];
        },
      },
      limit: 4,
    });
    const linkSuggestion = suggestions.find(
      (suggestion) => suggestion.actionType === "LINK_NOTE_TASK",
    );

    expect(linkSuggestion?.payload).toEqual({
      noteId: note.id,
      taskId: task.id,
    });
  });

  it("imports pasted email text as reviewable note and task suggestions", async () => {
    const suggestions = await generateSuggestedActions({
      provider: null,
      sourceText:
        "Subject: Launch review\nPlease follow up with legal by Friday and capture the decision.",
      sourceType: "manual_email",
      limit: 4,
    });
    const noteSuggestion = suggestions.find(
      (suggestion) => suggestion.actionType === "CREATE_NOTE",
    );
    const taskSuggestion = suggestions.find(
      (suggestion) => suggestion.actionType === "CREATE_TASK",
    );

    expect(noteSuggestion?.sourceType).toBe("manual_email");
    expect(taskSuggestion?.sourceType).toBe("manual_email");

    await approveSuggestedAction(noteSuggestion!.id);
    await approveSuggestedAction(taskSuggestion!.id);

    const notes = await db.note.findMany();
    const tasks = await db.task.findMany();

    expect(notes[0]?.content).toContain("Launch review");
    expect(tasks[0]?.title).toContain("Follow up with legal");
  });

  it("prioritizes imported note and task suggestions over existing context cleanup", async () => {
    await createLinkableFixtures();

    const suggestions = await generateSuggestedActions({
      provider: null,
      sourceText:
        "Subject: Launch review follow-up\n\nCan you please follow up on the launch review notes by Friday?",
      sourceType: "manual_email",
      limit: 2,
    });

    expect(suggestions.map((suggestion) => suggestion.actionType)).toEqual([
      "CREATE_NOTE",
      "CREATE_TASK",
    ]);
    expect(suggestions.every((suggestion) => suggestion.sourceType === "manual_email")).toBe(true);
  });

  it("cleans imported email task titles for review", async () => {
    const suggestions = await generateSuggestedActions({
      provider: null,
      sourceText:
        "Subject: Customer onboarding review\n\nPlease create a follow-up task to review customer onboarding risks by Monday and capture notes about support handoff, QA ownership, and launch messaging.",
      sourceType: "manual_email",
      limit: 2,
    });
    const taskSuggestion = suggestions.find(
      (suggestion) => suggestion.actionType === "CREATE_TASK",
    );
    const noteSuggestion = suggestions.find(
      (suggestion) => suggestion.actionType === "CREATE_NOTE",
    );

    expect(noteSuggestion?.title).toBe("Create note from Customer onboarding review");
    expect(taskSuggestion?.payload.title).toBe("Review customer onboarding risks");
  });

  it("keeps deterministic email import focused on imported source text", async () => {
    await createLinkableFixtures();

    const suggestions = await generateSuggestedActions({
      provider: null,
      sourceText:
        "Subject: Launch review follow-up\n\nCan you please follow up on the launch review notes by Friday?",
      sourceType: "manual_email",
      limit: 8,
    });

    expect(suggestions.map((suggestion) => suggestion.actionType)).toEqual([
      "CREATE_NOTE",
      "CREATE_TASK",
    ]);
  });

  it("adds organization tags only after approval", async () => {
    const note = await createNote({
      content:
        "Research synthesis includes roadmap planning and rollout planning details.",
      tags: [],
    });
    const suggestions = await generateSuggestedActions({
      provider: null,
      limit: 4,
    });
    const tagSuggestion = suggestions.find(
      (suggestion) => suggestion.actionType === "ADD_NOTE_TAGS",
    );

    expect(tagSuggestion).toBeDefined();

    await approveSuggestedAction(tagSuggestion!.id);

    const updatedNote = await getNote(note.id);

    expect(updatedNote.tags.length).toBeGreaterThan(0);
  });

  it("does not duplicate identical pending suggestions", async () => {
    await createLinkableFixtures();

    const firstRunSuggestions = await generateSuggestedActions({ provider: null, limit: 8 });
    const secondRunSuggestions = await generateSuggestedActions({ provider: null, limit: 8 });

    const pendingSuggestions = await listSuggestedActions("PENDING");
    const uniqueKeys = new Set(
      pendingSuggestions.map(
        (suggestion) =>
          `${suggestion.actionType}:${JSON.stringify(suggestion.payload)}`,
      ),
    );

    expect(firstRunSuggestions.length).toBeGreaterThan(0);
    expect(secondRunSuggestions).toHaveLength(0);
    expect(uniqueKeys.size).toBe(pendingSuggestions.length);
  });
});
