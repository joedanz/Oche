# PRD: Oche — American Baseball Darts League Management

## Introduction

Oche is a multi-tenant SaaS platform where anyone can create and manage their own American Baseball Darts league. Teams play multiple individual 9-inning Baseball games per match night. Each inning targets numbers 1–9; players score runs (0–3 per dart, max 9 per inning). Ties are resolved with extra innings whose runs are excluded from statistics. The app replaces spreadsheet-based league management with digital scoresheets, real-time stats, standings, scheduling, handicapping, payments, and tournaments.

The scoring grid mirrors paper scoresheets used by leagues like the Mason Dixon Dart League: innings as columns, runs per inning, plus/minus/totals rows.

Each league is an isolated tenant. Users sign up once and can create leagues, be invited to leagues, or join public leagues. League admins manage their own teams, schedules, and data independently.

## Goals

- Multi-tenant SaaS: anyone can sign up and create/manage their own league
- Marketing landing page that converts visitors into sign-ups
- Eliminate spreadsheet merging for league administration
- Provide a digital mirror of paper scoresheets (innings 1–9, plus/minus)
- Auto-calculate statistics excluding extra-innings runs
- Support configurable match structures (games per match, points systems)
- Deliver real-time team/player stats and standings
- Support steel-tip and soft-tip league variants
- Scale to thousands of users across hundreds of independent leagues

## User Stories

---

### Epic: Data Model & Project Setup

#### US-001: Project scaffolding
**Description:** As a developer, I need the project initialized with the correct tech stack so that development can begin.

**Acceptance Criteria:**
- [ ] Vite + React + TypeScript project created
- [ ] Tailwind CSS configured
- [ ] Convex initialized and connected
- [ ] Dev server runs at localhost:5173
- [ ] `npm run check` passes (typecheck + lint)
- [ ] ABOUTME comments in all created files

#### US-002: Core database schema
**Description:** As a developer, I need the database schema defined so that all features have a consistent data foundation.

**Acceptance Criteria:**
- [ ] `convex/schema.ts` defines tables: `users`, `leagues`, `leagueMemberships`, `invites`, `seasons`, `divisions`, `teams`, `players`, `matches`, `games`, `innings`, `playerStats`
- [ ] `users` table includes: email, name, avatarUrl (global account, not league-scoped)
- [ ] `leagueMemberships` table includes: userId, leagueId, role (admin/captain/player) — joins users to leagues
- [ ] `invites` table includes: leagueId, code, role, createdBy, expiresAt, used
- [ ] `leagues` table includes: name, matchConfig (gamesPerMatch, pointsPerGameWin, bonusForTotalRuns, extraInningsExcludeFromStats), handicap settings
- [ ] `matches` table includes: leagueId, seasonId, homeTeamId, visitorTeamId, date, status, totals (homeRuns, visitorRuns, bonusWinner)
- [ ] `games` table includes: matchId, gameNumber, homePlayerId, visitorPlayerId, winner
- [ ] `innings` table includes: gameId, inningNumber, homeRuns (0–9), visitorRuns (0–9), isExtra boolean
- [ ] `players` table includes: userId, teamId, status (active/inactive)
- [ ] `teams` table includes: name, captainId, venue, leagueId, divisionId
- [ ] Foreign keys use `v.id("tableName")` pattern
- [ ] Enums use `v.union(v.literal(...))` pattern
- [ ] Schema validates runs are 0–9 per inning
- [ ] `npx convex dev` deploys schema without errors
- [ ] Typecheck passes

---

### Epic: Landing Page

#### US-003: Marketing landing page
**Description:** As a visitor, I want to see what Oche does and why I should sign up so that I can decide if it's right for my league.

**Acceptance Criteria:**
- [ ] Hero section: headline, subheadline, and primary CTA ("Start Your League" / "Get Started")
- [ ] Feature highlights section: score entry grid, real-time stats, scheduling, handicapping
- [ ] Social proof section: placeholder for testimonials or league count
- [ ] Pricing section (or "Free to start" messaging if no paid tiers yet)
- [ ] Footer: links to login, sign up, contact
- [ ] Responsive design (mobile, tablet, desktop)
- [ ] Page loads without authentication (public route)
- [ ] Typecheck passes
- [ ] Verify in browser using dev-browser skill

