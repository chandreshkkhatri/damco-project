import { PrismaClient } from "@prisma/client";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const seedMarker = "[damco-demo-seed]";
const envFiles = [".env", ".env.local", ".env.example"];

function readEnvValue(key) {
  for (const fileName of envFiles) {
    const filePath = path.join(rootDir, fileName);

    if (!existsSync(filePath)) {
      continue;
    }

    const lines = readFileSync(filePath, "utf8").split(/\r?\n/);

    for (const line of lines) {
      const trimmedLine = line.trim();

      if (!trimmedLine || trimmedLine.startsWith("#")) {
        continue;
      }

      const separatorIndex = trimmedLine.indexOf("=");

      if (separatorIndex === -1) {
        continue;
      }

      const envKey = trimmedLine.slice(0, separatorIndex).trim();

      if (envKey !== key) {
        continue;
      }

      let value = trimmedLine.slice(separatorIndex + 1).trim();

      if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1);
      }

      return value;
    }
  }

  return undefined;
}

function resolveDatabaseUrl(databaseUrl) {
  if (!databaseUrl) {
    throw new Error("DATABASE_URL is required. Copy .env.example to .env or export DATABASE_URL before running db:seed.");
  }

  let normalizedDatabaseUrl = databaseUrl;

  // Keep the seed script aligned with the runtime normalization used by src/lib/db.ts.
  if (normalizedDatabaseUrl.startsWith("file:./prisma/")) {
    normalizedDatabaseUrl = `file:./${normalizedDatabaseUrl.slice("file:./prisma/".length)}`;
  }

  if (normalizedDatabaseUrl.startsWith("file:./")) {
    const relativePath = normalizedDatabaseUrl.slice("file:./".length);
    return `file:${path.join(rootDir, "prisma", relativePath)}`;
  }

  return normalizedDatabaseUrl;
}

function serializeTags(tags) {
  return tags.join(",");
}

function addDays(value, days) {
  const result = new Date(value);
  result.setDate(result.getDate() + days);
  return result;
}

function withLocalTime(value, hour, minute = 0) {
  const result = new Date(value);
  result.setHours(hour, minute, 0, 0);
  return result;
}

function getWeekStart(now) {
  const weekStart = new Date(now);
  weekStart.setHours(0, 0, 0, 0);

  const day = weekStart.getDay();
  const daysSinceMonday = day === 0 ? 6 : day - 1;
  weekStart.setDate(weekStart.getDate() - daysSinceMonday);

  return weekStart;
}

function thisWeekMoment(now, dayOffset, hour) {
  const candidate = withLocalTime(addDays(getWeekStart(now), dayOffset), hour);

  if (candidate <= now) {
    return candidate;
  }

  return new Date(now.getTime() - 5 * 60 * 1000);
}

function withSeedMarker(text) {
  return `${text}\n\n${seedMarker}`;
}

function noteBody(text) {
  return withSeedMarker(text);
}

function taskDescription(text) {
  return withSeedMarker(text);
}

const databaseUrl = resolveDatabaseUrl(process.env.DATABASE_URL ?? readEnvValue("DATABASE_URL"));
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: databaseUrl
    }
  },
  log: ["error"]
});

async function clearExistingDemoData() {
  const [notes, tasks] = await Promise.all([
    prisma.note.findMany({
      where: {
        content: {
          contains: seedMarker
        }
      },
      select: {
        id: true
      }
    }),
    prisma.task.findMany({
      where: {
        description: {
          contains: seedMarker
        }
      },
      select: {
        id: true
      }
    })
  ]);

  const noteIds = notes.map((note) => note.id);
  const taskIds = tasks.map((task) => task.id);

  if (noteIds.length === 0 && taskIds.length === 0) {
    return { noteCount: 0, taskCount: 0 };
  }

  const linkWhere = [];

  if (noteIds.length > 0) {
    linkWhere.push({ noteId: { in: noteIds } });
  }

  if (taskIds.length > 0) {
    linkWhere.push({ taskId: { in: taskIds } });
  }

  if (linkWhere.length > 0) {
    await prisma.noteTaskLink.deleteMany({
      where: {
        OR: linkWhere
      }
    });
  }

  if (noteIds.length > 0) {
    await prisma.note.deleteMany({
      where: {
        id: {
          in: noteIds
        }
      }
    });
  }

  if (taskIds.length > 0) {
    await prisma.task.deleteMany({
      where: {
        id: {
          in: taskIds
        }
      }
    });
  }

  return {
    noteCount: noteIds.length,
    taskCount: taskIds.length
  };
}

