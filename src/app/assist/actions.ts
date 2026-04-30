"use server";

import {
  approveSuggestedAction,
  dismissSuggestedAction,
  generateSuggestedActions,
} from "@/server/assist";
import { revalidatePath } from "next/cache";

function revalidateAssistSurfaces() {
  revalidatePath("/assist");
  revalidatePath("/");
  revalidatePath("/weekly");
  revalidatePath("/notes");
  revalidatePath("/tasks");
}

export async function generateAssistSuggestionsAction() {
  await generateSuggestedActions();
  revalidateAssistSurfaces();
}

export async function importSourceForSuggestionsAction(formData: FormData) {
  await generateSuggestedActions({
    sourceText: formData.get("sourceText")?.toString() ?? "",
    sourceType: "manual_email",
  });
  revalidateAssistSurfaces();
}

export async function approveSuggestedActionAction(suggestedActionId: string) {
  await approveSuggestedAction(suggestedActionId);
  revalidateAssistSurfaces();
}

export async function dismissSuggestedActionAction(suggestedActionId: string) {
  await dismissSuggestedAction(suggestedActionId);
  revalidateAssistSurfaces();
}
