import { getTask, updateTask } from "@/server/tasks";
import { toRouteErrorResponse } from "@/server/http";
import { NextResponse } from "next/server";

type TaskRouteContext = {
  params: Promise<{
    taskId: string;
  }>;
};

export async function GET(_request: Request, context: TaskRouteContext) {
  try {
    const { taskId } = await context.params;
    const task = await getTask(taskId);

    return NextResponse.json({ task });
  } catch (error) {
    return toRouteErrorResponse(error);
  }
}

export async function PUT(request: Request, context: TaskRouteContext) {
  try {
    const { taskId } = await context.params;
    const payload = await request.json();
    const task = await updateTask(taskId, payload);

    return NextResponse.json({ task });
  } catch (error) {
    return toRouteErrorResponse(error);
  }
}
