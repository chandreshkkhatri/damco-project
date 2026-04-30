import { redirectToAssist } from "@/app/api/assist/route-helpers";
import { generateSuggestedActions } from "@/server/assist";

export async function POST(request: Request) {
  try {
    const suggestions = await generateSuggestedActions();

    return redirectToAssist(
      request,
      suggestions.length === 0
        ? { status: "no-suggestions" }
        : { status: "generated", count: suggestions.length },
    );
  } catch {
    return redirectToAssist(request, { error: "generate" });
  }
}