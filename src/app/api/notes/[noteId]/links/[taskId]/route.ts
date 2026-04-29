import { unlinkNoteFromTask } from "@/server/links";
import { toRouteErrorResponse } from "@/server/http";
import { NextResponse } from "next/server";

type NoteLinkRouteContext = {
  params: Promise<{
    noteId: string;
    taskId: string;
  }>;
};

export async function DELETE(_request: Request, context: NoteLinkRouteContext) {
  try {
    const { noteId, taskId } = await context.params;
    const link = await unlinkNoteFromTask(noteId, taskId);

    return NextResponse.json({ link });
  } catch (error) {
    return toRouteErrorResponse(error);
  }
}