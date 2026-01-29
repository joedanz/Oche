// ABOUTME: Tests for the audit log system.
// ABOUTME: Validates creating, querying, and filtering audit log entries.

import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Id } from "./_generated/dataModel";

// Will import once implemented
import {
  createAuditLogEntryHandler,
  getAuditLogHandler,
} from "./auditLog";

type MockDoc = Record<string, any> & { _id: string };

function createMockDb() {
  const docs: MockDoc[] = [];

  return {
    docs,
    insert: vi.fn(async (_table: string, doc: any) => {
      const id = `audit_${docs.length}`;
      docs.push({ ...doc, _id: id });
      return id;
    }),
    query: vi.fn((_table: string) => {
      let filtered = [...docs];
      return {
        withIndex: (_name: string, fn: any) => {
          const eq = (field: string, value: any) => {
            filtered = filtered.filter((d) => d[field] === value);
            return { eq };
          };
          fn({ eq });
          return {
            order: (_dir: string) => ({
              collect: async () => [...filtered].reverse(),
            }),
            collect: async () => filtered,
          };
        },
        order: (_dir: string) => ({
          collect: async () => [...filtered].reverse(),
        }),
        collect: async () => filtered,
      };
    }),
  };
}

const leagueId = "league1" as Id<"leagues">;
const userId = "user1" as Id<"users">;

describe("createAuditLogEntryHandler", () => {
  let db: ReturnType<typeof createMockDb>;

  beforeEach(() => {
    vi.resetAllMocks();
    db = createMockDb();
  });

  it("creates a score_entry audit log", async () => {
    await createAuditLogEntryHandler({ db: db as any }, {
      leagueId,
      userId,
      action: "score_entry",
      details: "Entered scores for Game 1",
    });

    expect(db.insert).toHaveBeenCalledWith("auditLog", expect.objectContaining({
      leagueId,
      userId,
      action: "score_entry",
      details: "Entered scores for Game 1",
    }));
  });

  it("creates a score_edit audit log with old/new values", async () => {
    await createAuditLogEntryHandler({ db: db as any }, {
      leagueId,
      userId,
      action: "score_edit",
      details: "Edited inning 3",
      oldValue: "5",
      newValue: "7",
    });

    expect(db.insert).toHaveBeenCalledWith("auditLog", expect.objectContaining({
      action: "score_edit",
      oldValue: "5",
      newValue: "7",
    }));
  });

  it("creates a role_change audit log", async () => {
    await createAuditLogEntryHandler({ db: db as any }, {
      leagueId,
      userId,
      action: "role_change",
      details: "Changed role for user X",
      oldValue: "player",
      newValue: "captain",
    });

    expect(db.insert).toHaveBeenCalledWith("auditLog", expect.objectContaining({
      action: "role_change",
      oldValue: "player",
      newValue: "captain",
    }));
  });

  it("sets timestamp on creation", async () => {
    const now = Date.now();
    vi.spyOn(Date, "now").mockReturnValue(now);

    await createAuditLogEntryHandler({ db: db as any }, {
      leagueId,
      userId,
      action: "score_entry",
      details: "test",
    });

    expect(db.insert).toHaveBeenCalledWith("auditLog", expect.objectContaining({
      createdAt: now,
    }));
  });
});

describe("getAuditLogHandler", () => {
  let db: ReturnType<typeof createMockDb>;

  beforeEach(() => {
    vi.resetAllMocks();
    db = createMockDb();
  });

  it("returns audit log entries for a league", async () => {
    db.docs.push(
      { _id: "a1", leagueId, userId, action: "score_entry", details: "test1", createdAt: 1000 },
      { _id: "a2", leagueId, userId, action: "score_edit", details: "test2", createdAt: 2000 },
    );
    (db as any).get = vi.fn(async () => ({ name: "Joe", email: "joe@test.com" }));

    const result = await getAuditLogHandler({ db: db as any }, { leagueId });
    expect(result.length).toBe(2);
  });

  it("filters by action type", async () => {
    db.docs.push(
      { _id: "a1", leagueId, userId, action: "score_entry", details: "t1", createdAt: 1000 },
      { _id: "a2", leagueId, userId, action: "role_change", details: "t2", createdAt: 2000 },
    );
    (db as any).get = vi.fn(async () => ({ name: "Joe", email: "joe@test.com" }));

    const result = await getAuditLogHandler({ db: db as any }, { leagueId, action: "role_change" });
    expect(result.every((e: any) => e.action === "role_change")).toBe(true);
  });

  it("enriches entries with user name", async () => {
    db.docs.push(
      { _id: "a1", leagueId, userId, action: "score_entry", details: "test", createdAt: 1000 },
    );
    (db as any).get = vi.fn(async (id: string) => {
      if (id === userId) return { name: "Joe", email: "joe@test.com" };
      return null;
    });

    const result = await getAuditLogHandler({ db: db as any }, { leagueId });
    expect(result[0]).toHaveProperty("userName");
    expect(result[0].userName).toBe("Joe");
  });
});
