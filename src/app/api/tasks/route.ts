import { createTask, listTasks, type TaskInput } from "@/server/tasks";
import { parseJsonRequest, toRouteErrorResponse } from "@/server/http";
import { NextResponse } from "next/server";

export async function GET() {
  const tasks = await listTasks();

  return NextResponse.json({ tasks });
}

export async function POST(request: Request) {
  try {
    const payload = await parseJsonRequest<TaskInput>(request);
    const task = await createTask(payload);

    return NextResponse.json({ task }, { status: 201 });
  } catch (error) {
    return toRouteErrorResponse(error);
  }
}
