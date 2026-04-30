import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as typeof globalThis & {
  prisma?: PrismaClient;
};

function getDatabaseUrl() {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    return undefined;
  }

  if (databaseUrl.startsWith("file:")) {
    throw new Error(
      "SQLite DATABASE_URL values are no longer supported. Use a PostgreSQL connection string for local development, tests, and Vercel deployment."
    );
  }

  return databaseUrl;
}

function createPrismaClient() {
  const databaseUrl = getDatabaseUrl();

  return new PrismaClient({
    ...(databaseUrl
      ? {
          datasources: {
            db: {
              url: databaseUrl
            }
          }
        }
      : {}),
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"]
  });
}

function getPrismaClient() {
  if (!globalForPrisma.prisma) {
    globalForPrisma.prisma = createPrismaClient();
  }

  return globalForPrisma.prisma;
}

export const db: PrismaClient = new Proxy({} as PrismaClient, {
  get(_target, property, receiver) {
    const client = getPrismaClient();
    const value = Reflect.get(client, property, receiver);

    return typeof value === "function" ? value.bind(client) : value;
  }
});
