import { redirectToAssist } from "@/app/api/assist/route-helpers";
import { approveSuggestedAction } from "@/server/assist";

type AssistActionRouteContext = {
  params: Promise<{
    suggestedActionId: string;
  }>;
};

export async function POST(request: Request, context: AssistActionRouteContext) {
  try {
    const { suggestedActionId } = await context.params;

    await approveSuggestedAction(suggestedActionId);

    return redirectToAssist(request, { status: "approved" });
  } catch {
    return redirectToAssist(request, { error: "approve" });
  }
}