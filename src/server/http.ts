import { NextResponse } from "next/server";
import { ZodError } from "zod";

export class NotFoundError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "NotFoundError";
  }
}

export class ConflictError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ConflictError";
  }
}

export function toRouteErrorResponse(error: unknown) {
  if (error instanceof ZodError) {
    return NextResponse.json(
      {
        error: "Validation failed",
        issues: error.flatten()
      },
      { status: 400 },
    );
  }

  if (error instanceof NotFoundError) {
    return NextResponse.json({ error: error.message }, { status: 404 });
  }

  if (error instanceof ConflictError) {
    return NextResponse.json({ error: error.message }, { status: 409 });
  }

  return NextResponse.json({ error: "Internal server error" }, { status: 500 });
}