#### US-004: Landing page navigation
**Description:** As a visitor, I want clear navigation between the landing page and auth flows so that I can sign up or log in easily.

**Acceptance Criteria:**
- [ ] Header with logo, "Log In" and "Sign Up" buttons
- [ ] "Sign Up" navigates to registration (US-005)
- [ ] "Log In" navigates to login form
- [ ] Authenticated users redirected to dashboard instead of landing page
- [ ] Typecheck passes
- [ ] Verify in browser using dev-browser skill

---

### Epic: Authentication & Roles

#### US-005: Email/password authentication
**Description:** As a user, I want to sign up and log in with email and password so that I can access the app.

**Acceptance Criteria:**
- [ ] Sign-up form: email, password, display name
- [ ] Login form: email, password
- [ ] Password requirements enforced (min 8 chars)
- [ ] Session persists across page reloads
- [ ] Logout clears session
- [ ] Typecheck passes
- [ ] Verify in browser using dev-browser skill

#### US-006: OAuth login (Google)
**Description:** As a user, I want to log in with Google so that I can use my existing account.

**Acceptance Criteria:**
- [ ] "Sign in with Google" button on login page
- [ ] Google OAuth flow completes and creates/links user
- [ ] Works alongside email/password auth
- [ ] Typecheck passes
- [ ] Verify in browser using dev-browser skill

#### US-007: Role-based access control
**Description:** As a system, I need role-based permissions scoped per league so that users can only perform actions appropriate to their role within each league.

**Acceptance Criteria:**
- [ ] Roles defined per league membership: Admin, Captain, Player, Guest
- [ ] A user can have different roles in different leagues (e.g., Admin in one, Player in another)
- [ ] Admin: full CRUD on all resources within their league
- [ ] Captain: manage own team roster, enter/edit scores for own team, set pairings
- [ ] Player: read-only access to own stats, team, league
- [ ] Guest: read-only access to public league data (no membership required)
- [ ] Convex mutations enforce role checks using `leagueMemberships`
- [ ] Unauthorized actions return clear error messages
- [ ] Typecheck passes

#### US-008: Role assignment UI
**Description:** As an admin, I want to assign roles to users so that I can control access.

**Acceptance Criteria:**
- [ ] Admin can view list of users in a league
- [ ] Admin can assign/change roles (Admin, Captain, Player)
- [ ] Role changes take effect immediately
- [ ] Cannot remove the last admin from a league
- [ ] Typecheck passes
- [ ] Verify in browser using dev-browser skill

---

### Epic: SaaS Onboarding

#### US-009: Post-signup league creation flow
**Description:** As a new user, I want to create my first league right after signing up so that I can get started immediately.

**Acceptance Criteria:**
- [ ] After first sign-up, user is prompted to "Create a League" or "Join a League"
- [ ] "Create a League" launches the league creation form (US-013)
- [ ] Creator is automatically the league admin
- [ ] "Join a League" shows option to enter an invite code or browse public leagues
- [ ] Typecheck passes
- [ ] Verify in browser using dev-browser skill

#### US-010: User dashboard
**Description:** As a user, I want a dashboard showing all my leagues so that I can switch between them.

**Acceptance Criteria:**
- [ ] Lists all leagues the user belongs to (as admin, captain, or player)
- [ ] Shows user's role in each league
- [ ] "Create New League" button
- [ ] Clicking a league navigates to that league's home page
- [ ] Empty state for users with no leagues (prompts to create or join)
- [ ] Typecheck passes
- [ ] Verify in browser using dev-browser skill

#### US-011: League invitations
**Description:** As a league admin, I want to invite people to my league so that they can join as captains or players.

**Acceptance Criteria:**
- [ ] Generate a shareable invite link with a unique code
- [ ] Invite link specifies the role (Captain or Player)
- [ ] Visiting the link prompts sign-up/login, then adds user to the league with the specified role
- [ ] Admin can revoke invite links
- [ ] Admin can see pending invitations
- [ ] Typecheck passes
- [ ] Verify in browser using dev-browser skill

