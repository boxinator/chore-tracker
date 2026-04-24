import fs from "node:fs";
import path from "node:path";
import { defineConfig } from "@playwright/test";

const e2eDir = path.join(process.cwd(), "e2e", ".tmp");
const databasePath = path.join(e2eDir, `chore-tracker.e2e.${Date.now()}.db`);

fs.mkdirSync(e2eDir, { recursive: true });

export default defineConfig({
  testDir: "./e2e",
  timeout: 60_000,
  use: {
    baseURL: "http://127.0.0.1:4173",
    trace: "on-first-retry"
  },
  webServer: {
    command: "npm run dev",
    url: "http://127.0.0.1:4173",
    reuseExistingServer: false,
    env: {
      PORT: "3101",
      API_PORT: "3101",
      VITE_PORT: "4173",
      DATABASE_PATH: databasePath
    },
    timeout: 120_000
  }
});
