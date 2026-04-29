import { fileURLToPath } from "node:url";
import path from "node:path";
import { afterAll, afterEach } from "vitest";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const testDbPath = path.join(rootDir, "prisma", "test.db");

process.env.DATABASE_URL = `file:${testDbPath}`;
process.env.NEXT_PUBLIC_APP_NAME = "Context-to-Action System";

afterEach(async () => {
	const { db } = await import("@/lib/db");

	await db.noteTaskLink.deleteMany();
	await db.activityEvent.deleteMany();
	await db.task.deleteMany();
	await db.note.deleteMany();
});

afterAll(async () => {
	const { db } = await import("@/lib/db");

	await db.$disconnect();
});

