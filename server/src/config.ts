import path from "node:path";

const workspaceRoot = process.cwd();
const dataDir = process.env.DATA_DIR ?? path.join(workspaceRoot, "data");
const databasePath = process.env.DATABASE_PATH ?? path.join(dataDir, "chore-tracker.db");
const clientDistDir = path.join(workspaceRoot, "client-dist");

export const config = {
  workspaceRoot,
  dataDir,
  databasePath,
  clientDistDir,
  port: Number(process.env.PORT ?? 3001)
};

