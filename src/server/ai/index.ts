import { GeminiRecommendationExplanationProvider } from "@/server/ai/gemini";
import type { RecommendationExplanationProvider, WeeklySummaryProvider } from "@/server/ai/provider";

function getGeminiApiKey() {
  if (process.env.AI_PROVIDER && process.env.AI_PROVIDER !== "gemini") {
    return null;
  }

  return process.env.GEMINI_API_KEY ?? null;
}

export function getRecommendationExplanationProvider(): RecommendationExplanationProvider | null {
  const apiKey = getGeminiApiKey();

  if (!apiKey) {
    return null;
  }

  return new GeminiRecommendationExplanationProvider(apiKey);
}

export function getWeeklySummaryProvider(): WeeklySummaryProvider | null {
  const apiKey = getGeminiApiKey();

  if (!apiKey) {
    return null;
  }

  return new GeminiRecommendationExplanationProvider(apiKey);
}

export type { RecommendationExplanationProvider, WeeklySummaryProvider } from "@/server/ai/provider";