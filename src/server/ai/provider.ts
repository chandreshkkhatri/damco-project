export type RecommendationExplanationPromptItem = {
  taskId: string;
  title: string;
  score: number;
  reasons: string[];
  linkedNotes: string[];
};

export type RecommendationExplanationRequest = {
  recommendations: RecommendationExplanationPromptItem[];
};

export type RecommendationExplanation = {
  taskId: string;
  explanation: string;
};

export type RecommendationExplanationProvider = {
  explainRecommendations(request: RecommendationExplanationRequest): Promise<RecommendationExplanation[]>;
};