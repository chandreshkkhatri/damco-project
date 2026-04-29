import { db } from "@/lib/db";
import { getRecommendationExplanationProvider, type RecommendationExplanationProvider } from "@/server/ai";
import { parseStoredTags } from "@/server/tags";

const defaultLimit = 3;

const priorityScores = {
  HIGH: 25,
  MEDIUM: 14,
  LOW: 5
} as const;

const statusScores = {
  IN_PROGRESS: 15,
  TODO: 8
} as const;

export type RecommendationReasonFactor = "deadline" | "priority" | "status" | "linked_notes" | "freshness";

export type RecommendationReasonDto = {
  factor: RecommendationReasonFactor;
  label: string;
  score: number;
  detail: string;
};

export type RecommendationTaskDto = {
  id: string;
  title: string;
  description: string | null;
  deadline: string | null;
  status: string;
  priority: string;
  tags: string[];
  createdAt: string;
  updatedAt: string;
};

export type RecommendationLinkedNoteDto = {
  id: string;
  excerpt: string;
  tags: string[];
  updatedAt: string;
};

export type RecommendationDto = {
  task: RecommendationTaskDto;
  linkedNotes: RecommendationLinkedNoteDto[];
  score: number;
  reasons: RecommendationReasonDto[];
  explanation: string;
  explanationSource: "deterministic" | "ai";
};

type RecommendationOptions = {
  limit?: number;
  now?: Date;
  explanationProvider?: RecommendationExplanationProvider | null;
};

function daysBetween(now: Date, value: Date) {
  const millisecondsPerDay = 24 * 60 * 60 * 1000;
  return Math.ceil((value.getTime() - now.getTime()) / millisecondsPerDay);
}

function ageInDays(now: Date, value: Date) {
  const millisecondsPerDay = 24 * 60 * 60 * 1000;
  return Math.floor((now.getTime() - value.getTime()) / millisecondsPerDay);
}

function scoreDeadline(now: Date, deadline: Date | null): RecommendationReasonDto {
  if (!deadline) {
    return {
      factor: "deadline",
      label: "Deadline",
      score: 0,
      detail: "No deadline set."
    };
  }

  const daysUntilDeadline = daysBetween(now, deadline);

  if (daysUntilDeadline <= 0) {
    return {
      factor: "deadline",
      label: "Deadline",
      score: 40,
      detail: "Due today or overdue."
    };
  }

  if (daysUntilDeadline <= 1) {
    return {
      factor: "deadline",
      label: "Deadline",
      score: 36,
      detail: "Due tomorrow."
    };
  }

  if (daysUntilDeadline <= 3) {
    return {
      factor: "deadline",
      label: "Deadline",
      score: 30,
      detail: `Due in ${daysUntilDeadline} days.`
    };
  }

  if (daysUntilDeadline <= 7) {
    return {
      factor: "deadline",
      label: "Deadline",
      score: 22,
      detail: `Due this week in ${daysUntilDeadline} days.`
    };
  }

  if (daysUntilDeadline <= 14) {
    return {
      factor: "deadline",
      label: "Deadline",
      score: 12,
      detail: `Due in ${daysUntilDeadline} days.`
    };
  }

  return {
    factor: "deadline",
    label: "Deadline",
    score: 4,
    detail: `Due later in ${daysUntilDeadline} days.`
  };
}

function scorePriority(priority: string): RecommendationReasonDto {
  const normalizedPriority = priority as keyof typeof priorityScores;
  const score = priorityScores[normalizedPriority] ?? 0;

  return {
    factor: "priority",
    label: "Priority",
    score,
    detail: `${priority} priority.`
  };
}

function scoreStatus(status: string): RecommendationReasonDto {
  const normalizedStatus = status as keyof typeof statusScores;
  const score = statusScores[normalizedStatus] ?? 0;

  return {
    factor: "status",
    label: "Status",
    score,
    detail: status === "IN_PROGRESS" ? "Already in progress." : "Ready to start."
  };
}

function scoreLinkedNotes(now: Date, linkedNotes: Array<{ updatedAt: Date }>): RecommendationReasonDto {
  if (linkedNotes.length === 0) {
    return {
      factor: "linked_notes",
      label: "Linked notes",
      score: 0,
      detail: "No linked notes yet."
    };
  }

  const newestNote = linkedNotes.reduce((newest, note) => (note.updatedAt > newest.updatedAt ? note : newest));
  const age = ageInDays(now, newestNote.updatedAt);

  if (age <= 1) {
    return {
      factor: "linked_notes",
      label: "Linked notes",
      score: 15,
      detail: "Has linked context updated in the last day."
    };
  }

  if (age <= 3) {
    return {
      factor: "linked_notes",
      label: "Linked notes",
      score: 12,
      detail: "Has linked context updated this week."
    };
  }

  if (age <= 7) {
    return {
      factor: "linked_notes",
      label: "Linked notes",
      score: 8,
      detail: "Has linked context from the last seven days."
    };
  }

  if (age <= 14) {
    return {
      factor: "linked_notes",
      label: "Linked notes",
      score: 4,
      detail: "Has linked context from the last two weeks."
    };
  }

  return {
    factor: "linked_notes",
    label: "Linked notes",
    score: 2,
    detail: "Has older linked context."
  };
}

