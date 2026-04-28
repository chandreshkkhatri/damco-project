import { execFileSync } from "node:child_process";
import { existsSync, rmSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const testDbPath = path.join(rootDir, "prisma", "test.db");
const databaseUrl = `file:${testDbPath}`;
const npxCommand = process.platform === "win32" ? "npx.cmd" : "npx";

if (existsSync(testDbPath)) {
  rmSync(testDbPath, { force: true });
}

execFileSync(npxCommand, ["prisma", "generate"], {
  cwd: rootDir,
  env: {
    ...process.env,
    DATABASE_URL: databaseUrl
  },
  stdio: "inherit"
});

execFileSync(npxCommand, ["prisma", "db", "push", "--skip-generate"], {
  cwd: rootDir,
  env: {
    ...process.env,
    DATABASE_URL: databaseUrl
  },
  stdio: "inherit"
});