async function createSeedNote({ content, createdAt, tags, updatedAt }) {
  const note = await prisma.note.create({
    data: {
      content: noteBody(content),
      tags: serializeTags(tags)
    }
  });

  return prisma.note.update({
    where: {
      id: note.id
    },
    data: {
      createdAt,
      updatedAt
    }
  });
}

async function createSeedTask({ completedAt = null, createdAt, deadline = null, description, priority, status, tags, title, updatedAt }) {
  const task = await prisma.task.create({
    data: {
      title,
      description: taskDescription(description),
      deadline,
      status,
      priority,
      tags: serializeTags(tags),
      completedAt
    }
  });

  return prisma.task.update({
    where: {
      id: task.id
    },
    data: {
      createdAt,
      updatedAt,
      completedAt
    }
  });
}

async function seedDemoData() {
  const now = new Date();
  const thisWeekUpdate = thisWeekMoment(now, 1, 10);
  const thisWeekDocsUpdate = thisWeekMoment(now, 2, 14);
  const thisWeekCompletedAt = thisWeekMoment(now, 3, 16);
  const oldTimestamp = withLocalTime(addDays(getWeekStart(now), -21), 11);
  const urgentDeadline = withLocalTime(addDays(now, 1), 10);
  const upcomingDeadline = withLocalTime(addDays(now, 4), 15);
  const backlogDeadline = withLocalTime(addDays(now, 14), 11);

  const notes = await Promise.all([
    createSeedNote({
      content:
        "Reviewer prep notes: the strongest demo path should show explainable ranking, linked context, and graceful fallback behavior when Gemini is unavailable.",
      createdAt: addDays(thisWeekDocsUpdate, -2),
      tags: ["interview", "ranking", "demo"],
      updatedAt: thisWeekDocsUpdate
    }),
    createSeedNote({
      content:
        "Submission checklist: tighten the README, rehearse the walkthrough, and make the seeded state easy to recreate so the assessment stays reliable from a fresh clone.",
      createdAt: addDays(thisWeekUpdate, -1),
      tags: ["submission", "docs"],
      updatedAt: thisWeekUpdate
    }),
    createSeedNote({
      content:
        "Fallback reminder: the app should remain useful with deterministic recommendations and weekly summaries even when no Gemini API key is configured.",
      createdAt: addDays(thisWeekCompletedAt, -1),
      tags: ["ai", "fallback"],
      updatedAt: thisWeekCompletedAt
    }),
    createSeedNote({
      content:
        "Archived experiment notes from an older iteration: a sidebar-heavy layout distracted from the core ranking story, so it should stay out of the final demo.",
      createdAt: addDays(oldTimestamp, -2),
      tags: ["archive"],
      updatedAt: oldTimestamp
    })
  ]);

  const tasks = await Promise.all([
    createSeedTask({
      title: "Record the Damco walkthrough",
      description: "Capture the final demo path while the recommendation and weekly summary flow are still fresh.",
      createdAt: addDays(thisWeekUpdate, -2),
      deadline: urgentDeadline,
      priority: "HIGH",
      status: "IN_PROGRESS",
      tags: ["demo", "video"],
      updatedAt: thisWeekUpdate
    }),
    createSeedTask({
      title: "Polish the README architecture section",
      description: "Make the setup, architecture, and tradeoffs easy for a reviewer to scan before the walkthrough starts.",
      createdAt: addDays(thisWeekDocsUpdate, -3),
      deadline: upcomingDeadline,
      priority: "MEDIUM",
      status: "TODO",
      tags: ["docs", "submission"],
      updatedAt: thisWeekDocsUpdate
    }),
    createSeedTask({
      title: "Capture future Postgres migration notes",
      description: "Keep a small backlog item that shows lower-priority work remains outside the immediate interview demo path.",
      createdAt: addDays(oldTimestamp, -5),
      deadline: backlogDeadline,
      priority: "LOW",
      status: "TODO",
      tags: ["architecture", "backlog"],
      updatedAt: oldTimestamp
    }),
    createSeedTask({
      title: "Ship the weekly summary layer",
      description: "Represent work completed this week so the Weekly view has meaningful evidence to summarize.",
      completedAt: thisWeekCompletedAt,
      createdAt: addDays(thisWeekCompletedAt, -4),
      priority: "HIGH",
      status: "DONE",
      tags: ["summary", "submission"],
      updatedAt: thisWeekCompletedAt
    }),
    createSeedTask({
      title: "Archive the rejected sidebar experiment",
      description: "Keep one intentionally old completed item so the weekly summary proves it can exclude stale work.",
      completedAt: oldTimestamp,
      createdAt: addDays(oldTimestamp, -7),
      priority: "LOW",
      status: "DONE",
      tags: ["archive"],
      updatedAt: oldTimestamp
    })
  ]);

  await prisma.noteTaskLink.createMany({
    data: [
      {
        noteId: notes[0].id,
        taskId: tasks[0].id
      },
      {
        noteId: notes[1].id,
        taskId: tasks[1].id
      },
      {
        noteId: notes[2].id,
        taskId: tasks[0].id
      },
      {
        noteId: notes[2].id,
        taskId: tasks[3].id
      },
      {
        noteId: notes[3].id,
        taskId: tasks[4].id
      }
    ]
  });

  return {
    noteCount: notes.length,
    taskCount: tasks.length,
    linkCount: 5,
    now
  };
}

