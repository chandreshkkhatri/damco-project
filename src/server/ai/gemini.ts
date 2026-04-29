import type {
  RecommendationExplanation,
  RecommendationExplanationProvider,
  RecommendationExplanationRequest,
  WeeklySummaryProvider,
  WeeklySummaryRequest,
  WeeklySummaryResult
} from "@/server/ai/provider";

type GeminiContentPart = {
  text?: string;
};

type GeminiResponse = {
  candidates?: Array<{
    content?: {
      parts?: GeminiContentPart[];
    };
  }>;
};

const generationTimeoutMs = 5000;

function extractJson(text: string) {
  const match = text.match(/\[[\s\S]*\]/) ?? text.match(/\{[\s\S]*\}/);
  return match?.[0] ?? text;
}

function toExplanations(value: unknown): RecommendationExplanation[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.flatMap((item) => {
    if (
      typeof item === "object" &&
      item !== null &&
      "taskId" in item &&
      "explanation" in item &&
      typeof item.taskId === "string" &&
      typeof item.explanation === "string" &&
      item.explanation.trim().length > 0
    ) {
      return [
        {
          taskId: item.taskId,
          explanation: item.explanation.trim()
        }
      ];
    }

    return [];
  });
}

function toWeeklySummaryResult(value: unknown): WeeklySummaryResult {
  if (
    typeof value === "object" &&
    value !== null &&
    "summary" in value &&
    typeof value.summary === "string" &&
    value.summary.trim().length > 0
  ) {
    return {
      summary: value.summary.trim()
    };
  }

  throw new Error("Gemini weekly summary response was invalid.");
}

export class GeminiRecommendationExplanationProvider implements RecommendationExplanationProvider, WeeklySummaryProvider {
  constructor(
    private readonly apiKey: string,
    private readonly model = "gemini-1.5-flash",
  ) {}

  private async generateText(prompt: string) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), generationTimeoutMs);

    try {
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${this.model}:generateContent?key=${this.apiKey}`, {
        method: "POST",
        signal: controller.signal,
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [{ text: prompt }]
            }
          ]
        })
      });

      if (!response.ok) {
        throw new Error(`Gemini request failed with ${response.status}.`);
      }

      const payload = (await response.json()) as GeminiResponse;
      return payload.candidates?.[0]?.content?.parts?.map((part) => part.text ?? "").join("\n").trim() ?? "";
    } finally {
      clearTimeout(timeoutId);
    }
  }

  async explainRecommendations(request: RecommendationExplanationRequest) {
    const prompt = [
      "Explain why these tasks are recommended next actions.",
      "Return only a JSON array of objects with taskId and explanation fields.",
      "Keep each explanation under 28 words and do not change the ranking.",
      JSON.stringify(request.recommendations)
    ].join("\n\n");
    const text = await this.generateText(prompt);

    if (!text) {
      return [];
    }

    return toExplanations(JSON.parse(extractJson(text)));
  }

  async summarizeWeek(request: WeeklySummaryRequest) {
    const prompt = [
      "Rewrite the weekly work summary using only the supplied evidence.",
      "Return only a JSON object with a summary field.",
      "Keep the summary under 60 words. Do not add facts, dates, task names, or themes that are not present in the evidence.",
      JSON.stringify(request)
    ].join("\n\n");
    const text = await this.generateText(prompt);

    return toWeeklySummaryResult(JSON.parse(extractJson(text)));
  }
}