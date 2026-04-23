import type { DatabaseConnection } from "./connection.js";
import { createDatabaseConnection } from "./connection.js";
import { initializeSchema } from "./schema.js";

export function createTestDatabase(): DatabaseConnection {
  const db = createDatabaseConnection(":memory:");
  initializeSchema(db);
  return db;
}
