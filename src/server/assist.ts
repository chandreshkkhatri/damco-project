import { db } from "@/lib/db";
import {
  getAssistSuggestionProvider,
  type AssistSuggestionProvider,
} from "@/server/ai";
import { ConflictError, NotFoundError } from "@/server/http";
import { linkNoteToTask } from "@/server/links";
import { createNote, getNote, updateNote } from "@/server/notes";
import {
  createTask,
  getTask,
  taskPriorities,
  taskStatuses,
  updateTask,
} from "@/server/tasks";
import { parseStoredTags } from "@/server/tags";
import { z } from "zod";

export const suggestedActionTypes = [
  "LINK_NOTE_TASK",
  "CREATE_NOTE",
  "CREATE_TASK",
  "ADD_NOTE_TAGS",
  "ADD_TASK_TAGS",
] as const;
export const suggestedActionStatuses = [
  "PENDING",
  "APPROVED",
  "DISMISSED",
] as const;

const linkPayloadSchema = z.object({
  noteId: z.string().trim().min(1),
  taskId: z.string().trim().min(1),
});

const tagsPayloadSchema = z.object({
  tags: z.array(z.string().trim().min(1)).min(1).max(5),
});

const addNoteTagsPayloadSchema = tagsPayloadSchema.extend({
  noteId: z.string().trim().min(1),
});

const addTaskTagsPayloadSchema = tagsPayloadSchema.extend({
  taskId: z.string().trim().min(1),
});

const createNotePayloadSchema = z.object({
  content: z.string().trim().min(1),
  tags: z.array(z.string().trim().min(1)).default([]),
});

const createTaskPayloadSchema = z.object({
  title: z.string().trim().min(1),
  description: z.string().trim().nullable().default(null),
  deadline: z.string().trim().nullable().default(null),
  status: z.enum(taskStatuses).default("TODO"),
  priority: z.enum(taskPriorities).default("MEDIUM"),
  tags: z.array(z.string().trim().min(1)).default([]),
});

const pendingStatus = "PENDING" as const;

export type SuggestedActionType = (typeof suggestedActionTypes)[number];
export type SuggestedActionStatus = (typeof suggestedActionStatuses)[number];

export type SuggestedActionDto = {
  id: string;
  actionType: SuggestedActionType;
  status: SuggestedActionStatus;
  title: string;
  rationale: string;
  payload: Record<string, unknown>;
  sourceType: string | null;
  sourceExcerpt: string | null;
  createdAt: string;
  decidedAt: string | null;
};

export type GenerateSuggestedActionsOptions = {
  provider?: AssistSuggestionProvider | null;
  sourceText?: string | null;
  sourceType?: string | null;
  limit?: number;
};

type DraftSuggestedAction = {
  actionType: SuggestedActionType;
  title: string;
  rationale: string;
  payload: Record<string, unknown>;
  sourceType?: string | null;
  sourceExcerpt?: string | null;
};

function toSuggestedActionDto(action: {
  id: string;
  actionType: string;
  status: string;
  title: string;
  rationale: string;
  payload: string;
  sourceType: string | null;
  sourceExcerpt: string | null;
  createdAt: Date;
  decidedAt: Date | null;
}): SuggestedActionDto {
  return {
    id: action.id,
    actionType: action.actionType as SuggestedActionType,
    status: action.status as SuggestedActionStatus,
    title: action.title,
    rationale: action.rationale,
    payload: JSON.parse(action.payload) as Record<string, unknown>,
    sourceType: action.sourceType,
    sourceExcerpt: action.sourceExcerpt,
    createdAt: action.createdAt.toISOString(),
    decidedAt: action.decidedAt?.toISOString() ?? null,
  };
}

function excerpt(value: string, length = 180) {
  return value.replace(/\s+/g, " ").trim().slice(0, length);
}

function tokenize(value: string) {
  const stopWords = new Set([
    "and",
    "are",
    "but",
    "for",
    "from",
    "has",
    "have",
    "into",
    "the",
    "this",
    "that",
    "with",
    "you",
    "your",
  ]);

  return value
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, " ")
    .split(/\s+/)
    .map((token) => token.trim())
    .filter((token) => token.length >= 4 && !stopWords.has(token));
}