#### US-012: Multi-league user context
**Description:** As a user who belongs to multiple leagues, I want to switch between leagues so that I see the right data.

**Acceptance Criteria:**
- [ ] League switcher in the app header/sidebar
- [ ] All league-scoped pages (standings, schedule, stats) filter to the active league
- [ ] Active league persists across page navigation and reloads (stored in URL or session)
- [ ] Typecheck passes
- [ ] Verify in browser using dev-browser skill

---

### Epic: League Management

#### US-013: Create league
**Description:** As an admin, I want to create a new league so that I can begin organizing play.

**Acceptance Criteria:**
- [ ] Form fields: league name, description
- [ ] Creator automatically becomes league admin
- [ ] League appears in "My Leagues" after creation
- [ ] Typecheck passes
- [ ] Verify in browser using dev-browser skill

#### US-014: Configure match structure
**Description:** As an admin, I want to configure how matches work so that the app reflects my league's rules.

**Acceptance Criteria:**
- [ ] Settings: number of individual games per match (default 5)
- [ ] Points per individual game win (default 1)
- [ ] Bonus point for team with highest total runs that night (toggle)
- [ ] Extra innings enabled/disabled toggle
- [ ] Extra innings runs excluded from stats toggle
- [ ] Settings saved and applied to future matches
- [ ] Typecheck passes
- [ ] Verify in browser using dev-browser skill

#### US-015: Manage seasons
**Description:** As an admin, I want to create and manage seasons so that stats and standings reset appropriately.

**Acceptance Criteria:**
- [ ] Create season with name and start/end dates
- [ ] Mark a season as active (only one active at a time)
- [ ] Archive past seasons (data preserved, read-only)
- [ ] Typecheck passes
- [ ] Verify in browser using dev-browser skill

#### US-016: Manage divisions
**Description:** As an admin, I want to organize teams into divisions so that scheduling and standings are grouped.

**Acceptance Criteria:**
- [ ] Create/edit/delete divisions within a league
- [ ] Assign teams to divisions
- [ ] Standings can be filtered by division
- [ ] Typecheck passes
- [ ] Verify in browser using dev-browser skill

---

### Epic: Teams & Rosters

#### US-017: Create and edit teams
**Description:** As an admin, I want to create teams so that players can be organized.

**Acceptance Criteria:**
- [ ] Form fields: team name, venue/bar name, division
- [ ] Edit team details after creation
- [ ] Team appears in league's team list
- [ ] Typecheck passes
- [ ] Verify in browser using dev-browser skill

#### US-018: Assign team captain
**Description:** As an admin, I want to assign a captain to a team so that they can manage their roster and scores.

**Acceptance Criteria:**
- [ ] Select a player from the team roster as captain
- [ ] Captain receives Captain role permissions
- [ ] Only one captain per team
- [ ] Admin can change captain
- [ ] Typecheck passes
- [ ] Verify in browser using dev-browser skill

#### US-019: Manage team roster
**Description:** As a captain, I want to add and remove players from my team so that the roster stays current.

**Acceptance Criteria:**
- [ ] Add player by name/email (creates player record if needed)
- [ ] Remove player from roster
- [ ] Set player status: active or inactive
- [ ] Enforce max roster size (configurable per league, default 12)
- [ ] Inactive players cannot be paired for matches
- [ ] Typecheck passes
- [ ] Verify in browser using dev-browser skill

---

### Epic: Match Scheduling

#### US-020: Manual match scheduling
**Description:** As an admin, I want to manually create match schedules so that teams know when and whom they play.

**Acceptance Criteria:**
- [ ] Create match: select home team, visitor team, date, location
- [ ] Match appears on league schedule
- [ ] Prevent scheduling a team against itself
- [ ] Prevent double-booking a team on the same date
- [ ] Typecheck passes
- [ ] Verify in browser using dev-browser skill

#### US-021: Auto-generate schedule
**Description:** As an admin, I want to auto-generate a round-robin schedule so that I don't have to create each match manually.

