# American Baseball Darts League Management App - Product Requirements Document (PRD)

## 1. Overview

### 1.1 Purpose
Web application for managing American Baseball Darts leagues (steel/soft-tip). Teams play multiple individual 9-inning Baseball games per match night. Each inning targets numbers 1–9; players score runs (0–3 per dart, max 9 per inning). Ties resolved with extra innings (runs excluded from stats). Supports grid-based scoresheets (innings columns, runs per inning, plus/minus/totals) mirroring paper formats (e.g., Mason Dixon Dart League). Replaces spreadsheets with manual/import entry, real-time stats, standings.

### 1.2 Scope
League admin, rosters, scheduling, score entry (grid manual + import), extra innings exclusion, points (per individual game win + night total bonus), live scoring, handicapping (spot runs), payments, tournaments.

### 1.3 Objectives
- Eliminate spreadsheet merging.
- Digital mirror of paper scoresheets (innings 1–9 grids, plus/minus).
- Auto-calculate stats excluding extra innings runs.
- Configurable individual games per match, points system.
- Real-time team/player stats and standings.

## 2. Target Users & Personas

| Persona              | Description                                                                 | Primary Goals                                      |
|----------------------|-----------------------------------------------------------------------------|----------------------------------------------------|
| League Administrator | Sets rules, pairings, approves data                                         | Configure match structure/handicaps, review scores, standings |
| Team Captain         | Manages roster, enters scores                                               | Roster updates, pair players, enter/import scores, view stats |
| Player               | Views stats/history                                                         | Check runs average, plus/minus, rankings           |
| Guest/Spectator      | Views public data                                                           | Follow standings/progress                          |

## 3. Key Features

### 3.1 Authentication & Roles (BetterAuth)
- Email/password or OAuth login (Google for imports).
- Roles: Admin (full), Captain (team/score entry/pairings), Player (read), Guest (public).
- Restricted editing.

### 3.2 League Management
- Create/edit: name, season, divisions.
- Match config:
  - Number of individual games per match.
  - Points: 1 per individual game win; bonus for team with highest total runs that night.
  - Extra innings: Enabled, runs excluded from stats.
- Handicapping: Spot runs per inning based on player averages.
- Scoring template: Innings columns (1–9 standard, extra optional), runs per inning.
- Payment integration.

### 3.3 Teams & Rosters
- Team setup: name, captain, venue.
- Roster: add/remove players, active/inactive, max size.

### 3.4 Match Scheduling & Results
- Auto/manual schedule + player pairings per individual game.
- Match page: teams, date, roster, pairings grid.
- Results: Individual game winners, total runs, bonus point.
- Live tablet scoring.

### 3.5 Score Entry
#### Manual Entry
- Grid mirroring paper sheets:
  - Paired home/visitor players per individual game.
  - Columns: Innings 1–9 (runs 0–9), optional extra innings columns.
  - Auto-sum: Plus (runs scored, regular innings only), Minus (runs allowed, regular), Total (plus-minus).
  - Flag extra innings (excluded from stats).
  - Blackout DNP players.
  - High innings (9-runs noted).
- Multiple games per match in one view.
- Dual entry + discrepancy flagging.

#### Import
- CSV/Excel/Google Sheet upload.
- Mapping wizard (innings columns, players, plus/minus, extras).
- Validation, multi-file merge.

### 3.6 Statistics & Standings
- Auto-calculated (regular 9 innings only):
  - Player: Runs per game average, total runs, plus/minus rating, high innings (9s).
  - Team: Individual game wins, total runs, match points (wins + bonus).
  - League: Leaderboards (averages, plus/minus, 9-inning games).
- Historical trends.
- Sortable standings (by total points).
- Export CSV/PDF.

### 3.7 Additional Features
- Notifications (matches/deadlines).
- Public league page.
- Audit log.
- Tournament hosting (single-elim Baseball brackets).

## 4. Functional Requirements

| ID  | Requirement                                                                 | Priority |
|-----|-----------------------------------------------------------------------------|----------|
| F-01 | Role-based authentication                                                   | High     |
| F-02 | League config: games per match, points system, extra innings exclusion      | High     |
| F-03 | Team/roster management                                                      | High     |
| F-04 | Scheduling, pairings, live scoring, results with bonus                      | High     |
| F-05 | Grid entry: innings runs, auto plus/minus/total, extra flag                 | High     |
| F-06 | Import mapping/validation/merge                                             | High     |
| F-07 | Stats calc excluding extras: averages, plus/minus                           | High     |
| F-08 | Real-time standings/leaderboards/trends                                     | High     |
| F-09 | Mobile/tablet support                                                       | High     |
| F-10 | Exports                                                                     | High     |
| F-11 | Handicapping, payments, tournaments                                         | High     |

## 5. Non-Functional Requirements
- Real-time updates (Convex).
- Support 500 users, 50 teams.
- Private default; public opt-in.
- Validation (runs 0–9 per inning).
- WCAG 2.1.
- Stack: Vite + React (TS), Convex, BetterAuth, PapaParse/SheetJS.

## 6. Data Model (Convex)

```ts
leagues: { ..., matchConfig: { gamesPerMatch: number, pointsPerGameWin: number, bonusForTotalRuns: boolean, extraInningsExcludeFromStats: boolean }, handicaps: [...] }

matches: { ..., games: [{ gameNum: number, homePlayerId: id, visitorPlayerId: id, innings: [{ inning: number, homeRuns: number, visitorRuns: number, isExtra: boolean }] }], totals: { homeRuns: number, visitorRuns: number, bonusWinner: "home"|"visitor"|null } }

players: { ..., stats: { totalRuns: number, gamesPlayed: number, plusMinus: number } }  // Calculated queries
```

## 7. Risks & Assumptions
- Assumption: Standard Baseball Darts (9 innings targeting 1–9, runs scoring, extras excluded); fully configurable for league variations.
- Risk: Pairing/handicap complexity — mitigated by admin tools, templates.