// ABOUTME: Tests for payment tracking mutations and queries.
// ABOUTME: Verifies recording payments, retrieving payment history, and balance calculations.

import { describe, it, expect, vi, beforeEach } from "vitest";

describe("payments", () => {
  let mockCtx: any;
  let insertedRecords: any[];

  beforeEach(() => {
    vi.resetAllMocks();
    insertedRecords = [];
    mockCtx = {
      db: {
        get: vi.fn(),
        insert: vi.fn(async (_table: string, doc: any) => {
          insertedRecords.push({ _table, ...doc });
          return "payment-1";
        }),
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
          collect: vi.fn().mockResolvedValue([]),
        }),
      },
    };
  });

  describe("recordPaymentHandler", () => {
    it("records a payment for a player", async () => {
      const { recordPaymentHandler } = await import("./payments");

      await recordPaymentHandler(mockCtx, {
        leagueId: "league-1" as any,
        userId: "user-1" as any,
        playerId: "player-1" as any,
        amount: 50,
        note: "League fee",
      });

      expect(mockCtx.db.insert).toHaveBeenCalledWith(
        "payments",
        expect.objectContaining({
          leagueId: "league-1",
          playerId: "player-1",
          amount: 50,
          note: "League fee",
        }),
      );
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
        filter: vi.fn().mockReturnValue({
          collect: vi.fn().mockResolvedValue([]),
        }),
        collect: vi.fn().mockResolvedValue([]),
      });

      const { recordPaymentHandler } = await import("./payments");

      await expect(
        recordPaymentHandler(mockCtx, {
          leagueId: "league-1" as any,
          userId: "user-2" as any,
          playerId: "player-1" as any,
          amount: 50,
          note: "",
        }),
      ).rejects.toThrow();
    });

    it("rejects negative payment amounts", async () => {
      const { recordPaymentHandler } = await import("./payments");

      await expect(
        recordPaymentHandler(mockCtx, {
          leagueId: "league-1" as any,
          userId: "user-1" as any,
          playerId: "player-1" as any,
          amount: -10,
          note: "",
        }),
      ).rejects.toThrow(/positive/i);
    });
  });

  describe("getPaymentsHandler", () => {
    it("returns payments for a league", async () => {
      const payments = [
        {
          _id: "p1",
          leagueId: "league-1",
          playerId: "player-1",
          amount: 50,
          note: "League fee",
          recordedBy: "user-1",
          recordedAt: 1000,
        },
      ];

      mockCtx.db.query = vi.fn().mockReturnValue({
        withIndex: vi.fn().mockReturnValue({
          unique: vi.fn().mockResolvedValue({
            _id: "m1",
            userId: "user-1",
            leagueId: "league-1",
            role: "admin",
          }),
          collect: vi.fn().mockResolvedValue(payments),
        }),
        filter: vi.fn().mockReturnValue({
          collect: vi.fn().mockResolvedValue(payments),
        }),
        collect: vi.fn().mockResolvedValue(payments),
      });

      mockCtx.db.get = vi.fn().mockImplementation(async (id: string) => {
        if (id === "player-1")
          return { _id: "player-1", userId: "user-p1", teamId: "team-1", status: "active" };
        if (id === "user-p1") return { _id: "user-p1", name: "Alice", email: "alice@test.com" };
        if (id === "user-1") return { _id: "user-1", name: "Admin", email: "admin@test.com" };
        return null;
      });

      const { getPaymentsHandler } = await import("./payments");

      const result = await getPaymentsHandler(mockCtx, {
        leagueId: "league-1" as any,
        userId: "user-1" as any,
      });

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual(
        expect.objectContaining({
          amount: 50,
          playerName: "Alice",
        }),
      );
    });
  });

  describe("getPlayerBalancesHandler", () => {
    it("computes balance for players with payments", async () => {
      const players = [
        { _id: "player-1", userId: "user-p1", teamId: "team-1", status: "active" },
      ];
      const payments = [
        { _id: "p1", leagueId: "league-1", playerId: "player-1", amount: 30, recordedAt: 1000 },
      ];
      const league = {
        _id: "league-1",
        name: "Test League",
        leagueFee: 50,
        weeklyFee: 10,
        feeSchedule: "one-time",
      };

      mockCtx.db.get = vi.fn().mockImplementation(async (id: string) => {
        if (id === "league-1") return league;
        if (id === "user-p1") return { _id: "user-p1", name: "Alice", email: "alice@test.com" };
        return null;
      });

      // Teams query
      const teamsCollect = vi.fn().mockResolvedValue([{ _id: "team-1", leagueId: "league-1", name: "Team A" }]);
      // Players query
      const playersCollect = vi.fn().mockResolvedValue(players);
      // Payments query
      const paymentsCollect = vi.fn().mockResolvedValue(payments);

      let filterCallCount = 0;
      mockCtx.db.query = vi.fn().mockReturnValue({
        withIndex: vi.fn().mockReturnValue({
          unique: vi.fn().mockResolvedValue({
            _id: "m1",
            userId: "user-1",
            leagueId: "league-1",
            role: "admin",
          }),
          collect: vi.fn().mockResolvedValue([]),
        }),
        filter: vi.fn().mockImplementation(() => {
          filterCallCount++;
          if (filterCallCount === 1) return { collect: teamsCollect };
          if (filterCallCount === 2) return { collect: playersCollect };
          return { collect: paymentsCollect };
        }),
        collect: vi.fn().mockResolvedValue([]),
      });

      const { getPlayerBalancesHandler } = await import("./payments");

      const result = await getPlayerBalancesHandler(mockCtx, {
        leagueId: "league-1" as any,
        userId: "user-1" as any,
      });

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual(
        expect.objectContaining({
          playerName: "Alice",
          totalPaid: 30,
          totalOwed: 50,
          balance: -20,
          status: "partial",
        }),
      );
    });

    it("marks fully paid players correctly", async () => {
      const players = [
        { _id: "player-1", userId: "user-p1", teamId: "team-1", status: "active" },
      ];
      const payments = [
        { _id: "p1", leagueId: "league-1", playerId: "player-1", amount: 50, recordedAt: 1000 },
      ];
      const league = {
        _id: "league-1",
        name: "Test League",
        leagueFee: 50,
        weeklyFee: 0,
        feeSchedule: "one-time",
      };

      mockCtx.db.get = vi.fn().mockImplementation(async (id: string) => {
        if (id === "league-1") return league;
        if (id === "user-p1") return { _id: "user-p1", name: "Alice", email: "alice@test.com" };
        return null;
      });

      const teamsCollect = vi.fn().mockResolvedValue([{ _id: "team-1", leagueId: "league-1", name: "Team A" }]);
      const playersCollect = vi.fn().mockResolvedValue(players);
      const paymentsCollect = vi.fn().mockResolvedValue(payments);

      let filterCallCount = 0;
      mockCtx.db.query = vi.fn().mockReturnValue({
        withIndex: vi.fn().mockReturnValue({
          unique: vi.fn().mockResolvedValue({
            _id: "m1",
            userId: "user-1",
            leagueId: "league-1",
            role: "admin",
          }),
          collect: vi.fn().mockResolvedValue([]),
        }),
        filter: vi.fn().mockImplementation(() => {
          filterCallCount++;
          if (filterCallCount === 1) return { collect: teamsCollect };
          if (filterCallCount === 2) return { collect: playersCollect };
          return { collect: paymentsCollect };
        }),
        collect: vi.fn().mockResolvedValue([]),
      });

      const { getPlayerBalancesHandler } = await import("./payments");

      const result = await getPlayerBalancesHandler(mockCtx, {
        leagueId: "league-1" as any,
        userId: "user-1" as any,
      });

      expect(result[0].status).toBe("paid");
      expect(result[0].balance).toBe(0);
    });
  });
});