**Acceptance Criteria:**
- [ ] Select teams to include and date range
- [ ] Round-robin algorithm generates balanced matchups
- [ ] Home/away alternates fairly
- [ ] Admin can review and edit generated schedule before confirming
- [ ] Typecheck passes
- [ ] Verify in browser using dev-browser skill

#### US-022: Player pairings per game
**Description:** As a captain, I want to set player pairings for each individual game in a match so that matchups are recorded.

**Acceptance Criteria:**
- [ ] For each game in a match, select home player and visitor player from respective rosters
- [ ] Only active roster players available for selection
- [ ] A player can only be paired once per match (unless league config allows repeats)
- [ ] Pairings saved and visible on match page
- [ ] Typecheck passes
- [ ] Verify in browser using dev-browser skill

#### US-023: Match detail page
**Description:** As a user, I want to see match details so that I know teams, date, pairings, and results.

**Acceptance Criteria:**
- [ ] Displays: home team, visitor team, date, location
- [ ] Shows all individual game pairings
- [ ] Shows game results (winner, scores) when available
- [ ] Shows match totals and bonus point winner
- [ ] Typecheck passes
- [ ] Verify in browser using dev-browser skill

---

### Epic: Score Entry (Manual)

#### US-024: Innings score entry grid
**Description:** As a captain, I want to enter runs per inning in a grid that mirrors paper scoresheets so that scoring feels familiar.

**Acceptance Criteria:**
- [ ] Grid layout: rows for home/visitor player, columns for innings 1–9
- [ ] Each cell accepts a number 0–9
- [ ] Tab/arrow key navigation between cells
- [ ] Auto-advances to next cell after entry
- [ ] Visual distinction between home and visitor rows
- [ ] Typecheck passes
- [ ] Verify in browser using dev-browser skill

#### US-025: Extra innings entry
**Description:** As a captain, I want to enter extra innings when a game is tied so that ties are resolved.

**Acceptance Criteria:**
- [ ] When regulation innings (1–9) result in a tie, an "Add Extra Inning" button appears
- [ ] Extra inning columns appear to the right of inning 9
- [ ] Extra innings visually distinguished (different background/border)
- [ ] Extra innings flagged as `isExtra: true` in the database
- [ ] No limit on number of extra innings
- [ ] Typecheck passes
- [ ] Verify in browser using dev-browser skill

#### US-026: Auto-calculated totals
**Description:** As a user, I want to see plus, minus, and total columns auto-calculated so that I don't have to do math.

**Acceptance Criteria:**
- [ ] "Plus" column: sum of runs scored in regular innings (1–9) only
- [ ] "Minus" column: sum of runs allowed in regular innings (1–9) only
- [ ] "Total" column: plus minus minus (plus/minus differential)
- [ ] Extra innings runs NOT included in plus/minus/total
- [ ] Totals update in real-time as runs are entered
- [ ] Typecheck passes
- [ ] Verify in browser using dev-browser skill

#### US-027: Multi-game match view
**Description:** As a captain, I want to enter scores for all games in a match from one page so that I don't navigate between pages.

**Acceptance Criteria:**
- [ ] Match score entry page shows all individual games
- [ ] Each game has its own scoring grid
- [ ] Games are numbered and labeled with player names
- [ ] Can collapse/expand individual games
- [ ] Overall match totals visible at top/bottom
- [ ] Typecheck passes
- [ ] Verify in browser using dev-browser skill

#### US-028: Game winner determination
**Description:** As a system, I need to determine the winner of each individual game so that points are awarded correctly.

**Acceptance Criteria:**
- [ ] Winner is the player with more runs after 9 innings (or after extra innings if tied)
- [ ] Winner receives points per league config (default 1)
- [ ] If extra innings were played, winner still gets standard points
- [ ] Tie after extra innings handled (admin can flag as tie if league allows)
- [ ] Typecheck passes

#### US-029: DNP (Did Not Play) handling
**Description:** As a captain, I want to mark a game slot as DNP so that missing players are handled properly.

**Acceptance Criteria:**
- [ ] "Blackout" or DNP toggle on a game
- [ ] DNP games are excluded from stats
- [ ] DNP games do not award points
- [ ] Visual indicator (grayed out) on the scoresheet
- [ ] Typecheck passes
- [ ] Verify in browser using dev-browser skill