function topKeywords(value: string, existingTags: string[] = []) {
  const existing = new Set(existingTags.map((tag) => tag.toLowerCase()));
  const counts = new Map<string, number>();

  for (const token of tokenize(value)) {
    if (existing.has(token)) {
      continue;
    }

    counts.set(token, (counts.get(token) ?? 0) + 1);
  }

  return [...counts.entries()]
    .sort(
      (left, right) => right[1] - left[1] || left[0].localeCompare(right[0]),
    )
    .slice(0, 3)
    .map(([token]) => token);
}

function sharedScore(
  leftText: string,
  leftTags: string[],
  rightText: string,
  rightTags: string[],
) {
  const leftTagSet = new Set(leftTags.map((tag) => tag.toLowerCase()));
  const rightTagSet = new Set(rightTags.map((tag) => tag.toLowerCase()));
  const tagScore =
    [...leftTagSet].filter((tag) => rightTagSet.has(tag)).length * 3;
  const leftTokens = new Set(tokenize(leftText));
  const rightTokens = new Set(tokenize(rightText));
  const tokenScore = [...leftTokens].filter((token) =>
    rightTokens.has(token),
  ).length;

  return tagScore + tokenScore;
}

async function getAssistContext() {
  const [notes, tasks] = await Promise.all([
    db.note.findMany({
      include: {
        links: true,
      },
      orderBy: {
        updatedAt: "desc",
      },
    }),
    db.task.findMany({
      include: {
        links: true,
      },
      orderBy: [{ status: "asc" }, { updatedAt: "desc" }],
    }),
  ]);

  return { notes, tasks };
}

function sourceDrafts(
  sourceText: string,
  sourceType: string | null,
): DraftSuggestedAction[] {
  const normalizedSource = sourceText.trim();

  if (!normalizedSource) {
    return [];
  }

  const sourceExcerpt = excerpt(normalizedSource);
  const lines = normalizedSource
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  const subjectLine = lines
    .find((line) => /^subject:/i.test(line))
    ?.replace(/^subject:\s*/i, "")
    .trim();
  const actionableLine = lines.find((line) =>
    /(please|todo|to-do|action|follow up|need to|deadline|by\s+[a-z0-9])/i.test(
      line,
    ),
  );
  const taskTitle = excerpt(
    actionableLine ?? subjectLine ?? lines[0] ?? "Review imported source",
    90,
  );

  return [
    {
      actionType: "CREATE_NOTE",
      title: "Create note from imported source",
      rationale:
        "The imported source contains context worth preserving before any task changes are made.",
      payload: {
        content: normalizedSource,
        tags: ["inbox"],
      },
      sourceType,
      sourceExcerpt,
    },
    {
      actionType: "CREATE_TASK",
      title: `Create follow-up task: ${taskTitle}`,
      rationale:
        "The imported source appears to contain a possible follow-up or request.",
      payload: {
        title: taskTitle,
        description: `Imported from source: ${sourceExcerpt}`,
        deadline: null,
        status: "TODO",
        priority: "MEDIUM",
        tags: ["inbox"],
      },
      sourceType,
      sourceExcerpt,
    },
  ];
}

function deterministicDrafts(
  context: Awaited<ReturnType<typeof getAssistContext>>,
  sourceText: string | null,
  sourceType: string | null,
) {
  const drafts: DraftSuggestedAction[] = [];
  const existingLinks = new Set(
    context.tasks.flatMap((task) =>
      task.links.map((link) => `${link.noteId}:${task.id}`),
    ),
  );
  const openTasks = context.tasks.filter((task) => task.status !== "DONE");

  for (const note of context.notes) {
    for (const task of openTasks) {
      if (existingLinks.has(`${note.id}:${task.id}`)) {
        continue;
      }

      const noteTags = parseStoredTags(note.tags);
      const taskTags = parseStoredTags(task.tags);
      const score = sharedScore(
        note.content,
        noteTags,
        `${task.title} ${task.description ?? ""}`,
        taskTags,
      );

      if (score < 2) {
        continue;
      }

      drafts.push({
        actionType: "LINK_NOTE_TASK",
        title: `Link note to ${task.title}`,
        rationale: `The note and task share ${score} context signal${score === 1 ? "" : "s"}, so linking them can make recommendations clearer.`,
        payload: {
          noteId: note.id,
          taskId: task.id,
        },
        sourceType: "existing_context",
        sourceExcerpt: excerpt(note.content),
      });
    }
  }

  for (const note of context.notes) {
    const tags = topKeywords(note.content, parseStoredTags(note.tags));

    if (tags.length > 0) {
      drafts.push({
        actionType: "ADD_NOTE_TAGS",
        title: "Add organizing tags to note",
        rationale:
          "These tags can make the note easier to find and group in weekly themes.",
        payload: {
          noteId: note.id,
          tags,
        },
        sourceType: "existing_context",
        sourceExcerpt: excerpt(note.content),
      });
    }
  }

  for (const task of context.tasks) {
    const tags = topKeywords(
      `${task.title} ${task.description ?? ""}`,
      parseStoredTags(task.tags),
    );

    if (tags.length > 0) {
      drafts.push({
        actionType: "ADD_TASK_TAGS",
        title: `Add organizing tags to ${task.title}`,
        rationale:
          "These tags can make the task easier to group with related notes and weekly themes.",
        payload: {
          taskId: task.id,
          tags,
        },
        sourceType: "existing_context",
        sourceExcerpt: task.description
          ? excerpt(task.description)
          : task.title,
      });
    }
  }

  if (sourceText) {
    drafts.push(...sourceDrafts(sourceText, sourceType));
  }

  return drafts;
}

