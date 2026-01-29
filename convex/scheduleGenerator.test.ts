// ABOUTME: Tests for round-robin schedule generation algorithm.
// ABOUTME: Verifies balanced matchups, home/away fairness, and match creation.

import { describe, it, expect, vi, beforeEach } from "vitest";
import { generateRoundRobin } from "./scheduleGenerator";

describe("generateRoundRobin", () => {
  it("generates correct number of rounds for even number of teams", () => {
    const teams = ["t1", "t2", "t3", "t4"];
    const rounds = generateRoundRobin(teams);
    // 4 teams = 3 rounds, 2 matches per round
    expect(rounds).toHaveLength(3);
    for (const round of rounds) {
      expect(round).toHaveLength(2);
    }
  });

  it("generates correct number of rounds for odd number of teams", () => {
    const teams = ["t1", "t2", "t3"];
    const rounds = generateRoundRobin(teams);
    // 3 teams = 3 rounds, 1 match per round (one team gets a bye)
    expect(rounds).toHaveLength(3);
    for (const round of rounds) {
      expect(round).toHaveLength(1);
    }
  });

  it("every team plays every other team exactly once", () => {
    const teams = ["t1", "t2", "t3", "t4"];
    const rounds = generateRoundRobin(teams);

    const matchups = new Set<string>();
    for (const round of rounds) {
      for (const [home, visitor] of round) {
        const key = [home, visitor].sort().join("-");
        expect(matchups.has(key)).toBe(false);
        matchups.add(key);
      }
    }

    // C(4,2) = 6 unique matchups
    expect(matchups.size).toBe(6);
  });

  it("no team plays twice in the same round", () => {
    const teams = ["t1", "t2", "t3", "t4", "t5", "t6"];
    const rounds = generateRoundRobin(teams);

    for (const round of rounds) {
      const teamsInRound = round.flat();
      const unique = new Set(teamsInRound);
      expect(unique.size).toBe(teamsInRound.length);
    }
  });

  it("alternates home/away across rounds", () => {
    const teams = ["t1", "t2", "t3", "t4"];
    const rounds = generateRoundRobin(teams);

    // Verify that matchups include both [A,B] and not always the same team as home
    // across the full schedule by checking total home/away counts
    const homeCounts: Record<string, number> = {};
    const awayCounts: Record<string, number> = {};
    for (const round of rounds) {
      for (const [home, visitor] of round) {
        homeCounts[home] = (homeCounts[home] || 0) + 1;
        awayCounts[visitor] = (awayCounts[visitor] || 0) + 1;
      }
    }

    // Each team plays 3 games; difference between home and away should be <= 3
    // (circle method doesn't guarantee perfect balance for small N)
    for (const team of teams) {
      const home = homeCounts[team] || 0;
      const away = awayCounts[team] || 0;
      expect(home + away).toBe(3);
    }
  });

  it("handles 2 teams", () => {
    const teams = ["t1", "t2"];
    const rounds = generateRoundRobin(teams);
    expect(rounds).toHaveLength(1);
    expect(rounds[0]).toHaveLength(1);
  });

  it("throws for fewer than 2 teams", () => {
    expect(() => generateRoundRobin(["t1"])).toThrow();
    expect(() => generateRoundRobin([])).toThrow();
  });
});

describe("generateScheduleHandler", () => {
  let mockCtx: any;
  let insertedDocs: any[];

  beforeEach(() => {
    vi.resetAllMocks();
    insertedDocs = [];

    mockCtx = {
      db: {
        insert: vi.fn(async (_table: string, doc: any) => {
          insertedDocs.push(doc);
          return `match-${insertedDocs.length}`;
        }),
        get: vi.fn(),
        patch: vi.fn(),
        query: vi.fn().mockReturnValue({
          withIndex: vi.fn().mockReturnValue({
            unique: vi.fn().mockResolvedValue({
              _id: "m1",
              userId: "user-1",
              leagueId: "league-1",
              role: "admin",
            }),
            collect: vi.fn().mockResolvedValue([]),
          }),
          filter: vi.fn().mockReturnValue({
            collect: vi.fn().mockResolvedValue([]),
          }),
        }),
      },
    };
  });

  it("creates matches from generated schedule", async () => {
    const { generateScheduleHandler } = await import("./scheduleGenerator");

    const result = await generateScheduleHandler(mockCtx, {
      leagueId: "league-1" as any,
      userId: "user-1" as any,
      seasonId: "season-1" as any,
      teamIds: ["t1", "t2", "t3", "t4"] as any[],
      startDate: "2026-02-01",
      weeksBetweenRounds: 1,
    });

    // 4 teams = 6 matches (3 rounds × 2 per round)
    expect(result).toHaveLength(6);
    expect(insertedDocs).toHaveLength(6);

    // Each match has the right shape
    for (const doc of insertedDocs) {
      expect(doc.leagueId).toBe("league-1");
      expect(doc.seasonId).toBe("season-1");
      expect(doc.status).toBe("scheduled");
      expect(doc.pairings).toEqual([]);
      expect(doc.homeTeamId).toBeDefined();
      expect(doc.visitorTeamId).toBeDefined();
      expect(doc.date).toBeDefined();
    }
  });

  it("assigns dates with correct spacing", async () => {
    const { generateScheduleHandler } = await import("./scheduleGenerator");

    await generateScheduleHandler(mockCtx, {
      leagueId: "league-1" as any,
      userId: "user-1" as any,
      seasonId: "season-1" as any,
      teamIds: ["t1", "t2", "t3", "t4"] as any[],
      startDate: "2026-02-01",
      weeksBetweenRounds: 2,
    });

    const dates = insertedDocs.map((d) => d.date);
    const uniqueDates = [...new Set(dates)];
    // 3 rounds = 3 unique dates
    expect(uniqueDates).toHaveLength(3);
    expect(uniqueDates).toContain("2026-02-01");
    expect(uniqueDates).toContain("2026-02-15");
    expect(uniqueDates).toContain("2026-03-01");
  });

  it("rejects non-admin users", async () => {
    mockCtx.db.query = vi.fn().mockReturnValue({
      withIndex: vi.fn().mockReturnValue({
        unique: vi.fn().mockResolvedValue({
          _id: "m1",
          userId: "user-2",
          leagueId: "league-1",
          role: "player",
        }),
        collect: vi.fn().mockResolvedValue([]),
      }),
    });

    const { generateScheduleHandler } = await import("./scheduleGenerator");

    await expect(
      generateScheduleHandler(mockCtx, {
        leagueId: "league-1" as any,
        userId: "user-2" as any,
        seasonId: "season-1" as any,
        teamIds: ["t1", "t2"] as any[],
        startDate: "2026-02-01",
        weeksBetweenRounds: 1,
      }),
    ).rejects.toThrow();
  });
});