#### US-030: High innings notation
**Description:** As a user, I want 9-run innings highlighted so that exceptional performance is visible.

**Acceptance Criteria:**
- [ ] Any inning with 9 runs is visually highlighted (bold, color, or icon)
- [ ] High innings count tracked per player
- [ ] Visible on the scoring grid
- [ ] Typecheck passes
- [ ] Verify in browser using dev-browser skill

#### US-031: Dual entry with discrepancy flagging
**Description:** As a league, I want both captains to enter scores independently so that accuracy is verified.

**Acceptance Criteria:**
- [ ] Both home and visitor captains can enter scores for the same match
- [ ] System compares both entries inning-by-inning
- [ ] Matching entries are auto-confirmed
- [ ] Discrepancies are flagged for admin review
- [ ] Admin can resolve by choosing one entry or entering a correction
- [ ] Typecheck passes
- [ ] Verify in browser using dev-browser skill

#### US-032: Live tablet scoring
**Description:** As a user at a match, I want to enter scores on a tablet in real-time so that remote viewers can follow along.

**Acceptance Criteria:**
- [ ] Score entry works on tablet-sized screens (responsive grid)
- [ ] Touch-friendly input targets (≥44px)
- [ ] Changes sync in real-time via Convex subscriptions
- [ ] Other viewers see updates without refreshing
- [ ] Typecheck passes
- [ ] Verify in browser using dev-browser skill

---

### Epic: Score Import

#### US-033: CSV file upload
**Description:** As a captain, I want to upload a CSV file of scores so that I can import data from existing spreadsheets.

**Acceptance Criteria:**
- [ ] File upload accepts .csv files
- [ ] Uses Convex internal storage for uploaded files
- [ ] File is parsed with PapaParse
- [ ] Preview of parsed data shown before import
- [ ] Typecheck passes
- [ ] Verify in browser using dev-browser skill

#### US-034: Excel file upload
**Description:** As a captain, I want to upload Excel files so that I can import from common spreadsheet formats.

**Acceptance Criteria:**
- [ ] File upload accepts .xlsx and .xls files
- [ ] Parsed with SheetJS
- [ ] Sheet selector if workbook has multiple sheets
- [ ] Preview of parsed data shown before import
- [ ] Typecheck passes
- [ ] Verify in browser using dev-browser skill

#### US-035: Google Sheets import
**Description:** As a captain, I want to import scores from Google Sheets so that I can pull from shared league spreadsheets.

**Acceptance Criteria:**
- [ ] Authenticate with Google (via OAuth, see US-006)
- [ ] Enter Google Sheet URL or select from Drive
- [ ] Select sheet/range to import
- [ ] Preview parsed data
- [ ] Typecheck passes
- [ ] Verify in browser using dev-browser skill

#### US-036: Column mapping wizard
**Description:** As a captain, I want to map spreadsheet columns to innings/players so that the import understands my data format.

**Acceptance Criteria:**
- [ ] Step-by-step wizard after file upload
- [ ] Map columns to: player name, innings 1–9, extra innings, plus, minus
- [ ] Auto-detect common column names
- [ ] Save mapping as template for reuse
- [ ] Typecheck passes
- [ ] Verify in browser using dev-browser skill

#### US-037: Import validation and error handling
**Description:** As a captain, I want import errors clearly shown so that I can fix my spreadsheet and re-import.

**Acceptance Criteria:**
- [ ] Validate: runs 0–9, player names match roster, required columns present
- [ ] Row-level error messages (e.g., "Row 5: Invalid runs value '12' in inning 3")
- [ ] Option to skip invalid rows and import the rest
- [ ] Summary of imported vs. skipped rows
- [ ] Typecheck passes
- [ ] Verify in browser using dev-browser skill

#### US-038: Multi-file merge
**Description:** As an admin, I want to merge multiple import files into one match so that split spreadsheets are combined.

**Acceptance Criteria:**
- [ ] Upload multiple files for a single match
- [ ] System merges data by player/game
- [ ] Conflicts highlighted for manual resolution
- [ ] Typecheck passes
- [ ] Verify in browser using dev-browser skill

