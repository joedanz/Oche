// ABOUTME: Pure utility functions for exporting stats data to CSV and PDF formats.
// ABOUTME: Handles standings tables and player stats with proper formatting and escaping.

export interface StandingsRow {
  rank: number;
  teamName: string;
  matchPoints: number;
  gameWins: number;
  totalRunsScored: number;
  plusMinus: number;
}

export interface PlayerStatsRow {
  playerName: string;
  teamName: string;
  average: number;
  totalPlus: number;
  totalMinus: number;
  plusMinus: number;
  highInnings: number;
  wins: number;
  losses: number;
  gamesPlayed: number;
}

function escapeCsvField(value: string | number): string {
  const str = String(value);
  if (str.includes(",") || str.includes('"') || str.includes("\n")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function csvRow(fields: (string | number)[]): string {
  return fields.map(escapeCsvField).join(",");
}

export function standingsToCsv(
  standings: StandingsRow[],
  seasonName: string,
  divisionName: string,
): string {
  const lines: string[] = [];
  lines.push(`Season: ${seasonName}`);
  lines.push(`Division: ${divisionName}`);
  lines.push("");
  lines.push("Rank,Team,Match Points,Game Wins,Runs,+/-");
  for (const row of standings) {
    lines.push(csvRow([row.rank, row.teamName, row.matchPoints, row.gameWins, row.totalRunsScored, row.plusMinus]));
  }
  return lines.join("\n");
}

export function playerStatsToCsv(
  stats: PlayerStatsRow[],
  seasonName: string,
): string {
  const lines: string[] = [];
  lines.push(`Season: ${seasonName}`);
  lines.push("");
  lines.push("Player,Team,Average,Plus,Minus,+/-,High Innings,Wins,Losses,Games");
  for (const row of stats) {
    lines.push(csvRow([row.playerName, row.teamName, row.average, row.totalPlus, row.totalMinus, row.plusMinus, row.highInnings, row.wins, row.losses, row.gamesPlayed]));
  }
  return lines.join("\n");
}

export function downloadCsv(content: string, filename: string): void {
  const blob = new Blob([content], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

export function standingsToPdf(
  standings: StandingsRow[],
  seasonName: string,
  divisionName: string,
): void {
  // Dynamic import to keep jspdf out of initial bundle
  import("jspdf").then(({ default: jsPDF }) => {
    import("jspdf-autotable").then(() => {
      const doc = new jsPDF();
      doc.setFontSize(16);
      doc.text("League Standings", 14, 20);
      doc.setFontSize(10);
      doc.text(`Season: ${seasonName} | Division: ${divisionName}`, 14, 28);

      (doc as any).autoTable({
        startY: 35,
        head: [["Rank", "Team", "Match Points", "Game Wins", "Runs", "+/−"]],
        body: standings.map((r) => [r.rank, r.teamName, r.matchPoints, r.gameWins, r.totalRunsScored, r.plusMinus]),
      });

      doc.save("standings.pdf");
    });
  });
}

export function playerStatsToPdf(
  stats: PlayerStatsRow[],
  seasonName: string,
): void {
  import("jspdf").then(({ default: jsPDF }) => {
    import("jspdf-autotable").then(() => {
      const doc = new jsPDF();
      doc.setFontSize(16);
      doc.text("Player Statistics", 14, 20);
      doc.setFontSize(10);
      doc.text(`Season: ${seasonName}`, 14, 28);

      (doc as any).autoTable({
        startY: 35,
        head: [["Player", "Team", "Avg", "Plus", "Minus", "+/−", "9s", "W", "L", "GP"]],
        body: stats.map((r) => [r.playerName, r.teamName, r.average, r.totalPlus, r.totalMinus, r.plusMinus, r.highInnings, r.wins, r.losses, r.gamesPlayed]),
      });

      doc.save("player-stats.pdf");
    });
  });
}