function validateDraft(
  draft: DraftSuggestedAction,
  context: Awaited<ReturnType<typeof getAssistContext>>,
): DraftSuggestedAction | null {
  if (!suggestedActionTypes.includes(draft.actionType)) {
    return null;
  }

  if (!draft.title.trim() || !draft.rationale.trim()) {
    return null;
  }

  const noteIds = new Set(context.notes.map((note) => note.id));
  const taskIds = new Set(context.tasks.map((task) => task.id));

  try {
    if (draft.actionType === "LINK_NOTE_TASK") {
      const payload = linkPayloadSchema.parse(draft.payload);

      if (!noteIds.has(payload.noteId) || !taskIds.has(payload.taskId)) {
        return null;
      }

      return { ...draft, payload };
    }

    if (draft.actionType === "CREATE_NOTE") {
      return {
        ...draft,
        payload: createNotePayloadSchema.parse(draft.payload),
      };
    }

    if (draft.actionType === "CREATE_TASK") {
      return {
        ...draft,
        payload: createTaskPayloadSchema.parse(draft.payload),
      };
    }

    if (draft.actionType === "ADD_NOTE_TAGS") {
      const payload = addNoteTagsPayloadSchema.parse(draft.payload);

      if (!noteIds.has(payload.noteId)) {
        return null;
      }

      return { ...draft, payload };
    }

    const payload = addTaskTagsPayloadSchema.parse(draft.payload);

    if (!taskIds.has(payload.taskId)) {
      return null;
    }

    return { ...draft, payload };
  } catch {
    return null;
  }
}

function uniqueKey(
  draft: Pick<DraftSuggestedAction, "actionType" | "payload">,
) {
  return `${draft.actionType}:${JSON.stringify(draft.payload)}`;
}

async function providerDrafts(
  provider: AssistSuggestionProvider | null,
  context: Awaited<ReturnType<typeof getAssistContext>>,
  sourceText: string | null,
) {
  if (!provider) {
    return [];
  }

  try {
    const suggestions = await provider.suggestActions({
      notes: context.notes.map((note) => ({
        id: note.id,
        excerpt: excerpt(note.content),
        tags: parseStoredTags(note.tags),
        linkedTaskIds: note.links.map((link) => link.taskId),
      })),
      tasks: context.tasks.map((task) => ({
        id: task.id,
        title: task.title,
        description: task.description,
        status: task.status,
        priority: task.priority,
        deadline: task.deadline?.toISOString() ?? null,
        tags: parseStoredTags(task.tags),
        linkedNoteIds: task.links.map((link) => link.noteId),
      })),
      sourceText,
    });

    return suggestions.map((suggestion) => ({
      ...suggestion,
      sourceType: null,
      sourceExcerpt: null,
    }));
  } catch {
    return [];
  }
}

export async function listSuggestedActions(status?: SuggestedActionStatus) {
  const actions = await db.suggestedAction.findMany({
    where: status ? { status } : undefined,
    orderBy: [{ status: "asc" }, { createdAt: "desc" }],
  });

  return actions.map(toSuggestedActionDto);
}

