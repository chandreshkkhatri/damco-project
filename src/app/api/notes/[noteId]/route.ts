import { getNote, updateNote, type NoteInput } from "@/server/notes";
import { parseJsonRequest, toRouteErrorResponse } from "@/server/http";
import { NextResponse } from "next/server";

type NoteRouteContext = {
  params: Promise<{
    noteId: string;
  }>;
};

export async function GET(_request: Request, context: NoteRouteContext) {
  try {
    const { noteId } = await context.params;
    const note = await getNote(noteId);

    return NextResponse.json({ note });
  } catch (error) {
    return toRouteErrorResponse(error);
  }
}

export async function PUT(request: Request, context: NoteRouteContext) {
  try {
    const { noteId } = await context.params;
    const payload = await parseJsonRequest<NoteInput>(request);
    const note = await updateNote(noteId, payload);

    return NextResponse.json({ note });
  } catch (error) {
    return toRouteErrorResponse(error);
  }
}
