import { createDatabaseConnection, type DatabaseConnection } from "./connection.js";

export function setupDatabase(databasePath: string): DatabaseConnection {
  const db = createDatabaseConnection(databasePath);

  try {
    db.prepare("SELECT 1 FROM children LIMIT 1").get();
  } catch {
    db.close();
    throw new Error(
      `Database at ${databasePath} is not initialized. Start from the provided sample.db.`
    );
  }

  return db;
}
