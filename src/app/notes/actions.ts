"use server";

import { createNote, updateNote } from "@/server/notes";
import { linkNoteToTask, unlinkNoteFromTask } from "@/server/links";
import { parseTagInput } from "@/server/tags";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export async function createNoteAction(formData: FormData) {
  await createNote({
    content: formData.get("content")?.toString() ?? "",
    tags: parseTagInput(formData.get("tags"))
  });

  revalidatePath("/notes");
}

export async function updateNoteAction(noteId: string, formData: FormData) {
  await updateNote(noteId, {
    content: formData.get("content")?.toString() ?? "",
    tags: parseTagInput(formData.get("tags"))
  });

  revalidatePath("/notes");
  revalidatePath(`/notes/${noteId}`);
  redirect(`/notes/${noteId}`);
}

export async function linkTaskToNoteAction(noteId: string, formData: FormData) {
  const taskId = formData.get("taskId")?.toString() ?? "";
  await linkNoteToTask(noteId, { taskId });

  revalidatePath(`/notes/${noteId}`);
  revalidatePath(`/tasks/${taskId}`);
}

export async function unlinkTaskFromNoteAction(noteId: string, taskId: string) {
  await unlinkNoteFromTask(noteId, taskId);

  revalidatePath(`/notes/${noteId}`);
  revalidatePath(`/tasks/${taskId}`);
}