---

### Epic: Statistics

#### US-039: Player statistics calculation
**Description:** As a system, I need to calculate player stats from regular innings only so that stats are accurate.

**Acceptance Criteria:**
- [ ] Runs per game average (total regular-innings runs / games played)
- [ ] Total runs scored (regular innings only)
- [ ] Plus/minus rating (runs scored minus runs allowed, regular only)
- [ ] High innings count (number of 9-run innings)
- [ ] Games played count
- [ ] Win/loss record
- [ ] Extra innings runs excluded from all calculations
- [ ] Stats update when scores are entered or edited
- [ ] Typecheck passes

#### US-040: Player stats page
**Description:** As a player, I want to see my stats so that I can track my performance.

**Acceptance Criteria:**
- [ ] Page shows: average, total runs, plus/minus, high innings, W/L record
- [ ] Season selector to view historical stats
- [ ] Game-by-game history table
- [ ] Typecheck passes
- [ ] Verify in browser using dev-browser skill

#### US-041: Team statistics
**Description:** As a user, I want to see team-level stats so that I can compare teams.

**Acceptance Criteria:**
- [ ] Individual game wins total
- [ ] Total runs scored/allowed (regular innings)
- [ ] Match points (game wins + bonus points)
- [ ] Team plus/minus
- [ ] Team roster with per-player stats summary
- [ ] Typecheck passes
- [ ] Verify in browser using dev-browser skill

#### US-042: League standings
**Description:** As a user, I want to see league standings so that I know the rankings.

**Acceptance Criteria:**
- [ ] Standings table sorted by total match points (descending)
- [ ] Columns: rank, team name, match points, game wins, total runs, plus/minus
- [ ] Filter by division
- [ ] Filter by season
- [ ] Tiebreaker order: total match points → total runs scored → head-to-head record → plus/minus
- [ ] Typecheck passes
- [ ] Verify in browser using dev-browser skill

#### US-043: Leaderboards
**Description:** As a user, I want individual player leaderboards so that top performers are recognized.

**Acceptance Criteria:**
- [ ] Leaderboard categories: highest average, most runs, best plus/minus, most high innings, most wins
- [ ] Top 10 displayed per category
- [ ] Season and all-time views
- [ ] Typecheck passes
- [ ] Verify in browser using dev-browser skill

#### US-044: Historical trends
**Description:** As a user, I want to see performance trends over time so that I can track improvement.

**Acceptance Criteria:**
- [ ] Line chart of player average over weeks/matches
- [ ] Line chart of team points over weeks
- [ ] Comparison view (select multiple players or teams)
- [ ] Typecheck passes
- [ ] Verify in browser using dev-browser skill

#### US-045: Stats export
**Description:** As an admin, I want to export stats to CSV or PDF so that I can share them outside the app.

**Acceptance Criteria:**
- [ ] Export standings table as CSV
- [ ] Export standings table as PDF
- [ ] Export player stats as CSV
- [ ] Export includes season/division context
- [ ] Typecheck passes
- [ ] Verify in browser using dev-browser skill

---

### Epic: Handicapping

#### US-046: Configure handicap rules
**Description:** As an admin, I want to configure handicapping so that weaker players get spot runs based on average differentials.

**Acceptance Criteria:**
- [ ] Enable/disable handicapping per league
- [ ] Handicap formula: sum both paired players' averages, compute the difference, apply a configurable percentage to get spot runs awarded to the lower-averaged player
- [ ] Handicap percentage configurable at three levels: league-wide default, per-match override, per-game override
- [ ] Handicap recalculation frequency (weekly, per-match, manual)
- [ ] Typecheck passes
- [ ] Verify in browser using dev-browser skill

#### US-047: Apply handicaps to scoring
**Description:** As a system, I need to apply handicap spot runs to scoring so that adjusted results are calculated.

