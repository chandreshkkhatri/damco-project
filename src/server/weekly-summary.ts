import { db } from "@/lib/db";
import { getWeeklySummaryProvider, type WeeklySummaryProvider } from "@/server/ai";
import { parseStoredTags } from "@/server/tags";

const carryForwardDays = 7;
const maxThemes = 5;

export type WeeklyLinkedNoteDto = {
  id: string;
  excerpt: string;
  tags: string[];
  updatedAt: string;
};

export type WeeklyLinkedTaskDto = {
  id: string;
  title: string;
  status: string;
  priority: string;
  deadline: string | null;
  updatedAt: string;
  completedAt: string | null;
};

export type WeeklySummaryTaskDto = WeeklyLinkedTaskDto & {
  tags: string[];
  linkedNotes: WeeklyLinkedNoteDto[];
};

export type WeeklySummaryNoteDto = {
  id: string;
  excerpt: string;
  tags: string[];
  updatedAt: string;
  linkedTasks: WeeklyLinkedTaskDto[];
};

export type WeeklyThemeDto = {
  label: string;
  count: number;
};

export type WeeklySummaryDto = {
  periodStart: string;
  periodEnd: string;
  completedTasks: WeeklySummaryTaskDto[];
  pendingTasks: WeeklySummaryTaskDto[];
  recentNotes: WeeklySummaryNoteDto[];
  themes: WeeklyThemeDto[];
  summary: string;
  summarySource: "deterministic" | "ai";
};

type WeeklySummaryOptions = {
  now?: Date;
  summaryProvider?: WeeklySummaryProvider | null;
};

type TaskWithLinks = {
  id: string;
  title: string;
  status: string;
  priority: string;
  deadline: Date | null;
  tags: string | null;
  updatedAt: Date;
  completedAt: Date | null;
  links: Array<{
    note: {
      id: string;
      content: string;
      tags: string | null;
      updatedAt: Date;
    };
  }>;
};

type NoteWithLinks = {
  id: string;
  content: string;
  tags: string | null;
  updatedAt: Date;
  links: Array<{
    task: {
      id: string;
      title: string;
      status: string;
      priority: string;
      deadline: Date | null;
      updatedAt: Date;
      completedAt: Date | null;
    };
  }>;
};

const keywordStopWords = new Set([
  "about",
  "after",
  "again",
  "also",
  "and",
  "because",
  "for",
  "from",
  "into",
  "next",
  "note",
  "task",
  "that",
  "the",
  "this",
  "with",
  "work"
]);

function addDays(value: Date, days: number) {
  const result = new Date(value);
  result.setDate(result.getDate() + days);
  return result;
}

function getWeekStart(now: Date) {
  const weekStart = new Date(now);
  weekStart.setHours(0, 0, 0, 0);

  const day = weekStart.getDay();
  const daysSinceMonday = day === 0 ? 6 : day - 1;
  weekStart.setDate(weekStart.getDate() - daysSinceMonday);

  return weekStart;
}

function excerpt(content: string) {
  return content.replace(/\s+/g, " ").trim().slice(0, 160);
}

function pluralize(count: number, singular: string, plural = `${singular}s`) {
  return `${count} ${count === 1 ? singular : plural}`;
}

function toLinkedNoteDto(note: TaskWithLinks["links"][number]["note"]): WeeklyLinkedNoteDto {
  return {
    id: note.id,
    excerpt: excerpt(note.content),
    tags: parseStoredTags(note.tags),
    updatedAt: note.updatedAt.toISOString()
  };
}

function toLinkedTaskDto(task: NoteWithLinks["links"][number]["task"]): WeeklyLinkedTaskDto {
  return {
    id: task.id,
    title: task.title,
    status: task.status,
    priority: task.priority,
    deadline: task.deadline?.toISOString() ?? null,
    updatedAt: task.updatedAt.toISOString(),
    completedAt: task.completedAt?.toISOString() ?? null
  };
}

function toSummaryTaskDto(task: TaskWithLinks): WeeklySummaryTaskDto {
  return {
    id: task.id,
    title: task.title,
    status: task.status,
    priority: task.priority,
    deadline: task.deadline?.toISOString() ?? null,
    tags: parseStoredTags(task.tags),
    updatedAt: task.updatedAt.toISOString(),
    completedAt: task.completedAt?.toISOString() ?? null,
    linkedNotes: task.links.map((link) => toLinkedNoteDto(link.note))
  };
}

function toSummaryNoteDto(note: NoteWithLinks): WeeklySummaryNoteDto {
  return {
    id: note.id,
    excerpt: excerpt(note.content),
    tags: parseStoredTags(note.tags),
    updatedAt: note.updatedAt.toISOString(),
    linkedTasks: note.links.map((link) => toLinkedTaskDto(link.task))
  };
}

function addTheme(counts: Map<string, WeeklyThemeDto>, label: string) {
  const normalizedLabel = label.trim().toLowerCase();

  if (!normalizedLabel) {
    return;
  }

  const existingTheme = counts.get(normalizedLabel);

  if (existingTheme) {
    existingTheme.count += 1;
    return;
  }

  counts.set(normalizedLabel, {
    label: normalizedLabel,
    count: 1
  });
}

function keywordsFromText(value: string) {
  return value
    .toLowerCase()
    .match(/[a-z0-9][a-z0-9-]{2,}/g)
    ?.filter((word) => !keywordStopWords.has(word)) ?? [];
}

