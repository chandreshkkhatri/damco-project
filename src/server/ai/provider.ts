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
  explainRecommendations(
    request: RecommendationExplanationRequest,
  ): Promise<RecommendationExplanation[]>;
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

export type AssistSuggestionActionType =
  | "LINK_NOTE_TASK"
  | "CREATE_NOTE"
  | "CREATE_TASK"
  | "ADD_NOTE_TAGS"
  | "ADD_TASK_TAGS";

export type AssistSuggestionPromptNote = {
  id: string;
  excerpt: string;
  tags: string[];
  linkedTaskIds: string[];
};

export type AssistSuggestionPromptTask = {
  id: string;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  deadline: string | null;
  tags: string[];
  linkedNoteIds: string[];
};

export type AssistSuggestionRequest = {
  notes: AssistSuggestionPromptNote[];
  tasks: AssistSuggestionPromptTask[];
  sourceText: string | null;
};

export type AssistSuggestion = {
  actionType: AssistSuggestionActionType;
  title: string;
  rationale: string;
  payload: Record<string, unknown>;
};

export type AssistSuggestionProvider = {
  suggestActions(request: AssistSuggestionRequest): Promise<AssistSuggestion[]>;
};
