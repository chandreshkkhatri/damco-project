import { GeminiRecommendationExplanationProvider } from "@/server/ai/gemini";
import type { RecommendationExplanationProvider } from "@/server/ai/provider";

export function getRecommendationExplanationProvider(): RecommendationExplanationProvider | null {
  if (process.env.AI_PROVIDER && process.env.AI_PROVIDER !== "gemini") {
    return null;
  }

  if (!process.env.GEMINI_API_KEY) {
    return null;
  }

  return new GeminiRecommendationExplanationProvider(process.env.GEMINI_API_KEY);
}

export type { RecommendationExplanationProvider } from "@/server/ai/provider";