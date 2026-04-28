import { fileURLToPath } from "node:url";
import path from "node:path";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const testDbPath = path.join(rootDir, "prisma", "test.db");

process.env.DATABASE_URL = `file:${testDbPath}`;
process.env.NEXT_PUBLIC_APP_NAME = "Context-to-Action System";
