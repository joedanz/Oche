// ABOUTME: Tests for Stripe payment integration.
// ABOUTME: Verifies checkout session creation, webhook processing, and payment recording.

import { describe, it, expect, vi, beforeEach } from "vitest";

describe("stripe", () => {
  let mockCtx: any;

  beforeEach(() => {
    vi.resetAllMocks();
    mockCtx = {
      db: {
        get: vi.fn(),
        insert: vi.fn(async () => "payment-new"),
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

  describe("buildCheckoutMetadata", () => {
    it("returns metadata with league, player, and amount", async () => {
      const { buildCheckoutMetadata } = await import("./stripe");

      const metadata = buildCheckoutMetadata({
        leagueId: "league-1",
        playerId: "player-1",
        amount: 5000,
        leagueName: "Test League",
        playerName: "Alice",
      });

      expect(metadata).toEqual({
        leagueId: "league-1",
        playerId: "player-1",
        amount: "5000",
        leagueName: "Test League",
        playerName: "Alice",
      });
    });
  });

  describe("processStripePayment", () => {
    it("records a payment from Stripe webhook data", async () => {
      const { processStripePayment } = await import("./stripe");

      await processStripePayment(mockCtx, {
        leagueId: "league-1" as any,
        playerId: "player-1" as any,
        amount: 50,
        stripeSessionId: "cs_test_123",
      });

      expect(mockCtx.db.insert).toHaveBeenCalledWith(
        "payments",
        expect.objectContaining({
          leagueId: "league-1",
          playerId: "player-1",
          amount: 50,
          note: expect.stringContaining("Stripe"),
        }),
      );
    });

    it("includes stripe session ID in payment note", async () => {
      const { processStripePayment } = await import("./stripe");

      await processStripePayment(mockCtx, {
        leagueId: "league-1" as any,
        playerId: "player-1" as any,
        amount: 50,
        stripeSessionId: "cs_test_abc",
      });

      const insertCall = mockCtx.db.insert.mock.calls[0];
      expect(insertCall[1].note).toContain("cs_test_abc");
    });
  });

  describe("validateWebhookPayload", () => {
    it("extracts payment data from checkout.session.completed event", async () => {
      const { validateWebhookPayload } = await import("./stripe");

      const event = {
        type: "checkout.session.completed",
        data: {
          object: {
            id: "cs_test_xyz",
            amount_total: 5000,
            metadata: {
              leagueId: "league-1",
              playerId: "player-1",
            },
          },
        },
      };

      const result = validateWebhookPayload(event);

      expect(result).toEqual({
        sessionId: "cs_test_xyz",
        amountCents: 5000,
        leagueId: "league-1",
        playerId: "player-1",
      });
    });

    it("returns null for non-checkout events", async () => {
      const { validateWebhookPayload } = await import("./stripe");

      const event = {
        type: "payment_intent.created",
        data: { object: {} },
      };

      const result = validateWebhookPayload(event);
      expect(result).toBeNull();
    });

    it("returns null when metadata is missing", async () => {
      const { validateWebhookPayload } = await import("./stripe");

      const event = {
        type: "checkout.session.completed",
        data: {
          object: {
            id: "cs_test_xyz",
            amount_total: 5000,
            metadata: {},
          },
        },
      };

      const result = validateWebhookPayload(event);
      expect(result).toBeNull();
    });
  });
});
