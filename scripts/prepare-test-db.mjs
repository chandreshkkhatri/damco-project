import { execFileSync } from "node:child_process";
import { existsSync, rmSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const testDbPath = path.join(rootDir, "prisma", "test.db");
const databaseUrl = `file:${testDbPath}`;
const prismaCommand = path.join(rootDir, "node_modules", ".bin", process.platform === "win32" ? "prisma.cmd" : "prisma");

if (existsSync(testDbPath)) {
  rmSync(testDbPath, { force: true });
}

execFileSync(prismaCommand, ["db", "push", "--skip-generate"], {
  cwd: rootDir,
  env: {
    ...process.env,
    DATABASE_URL: databaseUrl
  },
  stdio: "inherit"
});
