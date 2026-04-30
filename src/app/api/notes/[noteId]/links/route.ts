import { linkNoteToTask, listNoteLinks, type NoteTaskLinkInput } from "@/server/links";
import { parseJsonRequest, toRouteErrorResponse } from "@/server/http";
import { NextResponse } from "next/server";

type NoteLinksRouteContext = {
  params: Promise<{
    noteId: string;
  }>;
};

export async function GET(_request: Request, context: NoteLinksRouteContext) {
  try {
    const { noteId } = await context.params;
    const links = await listNoteLinks(noteId);

    return NextResponse.json({ links });
  } catch (error) {
    return toRouteErrorResponse(error);
  }
}

export async function POST(request: Request, context: NoteLinksRouteContext) {
  try {
    const { noteId } = await context.params;
    const payload = await parseJsonRequest<NoteTaskLinkInput>(request);
    const link = await linkNoteToTask(noteId, payload);

    return NextResponse.json({ link }, { status: 201 });
  } catch (error) {
    return toRouteErrorResponse(error);
  }
}