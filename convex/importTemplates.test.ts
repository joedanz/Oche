// ABOUTME: Tests for import template CRUD operations.
// ABOUTME: Validates saving and retrieving column mapping templates.

import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  saveTemplateHandler,
  getTemplatesHandler,
} from "./importTemplates";

describe("saveTemplateHandler", () => {
  let db: any;

  beforeEach(() => {
    db = {
      insert: vi.fn().mockResolvedValue("template1"),
      query: vi.fn().mockReturnValue({
        filter: vi.fn().mockReturnValue({
          collect: vi.fn().mockResolvedValue([]),
        }),
      }),
    };
  });

  it("saves a template with mapping data", async () => {
    const result = await saveTemplateHandler(db, {
      leagueId: "league1" as any,
      name: "Standard Format",
      mapping: {
        playerName: 0,
        innings: [1, 2, 3, 4, 5, 6, 7, 8, 9],
      },
    });
    expect(db.insert).toHaveBeenCalledWith(
      "importTemplates",
      expect.objectContaining({
        leagueId: "league1",
        name: "Standard Format",
        mapping: expect.objectContaining({ playerName: 0 }),
      }),
    );
    expect(result).toBe("template1");
  });
});

describe("getTemplatesHandler", () => {
  let db: any;

  beforeEach(() => {
    db = {
      query: vi.fn().mockReturnValue({
        filter: vi.fn().mockReturnValue({
          collect: vi.fn().mockResolvedValue([
            {
              _id: "t1",
              name: "Standard",
              leagueId: "league1",
              mapping: { playerName: 0, innings: [1, 2, 3, 4, 5, 6, 7, 8, 9] },
            },
          ]),
        }),
      }),
    };
  });

  it("returns templates for a league", async () => {
    const result = await getTemplatesHandler(db, {
      leagueId: "league1" as any,
    });
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe("Standard");
  });
});
