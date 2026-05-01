import {
  redirectToAssist,
  redirectToAssistError,
} from "@/app/api/assist/route-helpers";
import { dismissSuggestedAction } from "@/server/assist";

type AssistActionRouteContext = {
  params: Promise<{
    suggestedActionId: string;
  }>;
};

export async function POST(request: Request, context: AssistActionRouteContext) {
  try {
    const { suggestedActionId } = await context.params;

    await dismissSuggestedAction(suggestedActionId);

    return redirectToAssist(request, { status: "dismissed" });
  } catch (error) {
    return redirectToAssistError(request, error, "dismiss");
  }
}