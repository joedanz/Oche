/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as auth from "../auth.js";
import type * as authorization from "../authorization.js";
import type * as captains from "../captains.js";
import type * as dashboard from "../dashboard.js";
import type * as divisions from "../divisions.js";
import type * as http from "../http.js";
import type * as invites from "../invites.js";
import type * as leagues from "../leagues.js";
import type * as matchConfig from "../matchConfig.js";
import type * as matchDetail from "../matchDetail.js";
import type * as matches from "../matches.js";
import type * as members from "../members.js";
import type * as onboarding from "../onboarding.js";
import type * as pairings from "../pairings.js";
import type * as roster from "../roster.js";
import type * as scheduleGenerator from "../scheduleGenerator.js";
import type * as scoring from "../scoring.js";
import type * as seasons from "../seasons.js";
import type * as teams from "../teams.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  auth: typeof auth;
  authorization: typeof authorization;
  captains: typeof captains;
  dashboard: typeof dashboard;
  divisions: typeof divisions;
  http: typeof http;
  invites: typeof invites;
  leagues: typeof leagues;
  matchConfig: typeof matchConfig;
  matchDetail: typeof matchDetail;
  matches: typeof matches;
  members: typeof members;
  onboarding: typeof onboarding;
  pairings: typeof pairings;
  roster: typeof roster;
  scheduleGenerator: typeof scheduleGenerator;
  scoring: typeof scoring;
  seasons: typeof seasons;
  teams: typeof teams;
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
