import { db } from "@/lib/db";
import { listTaskLinks, type LinkedNoteDto } from "@/server/links";
import { NotFoundError } from "@/server/http";
import { parseStoredTags, serializeTags } from "@/server/tags";
import { z } from "zod";

export const taskStatuses = ["TODO", "IN_PROGRESS", "DONE"] as const;
export const taskPriorities = ["LOW", "MEDIUM", "HIGH"] as const;

export const taskInputSchema = z.object({
  title: z.string().trim().min(1, "Task title is required."),
  description: z.string().trim().nullable().default(null),
  deadline: z
    .string()
    .trim()
    .nullable()
    .refine((value) => value === null || value.length === 0 || !Number.isNaN(Date.parse(value)), {
      message: "Deadline must be a valid date."
    })
    .transform((value) => (value && value.length > 0 ? value : null)),
  status: z.enum(taskStatuses).default("TODO"),
  priority: z.enum(taskPriorities).default("MEDIUM"),
  tags: z.array(z.string().trim().min(1)).default([])
});

export type TaskInput = z.infer<typeof taskInputSchema>;

export type TaskDto = {
  id: string;
  title: string;
  description: string | null;
  deadline: string | null;
  status: (typeof taskStatuses)[number];
  priority: (typeof taskPriorities)[number];
  tags: string[];
  createdAt: string;
  updatedAt: string;
  completedAt: string | null;
};

export type TaskDetailDto = TaskDto & {
  linkedNotes: LinkedNoteDto[];
};

function toTaskDto(task: {
  id: string;
  title: string;
  description: string | null;
  deadline: Date | null;
  status: string;
  priority: string;
  tags: string | null;
  createdAt: Date;
  updatedAt: Date;
  completedAt: Date | null;
}): TaskDto {
  return {
    id: task.id,
    title: task.title,
    description: task.description,
    deadline: task.deadline?.toISOString() ?? null,
    status: task.status as TaskDto["status"],
    priority: task.priority as TaskDto["priority"],
    tags: parseStoredTags(task.tags),
    createdAt: task.createdAt.toISOString(),
    updatedAt: task.updatedAt.toISOString(),
    completedAt: task.completedAt?.toISOString() ?? null
  };
}

async function requireTask(taskId: string) {
  const task = await db.task.findUnique({
    where: { id: taskId }
  });

  if (!task) {
    throw new NotFoundError("Task not found.");
  }

  return task;
}

function getCompletedAt(status: TaskInput["status"], existingCompletedAt: Date | null) {
  if (status === "DONE") {
    return existingCompletedAt ?? new Date();
  }

  return null;
}

export async function listTasks() {
  const tasks = await db.task.findMany({
    orderBy: [{ status: "asc" }, { deadline: "asc" }, { updatedAt: "desc" }]
  });

  return tasks.map(toTaskDto);
}

export async function getTask(taskId: string) {
  const task = await requireTask(taskId);
  const links = await listTaskLinks(taskId);

  return {
    ...toTaskDto(task),
    linkedNotes: links.map((link) => link.note)
  } satisfies TaskDetailDto;
}

export async function createTask(input: TaskInput) {
  const parsedInput = taskInputSchema.parse(input);

  const task = await db.task.create({
    data: {
      title: parsedInput.title,
      description: parsedInput.description,
      deadline: parsedInput.deadline ? new Date(parsedInput.deadline) : null,
      status: parsedInput.status,
      priority: parsedInput.priority,
      tags: serializeTags(parsedInput.tags),
      completedAt: getCompletedAt(parsedInput.status, null)
    }
  });

  return toTaskDto(task);
}

export async function updateTask(taskId: string, input: TaskInput) {
  const parsedInput = taskInputSchema.parse(input);
  const existingTask = await requireTask(taskId);

  const task = await db.task.update({
    where: { id: taskId },
    data: {
      title: parsedInput.title,
      description: parsedInput.description,
      deadline: parsedInput.deadline ? new Date(parsedInput.deadline) : null,
      status: parsedInput.status,
      priority: parsedInput.priority,
      tags: serializeTags(parsedInput.tags),
      completedAt: getCompletedAt(parsedInput.status, existingTask.completedAt)
    }
  });

  return toTaskDto(task);
}
