import { db } from "@/lib/db";
import { ConflictError, NotFoundError } from "@/server/http";
import { parseStoredTags } from "@/server/tags";
import { z } from "zod";

const entityIdSchema = z.string().trim().min(1, "Entity id is required.");

export const noteTaskLinkInputSchema = z.object({
  taskId: z.string().trim().min(1, "Task is required.")
});

export type NoteTaskLinkInput = z.infer<typeof noteTaskLinkInputSchema>;

export type LinkedNoteDto = {
  id: string;
  excerpt: string;
  tags: string[];
  createdAt: string;
  updatedAt: string;
};

export type LinkedTaskDto = {
  id: string;
  title: string;
  status: string;
  priority: string;
  deadline: string | null;
  tags: string[];
  createdAt: string;
  updatedAt: string;
};

export type NoteTaskLinkDto = {
  id: string;
  noteId: string;
  taskId: string;
  createdAt: string;
  note: LinkedNoteDto;
  task: LinkedTaskDto;
};

function toLinkedNoteDto(note: {
  id: string;
  content: string;
  tags: string | null;
  createdAt: Date;
  updatedAt: Date;
}): LinkedNoteDto {
  return {
    id: note.id,
    excerpt: note.content.replace(/\s+/g, " ").trim().slice(0, 140),
    tags: parseStoredTags(note.tags),
    createdAt: note.createdAt.toISOString(),
    updatedAt: note.updatedAt.toISOString()
  };
}

function toLinkedTaskDto(task: {
  id: string;
  title: string;
  status: string;
  priority: string;
  deadline: Date | null;
  tags: string | null;
  createdAt: Date;
  updatedAt: Date;
}): LinkedTaskDto {
  return {
    id: task.id,
    title: task.title,
    status: task.status,
    priority: task.priority,
    deadline: task.deadline?.toISOString() ?? null,
    tags: parseStoredTags(task.tags),
    createdAt: task.createdAt.toISOString(),
    updatedAt: task.updatedAt.toISOString()
  };
}

function toNoteTaskLinkDto(link: {
  id: string;
  noteId: string;
  taskId: string;
  createdAt: Date;
  note: Parameters<typeof toLinkedNoteDto>[0];
  task: Parameters<typeof toLinkedTaskDto>[0];
}): NoteTaskLinkDto {
  return {
    id: link.id,
    noteId: link.noteId,
    taskId: link.taskId,
    createdAt: link.createdAt.toISOString(),
    note: toLinkedNoteDto(link.note),
    task: toLinkedTaskDto(link.task)
  };
}

async function requireNoteId(noteId: string) {
  const parsedNoteId = entityIdSchema.parse(noteId);
  const note = await db.note.findUnique({
    where: { id: parsedNoteId },
    select: { id: true }
  });

  if (!note) {
    throw new NotFoundError("Note not found.");
  }

  return parsedNoteId;
}

async function requireTaskId(taskId: string) {
  const parsedTaskId = entityIdSchema.parse(taskId);
  const task = await db.task.findUnique({
    where: { id: parsedTaskId },
    select: { id: true }
  });

  if (!task) {
    throw new NotFoundError("Task not found.");
  }

  return parsedTaskId;
}

export async function listNoteLinks(noteId: string) {
  const parsedNoteId = await requireNoteId(noteId);
  const links = await db.noteTaskLink.findMany({
    where: { noteId: parsedNoteId },
    include: {
      note: true,
      task: true
    },
    orderBy: { createdAt: "desc" }
  });

  return links.map(toNoteTaskLinkDto);
}

export async function listTaskLinks(taskId: string) {
  const parsedTaskId = await requireTaskId(taskId);
  const links = await db.noteTaskLink.findMany({
    where: { taskId: parsedTaskId },
    include: {
      note: true,
      task: true
    },
    orderBy: { createdAt: "desc" }
  });

  return links.map(toNoteTaskLinkDto);
}

export async function linkNoteToTask(noteId: string, input: NoteTaskLinkInput) {
  const parsedNoteId = await requireNoteId(noteId);
  const parsedInput = noteTaskLinkInputSchema.parse(input);
  const parsedTaskId = await requireTaskId(parsedInput.taskId);

  const existingLink = await db.noteTaskLink.findUnique({
    where: {
      noteId_taskId: {
        noteId: parsedNoteId,
        taskId: parsedTaskId
      }
    }
  });

  if (existingLink) {
    throw new ConflictError("Note is already linked to this task.");
  }

  const link = await db.noteTaskLink.create({
    data: {
      noteId: parsedNoteId,
      taskId: parsedTaskId
    },
    include: {
      note: true,
      task: true
    }
  });

  return toNoteTaskLinkDto(link);
}

export async function unlinkNoteFromTask(noteId: string, taskId: string) {
  const parsedNoteId = await requireNoteId(noteId);
  const parsedTaskId = await requireTaskId(taskId);
  const result = await db.noteTaskLink.deleteMany({
    where: {
      noteId: parsedNoteId,
      taskId: parsedTaskId
    }
  });

  if (result.count === 0) {
    throw new NotFoundError("Link not found.");
  }

  return {
    noteId: parsedNoteId,
    taskId: parsedTaskId
  };
}