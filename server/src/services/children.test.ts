import { afterEach, describe, expect, it } from "vitest";
import type { DatabaseConnection } from "../db/connection.js";
import { createTestDatabase } from "../db/test-helpers.js";
import {
  ChildValidationError,
  createChild,
  listChildren,
  parseChildInput,
  updateChild
} from "./children.js";

let db: DatabaseConnection | null = null;

afterEach(() => {
  db?.close();
  db = null;
});

function createBaseFixture() {
  db = createTestDatabase();
  const now = "2026-04-23T08:00:00.000Z";

  db.prepare(
    `
      INSERT INTO children (id, name, sort_order, created_at, updated_at)
      VALUES
        ('child-1', 'Sample Child 1', 1, @now, @now),
        ('child-2', 'Sample Child 2', 2, @now, @now)
    `
  ).run({ now });

  return db;
}

describe("children service", () => {
  it("lists children in sort order", () => {
    const fixtureDb = createBaseFixture();

    expect(listChildren(fixtureDb).map((child) => child.name)).toEqual(["Sample Child 1", "Sample Child 2"]);
  });

  it("creates a child at the end of the sort order", () => {
    const fixtureDb = createBaseFixture();

    createChild(fixtureDb, parseChildInput({ name: "Sample Child 3" }));

    expect(listChildren(fixtureDb).map((child) => child.name)).toEqual([
      "Sample Child 1",
      "Sample Child 2",
      "Sample Child 3"
    ]);
  });

  it("updates a child name", () => {
    const fixtureDb = createBaseFixture();

    updateChild(fixtureDb, "child-2", parseChildInput({ name: "Sample Child 2 Rocket" }));

    expect(listChildren(fixtureDb)[1]?.name).toBe("Sample Child 2 Rocket");
  });

  it("rejects invalid child payloads", () => {
    expect(() => parseChildInput({ name: "" })).toThrow(ChildValidationError);
  });
});
