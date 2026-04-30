import { NextResponse } from "next/server";
import { ZodError } from "zod";

export class BadRequestError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "BadRequestError";
  }
}

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

export async function parseJsonRequest<T>(request: Request) {
  try {
    return (await request.json()) as T;
  } catch (error) {
    if (error instanceof SyntaxError) {
      throw new BadRequestError("Request body must be valid JSON.");
    }

    throw error;
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

  if (error instanceof BadRequestError) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  if (error instanceof NotFoundError) {
    return NextResponse.json({ error: error.message }, { status: 404 });
  }

  if (error instanceof ConflictError) {
    return NextResponse.json({ error: error.message }, { status: 409 });
  }

  return NextResponse.json({ error: "Internal server error" }, { status: 500 });
}
