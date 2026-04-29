import { createNote, listNotes } from "@/server/notes";
import { toRouteErrorResponse } from "@/server/http";
import { NextResponse } from "next/server";

export async function GET() {
  const notes = await listNotes();

  return NextResponse.json({ notes });
}

export async function POST(request: Request) {
  try {
    const payload = await request.json();
    const note = await createNote(payload);

    return NextResponse.json({ note }, { status: 201 });
  } catch (error) {
    return toRouteErrorResponse(error);
  }
}