**Acceptance Criteria:**
- [ ] For each game, compute: `spotRuns = floor((higherPlayerAvg - lowerPlayerAvg) * handicapPercent)`
- [ ] Spot runs awarded to the lower-averaged player
- [ ] Handicap runs shown on the scoresheet alongside actual runs
- [ ] Adjusted totals displayed (actual + spot runs)
- [ ] Winner determined by adjusted totals when handicapping is enabled
- [ ] Raw (non-handicap) stats preserved for statistical purposes
- [ ] Typecheck passes
- [ ] Verify in browser using dev-browser skill

---

### Epic: Payments

#### US-048: Payment configuration
**Description:** As an admin, I want to configure league fees so that players know what they owe.

**Acceptance Criteria:**
- [ ] Set fee amounts: league fee, weekly fee
- [ ] Fee schedule (one-time, weekly, per-match)
- [ ] Typecheck passes
- [ ] Verify in browser using dev-browser skill

#### US-049: Payment tracking
**Description:** As an admin, I want to track who has paid so that I can follow up on outstanding fees.

**Acceptance Criteria:**
- [ ] Mark payments as received (manual entry)
- [ ] Payment status per player: paid, partial, unpaid
- [ ] Payment history log
- [ ] Outstanding balance calculation
- [ ] Typecheck passes
- [ ] Verify in browser using dev-browser skill

#### US-050: Online payment (Stripe)
**Description:** As a player, I want to pay league fees online so that I don't need cash.

**Acceptance Criteria:**
- [ ] Stripe checkout integration for league fees
- [ ] Payment confirmation and receipt
- [ ] Auto-update payment status on successful charge
- [ ] Typecheck passes
- [ ] Verify in browser using dev-browser skill

---

### Epic: Tournaments

#### US-051: Create tournament bracket
**Description:** As an admin, I want to create a single-elimination tournament so that the league can hold playoff events.

**Acceptance Criteria:**
- [ ] Create tournament: name, date, format (single-elimination)
- [ ] Select participating players or teams
- [ ] Auto-generate seeded bracket
- [ ] Bracket visualization (tree view)
- [ ] Typecheck passes
- [ ] Verify in browser using dev-browser skill

#### US-052: Tournament match scoring
**Description:** As a captain, I want to enter tournament match scores using the same grid so that scoring is consistent.

**Acceptance Criteria:**
- [ ] Tournament matches use same scoring grid as league matches
- [ ] Winners advance automatically in the bracket
- [ ] Championship match and final results displayed
- [ ] Typecheck passes
- [ ] Verify in browser using dev-browser skill

---

### Epic: Public & Social

#### US-053: Public league page
**Description:** As an admin, I want to make my league publicly viewable so that spectators can follow along.

**Acceptance Criteria:**
- [ ] Toggle league visibility: private (default) or public
- [ ] Public page shows: standings, schedule, recent results
- [ ] No login required for public pages
- [ ] Shareable URL
- [ ] Typecheck passes
- [ ] Verify in browser using dev-browser skill

#### US-054: Notifications
**Description:** As a user, I want to receive notifications about match schedules and deadlines so that I don't miss anything.

**Acceptance Criteria:**
- [ ] In-app notification center
- [ ] Notifications for: upcoming matches, score submission deadlines, roster changes
- [ ] Mark as read/unread
- [ ] Notification preferences (opt out per category)
- [ ] Typecheck passes
- [ ] Verify in browser using dev-browser skill

#### US-055: Audit log
**Description:** As an admin, I want an audit log of score changes so that I can track who changed what.

**Acceptance Criteria:**
- [ ] Log entries for: score entry, score edit, score import, role changes
- [ ] Each entry: who, what, when, old value, new value
- [ ] Filterable by date, user, action type
- [ ] Read-only (cannot edit log)
- [ ] Typecheck passes
- [ ] Verify in browser using dev-browser skill

---

## Functional Requirements

