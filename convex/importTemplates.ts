// ABOUTME: CRUD operations for import column mapping templates.
// ABOUTME: Allows saving and loading reusable column mappings per league.

import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { auth } from "./auth";
import { requireFeature } from "./planGating";
import type { Id } from "./_generated/dataModel";

const mappingValidator = v.object({
  playerName: v.optional(v.number()),
  innings: v.array(v.number()),
  plus: v.optional(v.number()),
  minus: v.optional(v.number()),
});

export async function saveTemplateHandler(
  db: any,
  args: {
    leagueId: any;
    name: string;
    mapping: { playerName?: number; innings: number[]; plus?: number; minus?: number };
  },
) {
  return await db.insert("importTemplates", {
    leagueId: args.leagueId,
    name: args.name,
    mapping: args.mapping,
  });
}

export async function getTemplatesHandler(
  db: any,
  args: { leagueId: any },
) {
  return await db
    .query("importTemplates")
    .filter((q: any) => q.eq(q.field("leagueId"), args.leagueId))
    .collect();
}

export const saveTemplate = mutation({
  args: {
    leagueId: v.id("leagues"),
    name: v.string(),
    mapping: mappingValidator,
  },
  handler: async (ctx, args) => {
    const userId = await auth.getUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    await requireFeature(ctx.db, userId as Id<"users">, "score_import");
    return await saveTemplateHandler(ctx.db, args);
  },
});

export const getTemplates = query({
  args: { leagueId: v.id("leagues") },
  handler: async (ctx, args) => {
    return await getTemplatesHandler(ctx.db, args);
  },
});