function scoreFreshness(now: Date, updatedAt: Date): RecommendationReasonDto {
  const age = ageInDays(now, updatedAt);

  if (age <= 1) {
    return {
      factor: "freshness",
      label: "Freshness",
      score: 5,
      detail: "Updated in the last day."
    };
  }

  if (age <= 3) {
    return {
      factor: "freshness",
      label: "Freshness",
      score: 3,
      detail: "Updated recently."
    };
  }

  if (age <= 7) {
    return {
      factor: "freshness",
      label: "Freshness",
      score: 2,
      detail: "Updated this week."
    };
  }

  return {
    factor: "freshness",
    label: "Freshness",
    score: 0,
    detail: "Not updated recently."
  };
}

function noteExcerpt(content: string) {
  return content.replace(/\s+/g, " ").trim().slice(0, 140);
}

function deterministicExplanation(recommendation: Pick<RecommendationDto, "task" | "reasons">) {
  const strongestReasons = recommendation.reasons
    .filter((reason) => reason.score > 0)
    .sort((left, right) => right.score - left.score)
    .slice(0, 2)
    .map((reason) => reason.detail.toLowerCase());

  if (strongestReasons.length === 0) {
    return `${recommendation.task.title} is open and ready to review.`;
  }

  return `${recommendation.task.title} is recommended because it ${strongestReasons.join(" and ")}`;
}

export async function getRecommendations(options: RecommendationOptions = {}) {
  const now = options.now ?? new Date();
  const limit = options.limit ?? defaultLimit;
  const tasks = await db.task.findMany({
    where: {
      status: {
        not: "DONE"
      }
    },
    include: {
      links: {
        include: {
          note: true
        }
      }
    }
  });

  const recommendations: RecommendationDto[] = tasks
    .map((task) => {
      const linkedNotes = task.links.map((link) => ({
        id: link.note.id,
        excerpt: noteExcerpt(link.note.content),
        tags: parseStoredTags(link.note.tags),
        updatedAt: link.note.updatedAt.toISOString()
      }));
      const reasons = [
        scoreDeadline(now, task.deadline),
        scorePriority(task.priority),
        scoreStatus(task.status),
        scoreLinkedNotes(now, task.links.map((link) => ({ updatedAt: link.note.updatedAt }))),
        scoreFreshness(now, task.updatedAt)
      ];
      const score = reasons.reduce((total, reason) => total + reason.score, 0);
      const recommendation = {
        task: {
          id: task.id,
          title: task.title,
          description: task.description,
          deadline: task.deadline?.toISOString() ?? null,
          status: task.status,
          priority: task.priority,
          tags: parseStoredTags(task.tags),
          createdAt: task.createdAt.toISOString(),
          updatedAt: task.updatedAt.toISOString()
        },
        linkedNotes,
        score,
        reasons,
        explanation: "",
        explanationSource: "deterministic" as const
      } satisfies RecommendationDto;

      return {
        ...recommendation,
        explanation: deterministicExplanation(recommendation)
      };
    })
    .sort((left, right) => {
      if (right.score !== left.score) {
        return right.score - left.score;
      }

      if (left.task.deadline !== right.task.deadline) {
        if (!left.task.deadline) {
          return 1;
        }

        if (!right.task.deadline) {
          return -1;
        }

        return left.task.deadline.localeCompare(right.task.deadline);
      }

      if (left.task.updatedAt !== right.task.updatedAt) {
        return right.task.updatedAt.localeCompare(left.task.updatedAt);
      }

      return left.task.title.localeCompare(right.task.title);
    })
    .slice(0, limit);

  const provider = options.explanationProvider === undefined ? getRecommendationExplanationProvider() : options.explanationProvider;

  if (!provider || recommendations.length === 0) {
    return recommendations;
  }

  try {
    const explanations = await provider.explainRecommendations({
      recommendations: recommendations.map((recommendation) => ({
        taskId: recommendation.task.id,
        title: recommendation.task.title,
        score: recommendation.score,
        reasons: recommendation.reasons.filter((reason) => reason.score > 0).map((reason) => `${reason.label}: ${reason.detail}`),
        linkedNotes: recommendation.linkedNotes.map((note) => note.excerpt).filter(Boolean)
      }))
    });
    const explanationsByTaskId = new Map(explanations.map((explanation) => [explanation.taskId, explanation.explanation]));

    return recommendations.map((recommendation) => {
      const explanation = explanationsByTaskId.get(recommendation.task.id);

      if (!explanation) {
        return recommendation;
      }

      return {
        ...recommendation,
        explanation,
        explanationSource: "ai" as const
      };
    });
  } catch {
    return recommendations;
  }
}