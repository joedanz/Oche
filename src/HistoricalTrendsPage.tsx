// ABOUTME: Historical performance trends page with line charts.
// ABOUTME: Shows player average and team points trends over time with comparison support.

import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "../convex/_generated/api";
import type { Id } from "../convex/_generated/dataModel";
import { usePlan } from "./usePlan";
import { UpgradePrompt } from "./UpgradePrompt";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";

const COLORS = [
  "#2563eb", "#dc2626", "#16a34a", "#ca8a04", "#9333ea",
  "#0891b2", "#e11d48", "#65a30d", "#d97706", "#7c3aed",
];

type Mode = "players" | "teams";

export function HistoricalTrendsPage({ leagueId }: { leagueId: Id<"leagues"> }) {
  const { isLoading, canUse } = usePlan();
  const [seasonId, setSeasonId] = useState<string>("");
  const [mode, setMode] = useState<Mode>("players");
  const [selectedPlayerIds, setSelectedPlayerIds] = useState<string[]>([]);
  const [selectedTeamIds, setSelectedTeamIds] = useState<string[]>([]);

  const metadata = useQuery(api.trends.getTrendsMetadata, { leagueId });

  const seasonArg = seasonId ? { seasonId: seasonId as Id<"seasons"> } : {};

  // Fetch trend data for each selected player
  const playerTrend0 = useQuery(
    api.trends.getPlayerTrend,
    selectedPlayerIds[0] ? { playerId: selectedPlayerIds[0] as Id<"players">, leagueId, ...seasonArg } : "skip",
  );
  const playerTrend1 = useQuery(
    api.trends.getPlayerTrend,
    selectedPlayerIds[1] ? { playerId: selectedPlayerIds[1] as Id<"players">, leagueId, ...seasonArg } : "skip",
  );
  const playerTrend2 = useQuery(
    api.trends.getPlayerTrend,
    selectedPlayerIds[2] ? { playerId: selectedPlayerIds[2] as Id<"players">, leagueId, ...seasonArg } : "skip",
  );

  // Fetch trend data for each selected team
  const teamTrend0 = useQuery(
    api.trends.getTeamTrend,
    selectedTeamIds[0] ? { teamId: selectedTeamIds[0] as Id<"teams">, leagueId, ...seasonArg } : "skip",
  );
  const teamTrend1 = useQuery(
    api.trends.getTeamTrend,
    selectedTeamIds[1] ? { teamId: selectedTeamIds[1] as Id<"teams">, leagueId, ...seasonArg } : "skip",
  );
  const teamTrend2 = useQuery(
    api.trends.getTeamTrend,
    selectedTeamIds[2] ? { teamId: selectedTeamIds[2] as Id<"teams">, leagueId, ...seasonArg } : "skip",
  );

  if (isLoading) return null;
  if (!canUse("historical_trends")) {
    return <UpgradePrompt message="Historical trends require a League plan or higher." />;
  }

  if (!metadata) {
    return <div className="p-6">Loading…</div>;
  }

  const playerTrends = [playerTrend0, playerTrend1, playerTrend2].filter(Boolean);
  const teamTrends = [teamTrend0, teamTrend1, teamTrend2].filter(Boolean);

  function togglePlayer(id: string) {
    setSelectedPlayerIds((prev) =>
      prev.includes(id) ? prev.filter((p) => p !== id) : prev.length < 3 ? [...prev, id] : prev,
    );
  }

  function toggleTeam(id: string) {
    setSelectedTeamIds((prev) =>
      prev.includes(id) ? prev.filter((t) => t !== id) : prev.length < 3 ? [...prev, id] : prev,
    );
  }

  // Merge player trend data into a single chart dataset
  function buildPlayerChartData() {
    const dateMap = new Map<string, Record<string, string | number>>();
    for (const trend of playerTrends) {
      if (!trend) continue;
      for (const pt of trend.points) {
        const row = dateMap.get(pt.matchDate) ?? { date: pt.matchDate };
        row[trend.playerName] = pt.cumulativeAverage;
        dateMap.set(pt.matchDate, row);
      }
    }
    return Array.from(dateMap.values()).sort((a, b) =>
      String(a.date).localeCompare(String(b.date)),
    );
  }

  function buildTeamChartData() {
    const dateMap = new Map<string, Record<string, string | number>>();
    for (const trend of teamTrends) {
      if (!trend) continue;
      for (const pt of trend.points) {
        const row = dateMap.get(pt.matchDate) ?? { date: pt.matchDate };
        row[trend.teamName] = pt.cumulativePoints;
        dateMap.set(pt.matchDate, row);
      }
    }
    return Array.from(dateMap.values()).sort((a, b) =>
      String(a.date).localeCompare(String(b.date)),
    );
  }

  const playerChartData = buildPlayerChartData();
  const teamChartData = buildTeamChartData();

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <h2 className="text-2xl font-bold mb-4">Historical Trends</h2>

      <div className="flex flex-wrap gap-4 mb-6">
        <select
          className="border rounded px-3 py-2 bg-white"
          value={seasonId}
          onChange={(e) => setSeasonId(e.target.value)}
          aria-label="Season"
        >
          <option value="">Active Season</option>
          {metadata.seasons.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>

        <div className="flex gap-2">
          <button
            className={`px-4 py-2 rounded ${mode === "players" ? "bg-blue-600 text-white" : "bg-gray-200 text-gray-700"}`}
            onClick={() => setMode("players")}
          >
            Player Averages
          </button>
          <button
            className={`px-4 py-2 rounded ${mode === "teams" ? "bg-blue-600 text-white" : "bg-gray-200 text-gray-700"}`}
            onClick={() => setMode("teams")}
          >
            Team Points
          </button>
        </div>
      </div>

      {mode === "players" && (
        <>
          <div className="mb-4">
            <p className="text-sm text-gray-500 mb-2">Select up to 3 players to compare:</p>
            <div className="flex flex-wrap gap-2">
              {metadata.players.map((p) => (
                <button
                  key={p.id}
                  onClick={() => togglePlayer(p.id)}
                  className={`px-3 py-1 rounded text-sm ${
                    selectedPlayerIds.includes(p.id)
                      ? "bg-blue-600 text-white"
                      : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                  }`}
                >
                  {p.name}
                </button>
              ))}
            </div>
          </div>

          {playerChartData.length > 0 ? (
            <div data-testid="player-chart" className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={playerChartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  {playerTrends.map((trend, i) =>
                    trend ? (
                      <Line
                        key={trend.playerName}
                        type="monotone"
                        dataKey={trend.playerName}
                        stroke={COLORS[i % COLORS.length]}
                        strokeWidth={2}
                        dot={{ r: 4 }}
                      />
                    ) : null,
                  )}
                </LineChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <p className="text-gray-500">Select players to view trends.</p>
          )}
        </>
      )}

      {mode === "teams" && (
        <>
          <div className="mb-4">
            <p className="text-sm text-gray-500 mb-2">Select up to 3 teams to compare:</p>
            <div className="flex flex-wrap gap-2">
              {metadata.teams.map((t) => (
                <button
                  key={t.id}
                  onClick={() => toggleTeam(t.id)}
                  className={`px-3 py-1 rounded text-sm ${
                    selectedTeamIds.includes(t.id)
                      ? "bg-blue-600 text-white"
                      : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                  }`}
                >
                  {t.name}
                </button>
              ))}
            </div>
          </div>

          {teamChartData.length > 0 ? (
            <div data-testid="team-chart" className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={teamChartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  {teamTrends.map((trend, i) =>
                    trend ? (
                      <Line
                        key={trend.teamName}
                        type="monotone"
                        dataKey={trend.teamName}
                        stroke={COLORS[i % COLORS.length]}
                        strokeWidth={2}
                        dot={{ r: 4 }}
                      />
                    ) : null,
                  )}
                </LineChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <p className="text-gray-500">Select teams to view trends.</p>
          )}
        </>
      )}
    </div>
  );
}
