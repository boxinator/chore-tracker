import fs from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";

export type DatabaseConnection = Database.Database;

export function createDatabaseConnection(databasePath: string): DatabaseConnection {
  if (databasePath !== ":memory:") {
    fs.mkdirSync(path.dirname(databasePath), { recursive: true });
  }

  const db = new Database(databasePath);
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");

  return db;
}
