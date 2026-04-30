import { createNote, listNotes, type NoteInput } from "@/server/notes";
import { parseJsonRequest, toRouteErrorResponse } from "@/server/http";
import { NextResponse } from "next/server";

export async function GET() {
  const notes = await listNotes();

  return NextResponse.json({ notes });
}

export async function POST(request: Request) {
  try {
    const payload = await parseJsonRequest<NoteInput>(request);
    const note = await createNote(payload);

    return NextResponse.json({ note }, { status: 201 });
  } catch (error) {
    return toRouteErrorResponse(error);
  }
}