async function verifySeededData(now) {
  const weekStart = getWeekStart(now);
  const [completedThisWeekCount, openTaskCount, recentNoteCount, urgentTask, linkCount] = await Promise.all([
    prisma.task.count({
      where: {
        description: {
          contains: seedMarker
        },
        status: "DONE",
        completedAt: {
          gte: weekStart,
          lte: now
        }
      }
    }),
    prisma.task.count({
      where: {
        description: {
          contains: seedMarker
        },
        status: {
          not: "DONE"
        }
      }
    }),
    prisma.note.count({
      where: {
        content: {
          contains: seedMarker
        },
        updatedAt: {
          gte: weekStart,
          lte: now
        }
      }
    }),
    prisma.task.findFirst({
      where: {
        description: {
          contains: seedMarker
        },
        status: {
          not: "DONE"
        },
        deadline: {
          not: null
        }
      },
      orderBy: {
        deadline: "asc"
      }
    }),
    prisma.noteTaskLink.count({
      where: {
        task: {
          description: {
            contains: seedMarker
          }
        }
      }
    })
  ]);

  if (openTaskCount < 3) {
    throw new Error(`Expected at least 3 seeded open tasks, found ${openTaskCount}.`);
  }

  if (completedThisWeekCount < 1) {
    throw new Error("Expected at least 1 seeded completed task for the current week.");
  }

  if (recentNoteCount < 1) {
    throw new Error("Expected at least 1 seeded note updated during the current week.");
  }

  if (!urgentTask) {
    throw new Error("Expected at least 1 seeded open task with a deadline for Today recommendations.");
  }

  if (linkCount < 2) {
    throw new Error(`Expected at least 2 seeded links, found ${linkCount}.`);
  }

  return {
    completedThisWeekCount,
    openTaskCount,
    recentNoteCount,
    urgentTaskTitle: urgentTask.title
  };
}

async function main() {
  const cleared = await clearExistingDemoData();
  const seeded = await seedDemoData();
  const verified = await verifySeededData(seeded.now);

  console.log(`Removed ${cleared.noteCount} existing demo notes and ${cleared.taskCount} existing demo tasks.`);
  console.log(`Seeded ${seeded.noteCount} notes, ${seeded.taskCount} tasks, and ${seeded.linkCount} links.`);
  console.log(
    `Verified ${verified.openTaskCount} open tasks, ${verified.completedThisWeekCount} completed task this week, and ${verified.recentNoteCount} recent notes.`,
  );
  console.log(`Earliest seeded deadline belongs to: ${verified.urgentTaskTitle}`);
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });