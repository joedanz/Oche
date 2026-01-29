# American-Style Dart League Management App - Product Requirements Document (PRD)

## 1. Overview

### 1.1 Purpose
Web application for managing American-style recreational dart leagues (steel/soft-tip, team matches with multiple games/legs, plus/minus or points-based scoring). Supports common formats (501, 301, Cricket, mixed) and grid-based scoresheets mirroring paper versions (e.g., Mason Dixon Dart League: per-game entries, plus/minus columns, totals). Replaces spreadsheet merging with centralized manual/import entry, real-time stats, and standings.

### 1.2 Scope
Full league administration, rosters, scheduling, score entry (manual grid + import), tie-breaker handling, advanced stats (PPD/MPR excluding tie-breakers), configurable points (per-game + overall bonus), live scoring, handicapping, payments, tournaments.

### 1.3 Objectives
- Eliminate spreadsheet issues.
- Mirror physical scoresheets digitally.
- Auto-calculate stats excluding tie-breaker extras.
- Support flexible points: per-game wins + bonus for highest match total.
- Real-time standings and stats.

## 2. Target Users & Personas

| Persona              | Description                                                                 | Primary Goals                                      |
|----------------------|-----------------------------------------------------------------------------|----------------------------------------------------|
| League Administrator | Sets rules, approves data                                                   | Configure league/match rules, review scores, standings |
| Team Captain         | Manages roster, enters scores                                               | Roster updates, score entry/import, stats view     |
| Player               | Views stats/history                                                         | Check PPD/MPR, rankings, match details             |
| Guest/Spectator      | Views public data                                                           | Follow standings/progress                          |

## 3. Key Features

### 3.1 Authentication & Roles (BetterAuth)
- Email/password or OAuth login (Google for imports).
- Roles: Admin (full), Captain (team/score entry), Player (read), Guest (public).
- Restricted editing.

### 3.2 League Management
- Create/edit: name, season, divisions, game types (501/301/Cricket/mixed).
- Configurable match structure:
  - Number of games/legs per match.
  - Points: Per-game win (e.g., 1 pt), bonus for team with highest match total.
  - Tie-breakers: Extra innings/rounds/games to resolve ties/winner; configurable exclusion from player stats.
- Scoring templates: Grid columns = games, per-game entries, plus/minus columns, auto-totals.
- Handicapping (spot darts/points).
- Payment integration.

### 3.3 Teams & Rosters
- Team setup: name, captain, venue.
- Roster: add/remove, active/inactive, max size.

### 3.4 Match Scheduling & Results
- Auto/manual schedule (round-robin).
- Match page: teams, date, rosters.
- Results: game wins, totals, overall winner + bonus point.
- Live tablet scoring.

### 3.5 Score Entry
#### Manual Entry
- Grid mirroring paper sheets:
  - Home/visitor sections.
  - Configurable game columns (e.g., 1–9+).
  - Per-game scores/values, plus/minus fields, auto-totals.
  - Blackout DNP cells.
  - Flag tie-breaker games/extras (excluded from stats).
  - High scores (tons, 180s, 9-marks).
- Game modes:
  - 501/301: Turn entry, auto darts/busts/checkout.
  - Cricket: Marks (/, X, O), points; extra rounds optional/excludable.
- Dual entry + discrepancy flagging.

#### Import
- CSV/Excel/Google Sheet upload.
- Mapping wizard (columns to games/players/plus/minus).
- Validation, multi-file merge.

### 3.6 Statistics & Standings
- Auto-calculated (excluding tie-breakers):
  - Player: PPD, MPR, win %, plus/minus totals, high scores.
  - Team: Game wins, total points, match wins (incl. bonus).
  - League: Leaderboards (averages, 180s, checkouts, 9-marks).
- Historical trends.
- Sortable standings (by total points).
- Export CSV/PDF.

### 3.7 Additional Features
- Notifications (matches/deadlines).
- Public league page.
- Audit log.
- Tournament hosting.

## 4. Functional Requirements

| ID  | Requirement                                                                 | Priority |
|-----|-----------------------------------------------------------------------------|----------|
| F-01 | Role-based authentication                                                   | High     |
| F-02 | League config: games per match, points (per-game + bonus), tie-breakers excl. stats | High     |
| F-03 | Team/roster management                                                      | High     |
| F-04 | Scheduling, live scoring, results with bonus points                         | High     |
| F-05 | Grid entry: per-game, plus/minus, tie-breaker flag, auto-calc               | High     |
| F-06 | Import mapping/validation/merge                                             | High     |
| F-07 | Stats calc: PPD/MPR/plus-minus excl. tie-breakers                           | High     |
| F-08 | Real-time standings/leaderboards/trends                                     | High     |
| F-09 | Mobile/tablet support                                                       | High     |
| F-10 | Exports                                                                     | High     |
| F-11 | Payments, tournaments                                                       | High     |

## 5. Non-Functional Requirements
- Real-time (Convex).
- 500 users/50 teams support.
- Private default; public opt-in.
- Validation.
- WCAG 2.1.
- Stack: Vite + React (TS), Convex, BetterAuth, PapaParse/SheetJS.

## 6. Data Model (Convex)

```ts
leagues: { ..., matchConfig: { gamesPerMatch: number, pointsPerWin: number, bonusForOverall: boolean, excludeTieBreakersFromStats: boolean } }

matches: { ..., games: [{ gameNum: number, isTieBreaker: boolean, homeScore: {...}, visitorScore: {...} }], totals: { home: number, visitor: number, bonusWinner: "home"|"visitor"|null } }

 // Player/game entries in flexible JSON for grid/plus/minus
```

## 7. Risks & Assumptions
- Assumption: Grid/plus-minus + per-game wins + overall bonus covers common American formats; fully configurable.
- Risk: Rule variations — mitigated by templates, customization, tie-breaker flags.