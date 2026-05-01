import {
  redirectToAssist,
  redirectToAssistError,
} from "@/app/api/assist/route-helpers";
import { generateSuggestedActions } from "@/server/assist";

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const suggestions = await generateSuggestedActions({
      sourceText: formData.get("sourceText")?.toString() ?? "",
      sourceType: "manual_email",
    });

    return redirectToAssist(
      request,
      suggestions.length === 0
        ? { status: "no-suggestions" }
        : { status: "imported", count: suggestions.length },
    );
  } catch (error) {
    return redirectToAssistError(request, error, "import");
  }
}