function getThemes(completedTasks: WeeklySummaryTaskDto[], pendingTasks: WeeklySummaryTaskDto[], recentNotes: WeeklySummaryNoteDto[]) {
  const taggedThemeCounts = new Map<string, WeeklyThemeDto>();
  const keywordThemeCounts = new Map<string, WeeklyThemeDto>();

  for (const task of [...completedTasks, ...pendingTasks]) {
    task.tags.forEach((tag) => addTheme(taggedThemeCounts, tag));
    keywordsFromText(task.title).forEach((keyword) => addTheme(keywordThemeCounts, keyword));
  }

  for (const note of recentNotes) {
    note.tags.forEach((tag) => addTheme(taggedThemeCounts, tag));
    keywordsFromText(note.excerpt).forEach((keyword) => addTheme(keywordThemeCounts, keyword));
  }

  const counts = taggedThemeCounts.size > 0 ? taggedThemeCounts : keywordThemeCounts;

  return [...counts.values()].sort((left, right) => right.count - left.count || left.label.localeCompare(right.label)).slice(0, maxThemes);
}

function deterministicSummary(summary: Pick<WeeklySummaryDto, "completedTasks" | "pendingTasks" | "recentNotes" | "themes">) {
  const evidenceParts = [
    pluralize(summary.completedTasks.length, "completed task"),
    pluralize(summary.recentNotes.length, "recent note"),
    pluralize(summary.pendingTasks.length, "open task")
  ];
  const themeText = summary.themes.length > 0 ? ` Themes: ${summary.themes.map((theme) => theme.label).join(", ")}.` : "";

  if (summary.completedTasks.length === 0 && summary.recentNotes.length === 0) {
    return `No completed tasks or recent notes were found for this week; ${pluralize(summary.pendingTasks.length, "open task")} can carry forward.${themeText}`;
  }

  return `This week includes ${evidenceParts.join(", ")}. Completed tasks are treated as the strongest evidence of work done.${themeText}`;
}

export async function getWeeklySummary(options: WeeklySummaryOptions = {}) {
  const now = options.now ?? new Date();
  const periodStart = getWeekStart(now);
  const periodEnd = now;
  const carryForwardEnd = addDays(periodEnd, carryForwardDays);

  const [completedTaskRows, pendingTaskRows, recentNoteRows] = await Promise.all([
    db.task.findMany({
      where: {
        status: "DONE",
        completedAt: {
          gte: periodStart,
          lte: periodEnd
        }
      },
      include: {
        links: {
          include: {
            note: true
          }
        }
      },
      orderBy: [{ completedAt: "desc" }, { updatedAt: "desc" }, { title: "asc" }]
    }),
    db.task.findMany({
      where: {
        status: {
          not: "DONE"
        },
        OR: [
          {
            updatedAt: {
              gte: periodStart,
              lte: periodEnd
            }
          },
          {
            deadline: {
              gte: periodStart,
              lte: carryForwardEnd
            }
          }
        ]
      },
      include: {
        links: {
          include: {
            note: true
          }
        }
      },
      orderBy: [{ deadline: "asc" }, { updatedAt: "desc" }, { title: "asc" }]
    }),
    db.note.findMany({
      where: {
        updatedAt: {
          gte: periodStart,
          lte: periodEnd
        }
      },
      include: {
        links: {
          include: {
            task: true
          }
        }
      },
      orderBy: [{ updatedAt: "desc" }]
    })
  ]);

  const completedTasks = completedTaskRows.map(toSummaryTaskDto);
  const pendingTasks = pendingTaskRows.map(toSummaryTaskDto);
  const recentNotes = recentNoteRows.map(toSummaryNoteDto);
  const themes = getThemes(completedTasks, pendingTasks, recentNotes);
  const summaryBase = {
    periodStart: periodStart.toISOString(),
    periodEnd: periodEnd.toISOString(),
    completedTasks,
    pendingTasks,
    recentNotes,
    themes,
    summary: "",
    summarySource: "deterministic" as const
  } satisfies WeeklySummaryDto;
  const deterministicText = deterministicSummary(summaryBase);
  const summary = {
    ...summaryBase,
    summary: deterministicText
  } satisfies WeeklySummaryDto;
  const provider = options.summaryProvider === undefined ? getWeeklySummaryProvider() : options.summaryProvider;

  if (!provider) {
    return summary;
  }

  try {
    const result = await provider.summarizeWeek({
      periodStart: summary.periodStart,
      periodEnd: summary.periodEnd,
      completedTasks: summary.completedTasks.map((task) => ({
        id: task.id,
        title: task.title,
        status: task.status,
        priority: task.priority,
        deadline: task.deadline,
        completedAt: task.completedAt,
        tags: task.tags,
        linkedNotes: task.linkedNotes.map((note) => note.excerpt).filter(Boolean)
      })),
      pendingTasks: summary.pendingTasks.map((task) => ({
        id: task.id,
        title: task.title,
        status: task.status,
        priority: task.priority,
        deadline: task.deadline,
        completedAt: task.completedAt,
        tags: task.tags,
        linkedNotes: task.linkedNotes.map((note) => note.excerpt).filter(Boolean)
      })),
      recentNotes: summary.recentNotes.map((note) => ({
        id: note.id,
        excerpt: note.excerpt,
        tags: note.tags,
        linkedTasks: note.linkedTasks.map((task) => task.title)
      })),
      themes: summary.themes.map((theme) => theme.label),
      deterministicSummary: deterministicText
    });

    if (!result.summary.trim()) {
      return summary;
    }

    return {
      ...summary,
      summary: result.summary.trim(),
      summarySource: "ai" as const
    };
  } catch {
    return summary;
  }
}