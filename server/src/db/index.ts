import { createDatabaseConnection, type DatabaseConnection } from "./connection.js";
import { seedDatabase } from "./seed.js";
import { initializeSchema } from "./schema.js";

export function setupDatabase(databasePath: string): DatabaseConnection {
  const db = createDatabaseConnection(databasePath);
  initializeSchema(db);
  seedDatabase(db);
  return db;
}
