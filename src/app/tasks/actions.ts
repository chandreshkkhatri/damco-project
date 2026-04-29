"use server";

import { createTask, updateTask } from "@/server/tasks";
import { linkNoteToTask, unlinkNoteFromTask } from "@/server/links";
import { parseTagInput } from "@/server/tags";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export async function createTaskAction(formData: FormData) {
  await createTask({
    title: formData.get("title")?.toString() ?? "",
    description: formData.get("description")?.toString().trim() || null,
    deadline: formData.get("deadline")?.toString().trim() || null,
    status: ((formData.get("status")?.toString() ?? "TODO") as "TODO" | "IN_PROGRESS" | "DONE"),
    priority: ((formData.get("priority")?.toString() ?? "MEDIUM") as "LOW" | "MEDIUM" | "HIGH"),
    tags: parseTagInput(formData.get("tags"))
  });

  revalidatePath("/tasks");
}

export async function updateTaskAction(taskId: string, formData: FormData) {
  await updateTask(taskId, {
    title: formData.get("title")?.toString() ?? "",
    description: formData.get("description")?.toString().trim() || null,
    deadline: formData.get("deadline")?.toString().trim() || null,
    status: ((formData.get("status")?.toString() ?? "TODO") as "TODO" | "IN_PROGRESS" | "DONE"),
    priority: ((formData.get("priority")?.toString() ?? "MEDIUM") as "LOW" | "MEDIUM" | "HIGH"),
    tags: parseTagInput(formData.get("tags"))
  });

  revalidatePath("/tasks");
  revalidatePath(`/tasks/${taskId}`);
  redirect(`/tasks/${taskId}`);
}

export async function linkNoteToTaskAction(taskId: string, formData: FormData) {
  const noteId = formData.get("noteId")?.toString() ?? "";
  await linkNoteToTask(noteId, { taskId });

  revalidatePath(`/tasks/${taskId}`);
  revalidatePath(`/notes/${noteId}`);
}

export async function unlinkNoteFromTaskAction(taskId: string, noteId: string) {
  await unlinkNoteFromTask(noteId, taskId);

  revalidatePath(`/tasks/${taskId}`);
  revalidatePath(`/notes/${noteId}`);
}