- FR-01: Multi-tenant SaaS: users sign up once, can create or join multiple independent leagues
- FR-02: Marketing landing page with feature highlights, CTA, and public access
- FR-03: Post-signup onboarding flow (create league or join via invite)
- FR-04: User dashboard listing all leagues with role context and league switcher
- FR-05: Invite system with shareable links, role assignment, and revocation
- FR-06: Role-based authentication with Admin, Captain, Player, Guest roles (scoped per league)
- FR-07: League creation with configurable match structure (games per match, points, extra innings rules)
- FR-08: Season and division management within leagues
- FR-09: Team creation with captain assignment and roster management (active/inactive, max size)
- FR-10: Match scheduling (manual and auto round-robin) with player pairings per game
- FR-11: Grid-based score entry mirroring paper scoresheets (innings 1–9, extra innings, plus/minus/total)
- FR-12: Extra innings support with runs excluded from statistics
- FR-13: Dual entry with automatic discrepancy detection and admin resolution
- FR-14: Score import from CSV, Excel, and Google Sheets with column mapping wizard
- FR-15: Import validation with row-level error reporting
- FR-16: Player statistics: average, total runs, plus/minus, high innings, W/L (regular innings only)
- FR-17: Team statistics: game wins, total runs, match points
- FR-18: League standings sorted by total points with division filtering
- FR-19: Individual leaderboards (average, runs, plus/minus, high innings, wins)
- FR-20: Handicapping via spot runs based on player average differentials
- FR-21: Payment tracking with optional Stripe online payment
- FR-22: Single-elimination tournament brackets with auto-advancement
- FR-23: Public league pages (opt-in)
- FR-24: In-app notifications for schedules and deadlines
- FR-25: Audit log of score and role changes
- FR-26: Real-time sync via Convex subscriptions (live scoring, live standings)
- FR-27: CSV and PDF export for standings and stats
- FR-28: Responsive design for tablet live scoring (touch targets ≥44px)
- FR-29: Runs per inning validated 0–9; max 9 per inning
- FR-30: DNP game handling with exclusion from stats
- FR-31: High innings (9-run) notation and tracking

## Non-Goals (Out of Scope)

- Native mobile apps (iOS/Android) — web only, responsive
- Video or photo integration for matches
- Real-time chat between players
- Automated referee/scoring via camera or sensors
- Multi-language / internationalization for v1
- Integration with external league management systems
- Custom game formats other than Baseball Darts (Cricket, 301, etc.)

## Technical Considerations

- **Stack:** Vite + React + TypeScript + Tailwind CSS + Convex
- **Auth:** BetterAuth (email/password + Google OAuth)
- **File Storage:** Convex internal storage (not UploadThing) for CSV/Excel uploads
- **Payments:** Stripe
- **Import Libraries:** PapaParse (CSV), SheetJS (Excel)
- **Real-time:** Convex subscriptions for live scoring and standings
- **Charts:** Consider Recharts or similar for trend visualizations (US-044)
- **Multi-tenancy:** Logical isolation via `leagueId` foreign key on all league-scoped tables. All queries filter by active league. No shared data between leagues except user accounts.
- **Data Model:** See US-002 for schema design. Statistics are computed via Convex queries, not stored (except for caching/performance optimization).
- **Performance:** Virtualize large standings/leaderboard lists if >50 rows
- **Accessibility:** WCAG 2.1 compliance per DESIGN.md standards

## Success Metrics

- League admin can set up a league, teams, and schedule in under 15 minutes
- Score entry for a full match (5 games × 9 innings × 2 players) completable in under 10 minutes
- Stats and standings update within 1 second of score entry
- CSV import processes 100-row files in under 5 seconds
- Zero manual math required — all totals and stats auto-calculated
- New visitor can go from landing page to first league created in under 3 minutes
- Invite link to league membership takes under 1 minute

## Resolved Questions

1. **DNP and averages:** DNP games are excluded from the denominator. `gamesPlayed` only counts games where the player actually played.
2. **Handicap formula:** Sum both paired players' averages, take the difference, apply a configurable percentage. Spot runs go to the lower-averaged player. Percentage is configurable at league/match/game level.
3. **Scoring formats:** Standard Baseball Darts only for v1 (0–3 runs per dart, max 9 per inning). No doubles/triples variants.
4. **Tournament formats:** Single-elimination only for v1.
5. **Payment reminders:** In-app notifications only for v1. No email delivery.
6. **Standings tiebreakers:** Total match points → total runs scored → head-to-head record → plus/minus.
