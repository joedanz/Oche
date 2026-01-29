// ABOUTME: Tests for subscription management functions.
// ABOUTME: Verifies subscription creation, lookup, and webhook event processing.

import { describe, it, expect, vi } from "vitest";
import {
  processSubscriptionEvent,
  buildSubscriptionCheckoutMetadata,
  type SubscriptionEvent,
} from "./subscriptions";

describe("subscriptions", () => {
  describe("buildSubscriptionCheckoutMetadata", () => {
    it("includes userId and planId", () => {
      const meta = buildSubscriptionCheckoutMetadata({
        userId: "user-123",
        planId: "league",
        billingInterval: "monthly",
      });
      expect(meta).toEqual({
        userId: "user-123",
        planId: "league",
        billingInterval: "monthly",
      });
    });
  });

  describe("processSubscriptionEvent", () => {
    it("creates a subscription on checkout.session.completed", async () => {
      const insertedRecords: any[] = [];
      const mockCtx = {
        db: {
          insert: vi.fn(async (_table: string, doc: any) => {
            insertedRecords.push(doc);
            return "sub-1";
          }),
          query: vi.fn().mockReturnValue({
            withIndex: vi.fn().mockReturnValue({
              unique: vi.fn().mockResolvedValue(null),
            }),
          }),
        },
      };

      const event: SubscriptionEvent = {
        type: "checkout_completed",
        userId: "user-1" as any,
        planId: "league",
        billingInterval: "monthly",
        stripeCustomerId: "cus_123",
        stripeSubscriptionId: "sub_123",
        currentPeriodEnd: 1700000000,
      };

      await processSubscriptionEvent(mockCtx as any, event);

      expect(mockCtx.db.insert).toHaveBeenCalledWith("subscriptions", {
        userId: "user-1",
        planId: "league",
        billingInterval: "monthly",
        status: "active",
        stripeCustomerId: "cus_123",
        stripeSubscriptionId: "sub_123",
        currentPeriodEnd: 1700000000,
        createdAt: expect.any(Number),
      });
    });

    it("updates status on subscription_updated", async () => {
      const existingSub = {
        _id: "sub-1",
        userId: "user-1",
        planId: "league",
        status: "active",
        stripeSubscriptionId: "sub_123",
      };
      const patchedFields: any = {};
      const mockCtx = {
        db: {
          query: vi.fn().mockReturnValue({
            withIndex: vi.fn().mockReturnValue({
              unique: vi.fn().mockResolvedValue(existingSub),
            }),
          }),
          patch: vi.fn(async (_id: any, fields: any) => {
            Object.assign(patchedFields, fields);
          }),
        },
      };

      const event: SubscriptionEvent = {
        type: "subscription_updated",
        stripeSubscriptionId: "sub_123",
        status: "past_due",
        currentPeriodEnd: 1700100000,
      };

      await processSubscriptionEvent(mockCtx as any, event);

      expect(mockCtx.db.patch).toHaveBeenCalledWith("sub-1", {
        status: "past_due",
        currentPeriodEnd: 1700100000,
      });
    });

    it("marks subscription canceled on subscription_deleted", async () => {
      const existingSub = {
        _id: "sub-1",
        userId: "user-1",
        planId: "league",
        status: "active",
        stripeSubscriptionId: "sub_123",
      };
      const mockCtx = {
        db: {
          query: vi.fn().mockReturnValue({
            withIndex: vi.fn().mockReturnValue({
              unique: vi.fn().mockResolvedValue(existingSub),
            }),
          }),
          patch: vi.fn(),
        },
      };

      const event: SubscriptionEvent = {
        type: "subscription_deleted",
        stripeSubscriptionId: "sub_123",
      };

      await processSubscriptionEvent(mockCtx as any, event);

      expect(mockCtx.db.patch).toHaveBeenCalledWith("sub-1", {
        status: "canceled",
      });
    });

    it("does nothing for subscription_updated if no matching subscription", async () => {
      const mockCtx = {
        db: {
          query: vi.fn().mockReturnValue({
            withIndex: vi.fn().mockReturnValue({
              unique: vi.fn().mockResolvedValue(null),
            }),
          }),
          patch: vi.fn(),
        },
      };

      const event: SubscriptionEvent = {
        type: "subscription_updated",
        stripeSubscriptionId: "sub_nonexistent",
        status: "active",
        currentPeriodEnd: 1700000000,
      };

      await processSubscriptionEvent(mockCtx as any, event);

      expect(mockCtx.db.patch).not.toHaveBeenCalled();
    });

    it("replaces existing subscription on checkout_completed", async () => {
      const existingSub = {
        _id: "old-sub-1",
        userId: "user-1",
        planId: "starter",
        status: "canceled",
        stripeSubscriptionId: "sub_old",
      };
      const mockCtx = {
        db: {
          query: vi.fn().mockReturnValue({
            withIndex: vi.fn().mockReturnValue({
              unique: vi.fn().mockResolvedValue(existingSub),
            }),
          }),
          patch: vi.fn(),
          insert: vi.fn().mockResolvedValue("new-sub-1"),
          delete: vi.fn(),
        },
      };

      const event: SubscriptionEvent = {
        type: "checkout_completed",
        userId: "user-1" as any,
        planId: "association",
        billingInterval: "yearly",
        stripeCustomerId: "cus_456",
        stripeSubscriptionId: "sub_new",
        currentPeriodEnd: 1700000000,
      };

      await processSubscriptionEvent(mockCtx as any, event);

      expect(mockCtx.db.delete).toHaveBeenCalledWith("old-sub-1");
      expect(mockCtx.db.insert).toHaveBeenCalled();
    });
  });
});