export async function generateSuggestedActions(
  options: GenerateSuggestedActionsOptions = {},
) {
  const context = await getAssistContext();
  const sourceText = options.sourceText?.trim() || null;
  const sourceType =
    options.sourceType ?? (sourceText ? "manual_import" : "existing_context");
  const provider =
    options.provider === undefined
      ? getAssistSuggestionProvider()
      : options.provider;
  const providerSuggestions = await providerDrafts(
    provider,
    context,
    sourceText,
  );
  const fallbackSuggestions = deterministicDrafts(
    context,
    sourceText,
    sourceType,
  );
  const existingPendingActions = await listSuggestedActions(pendingStatus);
  const seen = new Set(existingPendingActions.map(uniqueKey));
  const collectValidDrafts = (candidates: DraftSuggestedAction[]) =>
    candidates
      .map((draft) =>
        validateDraft(
          {
            ...draft,
            sourceType: draft.sourceType ?? sourceType,
            sourceExcerpt:
              draft.sourceExcerpt ?? (sourceText ? excerpt(sourceText) : null),
          },
          context,
        ),
      )
      .filter((draft): draft is DraftSuggestedAction => draft !== null)
      .filter((draft) => {
        const key = uniqueKey(draft);

        if (seen.has(key)) {
          return false;
        }

        seen.add(key);
        return true;
      })
      .slice(0, options.limit ?? 8);
  let validDrafts = collectValidDrafts(
    providerSuggestions.length > 0 ? providerSuggestions : fallbackSuggestions,
  );

  if (validDrafts.length === 0 && providerSuggestions.length > 0) {
    validDrafts = collectValidDrafts(fallbackSuggestions);
  }

  if (validDrafts.length === 0) {
    return [];
  }

  await db.suggestedAction.createMany({
    data: validDrafts.map((draft) => ({
      actionType: draft.actionType,
      title: draft.title,
      rationale: draft.rationale,
      payload: JSON.stringify(draft.payload),
      sourceType: draft.sourceType ?? null,
      sourceExcerpt: draft.sourceExcerpt ?? null,
    })),
  });

  return listSuggestedActions(pendingStatus);
}

async function requirePendingAction(suggestedActionId: string) {
  const action = await db.suggestedAction.findUnique({
    where: {
      id: suggestedActionId,
    },
  });

  if (!action || action.status !== pendingStatus) {
    throw new NotFoundError("Pending suggested action not found.");
  }

  return toSuggestedActionDto(action);
}

export async function approveSuggestedAction(suggestedActionId: string) {
  const action = await requirePendingAction(suggestedActionId);

  if (action.actionType === "LINK_NOTE_TASK") {
    const payload = linkPayloadSchema.parse(action.payload);

    try {
      await linkNoteToTask(payload.noteId, { taskId: payload.taskId });
    } catch (error) {
      if (!(error instanceof ConflictError)) {
        throw error;
      }
    }
  } else if (action.actionType === "CREATE_NOTE") {
    const payload = createNotePayloadSchema.parse(action.payload);

    await createNote(payload);
  } else if (action.actionType === "CREATE_TASK") {
    const payload = createTaskPayloadSchema.parse(action.payload);

    await createTask(payload);
  } else if (action.actionType === "ADD_NOTE_TAGS") {
    const payload = addNoteTagsPayloadSchema.parse(action.payload);
    const note = await getNote(payload.noteId);

    await updateNote(payload.noteId, {
      content: note.content,
      tags: [...new Set([...note.tags, ...payload.tags])],
    });
  } else {
    const payload = addTaskTagsPayloadSchema.parse(action.payload);
    const task = await getTask(payload.taskId);

    await updateTask(payload.taskId, {
      title: task.title,
      description: task.description,
      deadline: task.deadline,
      status: task.status,
      priority: task.priority,
      tags: [...new Set([...task.tags, ...payload.tags])],
    });
  }

  const updatedAction = await db.suggestedAction.update({
    where: {
      id: action.id,
    },
    data: {
      status: "APPROVED",
      decidedAt: new Date(),
    },
  });

  return toSuggestedActionDto(updatedAction);
}

export async function dismissSuggestedAction(suggestedActionId: string) {
  const action = await requirePendingAction(suggestedActionId);
  const updatedAction = await db.suggestedAction.update({
    where: {
      id: action.id,
    },
    data: {
      status: "DISMISSED",
      decidedAt: new Date(),
    },
  });

  return toSuggestedActionDto(updatedAction);
}
