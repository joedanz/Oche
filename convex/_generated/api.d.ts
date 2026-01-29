/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as auditLog from "../auditLog.js";
import type * as auth from "../auth.js";
import type * as authorization from "../authorization.js";
import type * as captains from "../captains.js";
import type * as dashboard from "../dashboard.js";
import type * as divisions from "../divisions.js";
import type * as dnpBlind from "../dnpBlind.js";
import type * as dualEntry from "../dualEntry.js";
import type * as gameWinner from "../gameWinner.js";
import type * as handicapConfig from "../handicapConfig.js";
import type * as handicapScoring from "../handicapScoring.js";
import type * as http from "../http.js";
import type * as importTemplates from "../importTemplates.js";
import type * as invites from "../invites.js";
import type * as leaderboards from "../leaderboards.js";
import type * as leagues from "../leagues.js";
import type * as matchConfig from "../matchConfig.js";
import type * as matchDetail from "../matchDetail.js";
import type * as matches from "../matches.js";
import type * as members from "../members.js";
import type * as notifications from "../notifications.js";
import type * as onboarding from "../onboarding.js";
import type * as pairings from "../pairings.js";
import type * as paymentConfig from "../paymentConfig.js";
import type * as payments from "../payments.js";
import type * as playerStats from "../playerStats.js";
import type * as playerStatsPage from "../playerStatsPage.js";
import type * as publicLeague from "../publicLeague.js";
import type * as roster from "../roster.js";
import type * as scheduleGenerator from "../scheduleGenerator.js";
import type * as scoring from "../scoring.js";
import type * as seasons from "../seasons.js";
import type * as standings from "../standings.js";
import type * as statsExport from "../statsExport.js";
import type * as stripe from "../stripe.js";
import type * as teamStats from "../teamStats.js";
import type * as teams from "../teams.js";
import type * as tournamentScoring from "../tournamentScoring.js";
import type * as tournaments from "../tournaments.js";
import type * as trends from "../trends.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  auditLog: typeof auditLog;
  auth: typeof auth;
  authorization: typeof authorization;
  captains: typeof captains;
  dashboard: typeof dashboard;
  divisions: typeof divisions;
  dnpBlind: typeof dnpBlind;
  dualEntry: typeof dualEntry;
  gameWinner: typeof gameWinner;
  handicapConfig: typeof handicapConfig;
  handicapScoring: typeof handicapScoring;
  http: typeof http;
  importTemplates: typeof importTemplates;
  invites: typeof invites;
  leaderboards: typeof leaderboards;
  leagues: typeof leagues;
  matchConfig: typeof matchConfig;
  matchDetail: typeof matchDetail;
  matches: typeof matches;
  members: typeof members;
  notifications: typeof notifications;
  onboarding: typeof onboarding;
  pairings: typeof pairings;
  paymentConfig: typeof paymentConfig;
  payments: typeof payments;
  playerStats: typeof playerStats;
  playerStatsPage: typeof playerStatsPage;
  publicLeague: typeof publicLeague;
  roster: typeof roster;
  scheduleGenerator: typeof scheduleGenerator;
  scoring: typeof scoring;
  seasons: typeof seasons;
  standings: typeof standings;
  statsExport: typeof statsExport;
  stripe: typeof stripe;
  teamStats: typeof teamStats;
  teams: typeof teams;
  tournamentScoring: typeof tournamentScoring;
  tournaments: typeof tournaments;
  trends: typeof trends;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};
