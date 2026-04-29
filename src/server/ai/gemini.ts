import type { RecommendationExplanation, RecommendationExplanationProvider, RecommendationExplanationRequest } from "@/server/ai/provider";

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

function extractJson(text: string) {
  const match = text.match(/\[[\s\S]*\]/);
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

export class GeminiRecommendationExplanationProvider implements RecommendationExplanationProvider {
  constructor(
    private readonly apiKey: string,
    private readonly model = "gemini-1.5-flash",
  ) {}

  async explainRecommendations(request: RecommendationExplanationRequest) {
    const prompt = [
      "Explain why these tasks are recommended next actions.",
      "Return only a JSON array of objects with taskId and explanation fields.",
      "Keep each explanation under 28 words and do not change the ranking.",
      JSON.stringify(request.recommendations)
    ].join("\n\n");

    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${this.model}:generateContent?key=${this.apiKey}`, {
      method: "POST",
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
      throw new Error(`Gemini explanation request failed with ${response.status}.`);
    }

    const payload = (await response.json()) as GeminiResponse;
    const text = payload.candidates?.[0]?.content?.parts?.map((part) => part.text ?? "").join("\n").trim() ?? "";

    if (!text) {
      return [];
    }

    return toExplanations(JSON.parse(extractJson(text)));
  }
}