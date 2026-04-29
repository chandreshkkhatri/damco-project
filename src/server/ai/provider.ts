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

export type WeeklySummaryPromptTask = {
  id: string;
  title: string;
  status: string;
  priority: string;
  deadline: string | null;
  completedAt: string | null;
  tags: string[];
  linkedNotes: string[];
};

export type WeeklySummaryPromptNote = {
  id: string;
  excerpt: string;
  tags: string[];
  linkedTasks: string[];
};

export type WeeklySummaryRequest = {
  periodStart: string;
  periodEnd: string;
  completedTasks: WeeklySummaryPromptTask[];
  pendingTasks: WeeklySummaryPromptTask[];
  recentNotes: WeeklySummaryPromptNote[];
  themes: string[];
  deterministicSummary: string;
};

export type WeeklySummaryResult = {
  summary: string;
};

export type WeeklySummaryProvider = {
  summarizeWeek(request: WeeklySummaryRequest): Promise<WeeklySummaryResult>;
};