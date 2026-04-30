import { db } from "@/lib/db";
import { listNoteLinks, type LinkedTaskDto } from "@/server/links";
import { NotFoundError } from "@/server/http";
import { getInternalStoredTags, parseStoredTags, serializeTags } from "@/server/tags";
import { z } from "zod";

export const noteInputSchema = z.object({
  content: z.string().trim().min(1, "Note content is required."),
  tags: z.array(z.string().trim().min(1)).default([])
});

export type NoteInput = z.infer<typeof noteInputSchema>;

export type NoteDto = {
  id: string;
  content: string;
  excerpt: string;
  tags: string[];
  createdAt: string;
  updatedAt: string;
};

export type NoteDetailDto = NoteDto & {
  linkedTasks: LinkedTaskDto[];
};

function toNoteDto(note: {
  id: string;
  content: string;
  tags: string | null;
  createdAt: Date;
  updatedAt: Date;
}): NoteDto {
  const excerpt = note.content.replace(/\s+/g, " ").trim().slice(0, 140);

  return {
    id: note.id,
    content: note.content,
    excerpt,
    tags: parseStoredTags(note.tags),
    createdAt: note.createdAt.toISOString(),
    updatedAt: note.updatedAt.toISOString()
  };
}

async function requireNote(noteId: string) {
  const note = await db.note.findUnique({
    where: { id: noteId }
  });

  if (!note) {
    throw new NotFoundError("Note not found.");
  }

  return note;
}

export async function listNotes() {
  const notes = await db.note.findMany({
    orderBy: { updatedAt: "desc" }
  });

  return notes.map(toNoteDto);
}

export async function getNote(noteId: string) {
  const note = await requireNote(noteId);
  const links = await listNoteLinks(noteId);

  return {
    ...toNoteDto(note),
    linkedTasks: links.map((link) => link.task)
  } satisfies NoteDetailDto;
}

export async function createNote(input: NoteInput) {
  const parsedInput = noteInputSchema.parse(input);

  const note = await db.note.create({
    data: {
      content: parsedInput.content,
      tags: serializeTags(parsedInput.tags)
    }
  });

  return toNoteDto(note);
}

export async function updateNote(noteId: string, input: NoteInput) {
  const parsedInput = noteInputSchema.parse(input);
  const existingNote = await requireNote(noteId);

  const note = await db.note.update({
    where: { id: noteId },
    data: {
      content: parsedInput.content,
      tags: serializeTags([...parsedInput.tags, ...getInternalStoredTags(existingNote.tags)])
    }
  });

  return toNoteDto(note);
}
