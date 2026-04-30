import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { afterAll, afterEach } from "vitest";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const envFiles = [".env", ".env.local", ".env.example"];
const testSchema = "test";

function readEnvValue(key: string) {
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

function resolveTestDatabaseUrl() {
	const databaseUrl =
		process.env.TEST_DATABASE_URL ??
		process.env.DATABASE_URL ??
		readEnvValue("TEST_DATABASE_URL") ??
		readEnvValue("DATABASE_URL");

	if (!databaseUrl) {
		throw new Error(
			"DATABASE_URL or TEST_DATABASE_URL is required. Copy .env.example to .env and point it at PostgreSQL before running tests."
		);
	}

	if (databaseUrl.startsWith("file:")) {
		throw new Error(
			"SQLite DATABASE_URL values are no longer supported. Use a PostgreSQL connection string for local development, tests, and Vercel deployment."
		);
	}

	const parsedUrl = new URL(databaseUrl);

	parsedUrl.searchParams.set("schema", testSchema);

	return parsedUrl.toString();
}

process.env.DATABASE_URL = resolveTestDatabaseUrl();
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

