# American Baseball Darts League Management App - Product Requirements Document (PRD)

## 1. Overview

### 1.1 Purpose
Web application for managing American Baseball Darts leagues (steel/soft-tip). Matches consist of multiple individual 9-inning Baseball games (typically 3–6 per team). Each inning: players throw at target number (1–9); runs scored (0–9+ via single/double/triple). Alternating batting/fielding per inning; batter gets +runs scored, defender gets -runs allowed. Supports grid-based scoresheets (innings columns, plus/minus/totals, extras excluded from stats) mirroring paper formats. Replaces spreadsheets with manual/import entry, real-time stats, standings.

### 1.2 Scope
League admin, rosters, scheduling, pairings, short-handed blinds, score entry (grid manual + import), extra innings exclusion, points (per game win + night total bonus), live scoring, spot handicapping, payments, tournaments.

### 1.3 Objectives
- Eliminate spreadsheet merging.
- Digital mirror of paper scoresheets (innings grids, plus/minus).
- Auto-calculate stats excluding extras.
- Configurable games per match, points, blinds.
- Real-time stats/standings.

## 2. Target Users & Personas

| Persona              | Description                                                                 | Primary Goals                                      |
|----------------------|-----------------------------------------------------------------------------|----------------------------------------------------|
| League Administrator | Sets rules, approves data                                                   | Configure match/games/blinds/handicaps, review scores, standings |
| Team Captain         | Manages roster/pairings, enters scores                                      | Roster updates, set pairings, enter/import scores, stats |
| Player               | Views stats/history                                                         | Check average runs, plus/minus, rankings           |
| Guest/Spectator      | Views public data                                                           | Follow standings/progress                          |

## 3. Key Features

### 3.1 Authentication & Roles (BetterAuth)
- Email/password or OAuth login (Google for imports).
- Roles: Admin (full), Captain (team/pairings/score entry), Player (read), Guest (public).
- Restricted editing.

### 3.2 League Management
- Create/edit: name, season, divisions.
- Match config:
  - Individual games per match (shooters per team: 3–6 typical, 1–2 allowed).
  - Points: 1 per individual game win; bonus for higher team total (plus or runs).
  - Extra innings: Enabled to resolve ties; runs excluded from stats.
  - Blinds: Enabled for short-handed teams; configurable default (e.g., 0 runs batting, average-based, fixed).
- Spot handicapping (runs per inning).
- Payment integration.

### 3.3 Teams & Rosters
- Team setup: name, captain, venue.
- Roster: add/remove players, active/inactive, no fixed max (typical 6–12).

### 3.4 Match Scheduling & Results
- Auto/manual schedule.
- Match page: teams, date, rosters.
- Pairings: Captains assign players (or blinds) to game slots (1–max); support fewer than configured.
- Results: Game winners (higher total after extras), team totals, bonus point.
- Live tablet scoring.

### 3.5 Score Entry
#### Manual Entry
- Multi-game view per match.
- Per individual game (paired players or blind):
  - Grid: Innings 1–9+ columns; enter runs per batting half-inning in batter's column.
  - Auto-calculate: Plus (own regular batting runs), Minus (opponent's regular batting runs), Total (plus - minus).
  - Flag extra innings (excluded from stats; used for winner only).
  - Blackout DNP; auto-handle blinds.
  - Note high innings (e.g., 9+).
- Dual entry + discrepancy flagging.

#### Import
- CSV/Excel/Google Sheet upload.
- Mapping wizard (innings columns, pairings, plus/minus, extras, blinds).
- Validation, multi-file merge.

### 3.6 Statistics & Standings
- Auto-calculated (regular 9 innings only):
  - Player: Runs per game average, plus/minus rating, total plus/minus, high innings.
  - Team: Game wins, total plus/runs, match points (wins + bonus).
  - League: Leaderboards (averages, plus/minus, high innings).
- Historical trends.
- Sortable standings (by total points).
- Export CSV/PDF.

### 3.7 Additional Features
- Notifications (matches/deadlines).
- Public league page.
- Audit log.
- Tournament hosting (brackets).

## 4. Functional Requirements

| ID  | Requirement                                                                 | Priority |
|-----|-----------------------------------------------------------------------------|----------|
| F-01 | Role-based authentication                                                   | High     |
| F-02 | League config: games per match, points, extras exclusion, blinds handling   | High     |
| F-03 | Team/roster management                                                      | High     |
| F-04 | Scheduling, pairings (with blinds), live scoring, results with bonus        | High     |
| F-05 | Per-game grid: batting runs entry, auto plus/minus/total, extra flag        | High     |
| F-06 | Import mapping/validation/merge                                             | High     |
| F-07 | Stats calc excluding extras/blinds adjustment: averages, plus/minus         | High     |
| F-08 | Real-time standings/leaderboards/trends                                     | High     |
| F-09 | Mobile/tablet support                                                       | High     |
| F-10 | Exports                                                                     | High     |
| F-11 | Handicapping, payments, tournaments                                         | High     |

## 5. Non-Functional Requirements
- Real-time updates (Convex).
- Support 500 users, 50 teams.
- Private default; public opt-in.
- Validation (runs per inning logical, e.g., 0–27).
- WCAG 2.1.
- Stack: Vite + React (TS), Convex, BetterAuth, PapaParse/SheetJS.

## 6. Data Model (Convex)

```ts
leagues: { ..., matchConfig: { gamesPerMatch: number, pointsPerGameWin: number, bonusForTotal: boolean, extraExclude: boolean, blindRules: { enabled: boolean, defaultRuns: number | "average" | ... } }, handicaps: [...] }

matches: { ..., pairings: [{ slot: number, homePlayerId: id | "blind", visitorPlayerId: id | "blind" }], games: [{ slot: number, innings: [{ inning: number, batter: "home"|"visitor", runs: number, isExtra: boolean }] }], totals: { homePlus: number, visitorPlus: number, bonusWinner: "home"|"visitor"|null } }

players: { ..., stats: { totalPlus: number, totalMinus: number, gamesPlayed: number } }  // Queries
```

## 7. Risks & Assumptions
- Assumption: Standard American Baseball Darts (9 innings, alternating batting, plus = own runs, minus = allowed runs, extras for ties only); configurable for variations.
- Risk: Blind/pairing complexity — mitigated by captain tools, defaults, templates.