// ABOUTME: Auto-generate round-robin schedule page.
// ABOUTME: Lets admins select teams, date range, and generate balanced matchups.

import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../convex/_generated/api";
import type { Id } from "../convex/_generated/dataModel";

interface ScheduleGeneratorPageProps {
  leagueId: Id<"leagues">;
}

export function ScheduleGeneratorPage({ leagueId }: ScheduleGeneratorPageProps) {
  const teams = useQuery(api.teams.getTeams, { leagueId });
  const seasons = useQuery(api.seasons.getSeasons, { leagueId });
  const generateSchedule = useMutation(api.scheduleGenerator.generateSchedule);

  const [selectedTeamIds, setSelectedTeamIds] = useState<Set<string>>(new Set());
  const [startDate, setStartDate] = useState("");
  const [weeksBetweenRounds, setWeeksBetweenRounds] = useState(1);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  if (teams === undefined || seasons === undefined) {
    return <p>Loading…</p>;
  }

  const activeSeason = seasons.find((s: any) => s.isActive);

  function toggleTeam(teamId: string) {
    setSelectedTeamIds((prev) => {
      const next = new Set(prev);
      if (next.has(teamId)) {
        next.delete(teamId);
      } else {
        next.add(teamId);
      }
      return next;
    });
  }

  function selectAll() {
    setSelectedTeamIds(new Set(teams!.map((t: any) => t._id)));
  }

  function deselectAll() {
    setSelectedTeamIds(new Set());
  }

  async function handleGenerate(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!activeSeason) {
      setError("No active season. Create and activate a season first.");
      return;
    }

    if (selectedTeamIds.size < 2) {
      setError("Select at least 2 teams to generate a schedule.");
      return;
    }

    try {
      const matchIds = await generateSchedule({
        leagueId,
        seasonId: activeSeason._id,
        teamIds: [...selectedTeamIds] as Id<"teams">[],
        startDate,
        weeksBetweenRounds,
      });
      setSuccess(`Schedule generated! ${matchIds.length} matches created.`);
      setSelectedTeamIds(new Set());
    } catch (err: any) {
      setError(err.message || "Failed to generate schedule");
    }
  }

  return (
    <div>
      <h2 className="text-xl font-bold mb-4">Auto-Generate Schedule</h2>

      <form onSubmit={handleGenerate} className="mb-6 space-y-4 max-w-md">
        <fieldset>
          <legend className="text-sm font-medium mb-2">Select Teams</legend>
          <div className="flex gap-2 mb-2">
            <button
              type="button"
              onClick={selectAll}
              className="text-sm text-blue-600 hover:underline"
            >
              Select All
            </button>
            <button
              type="button"
              onClick={deselectAll}
              className="text-sm text-blue-600 hover:underline"
            >
              Deselect All
            </button>
          </div>
          <div className="space-y-1">
            {teams.map((t: any) => (
              <label key={t._id} className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={selectedTeamIds.has(t._id)}
                  onChange={() => toggleTeam(t._id)}
                  aria-label={t.name}
                />
                {t.name}
              </label>
            ))}
          </div>
        </fieldset>

        <div>
          <label htmlFor="startDate" className="block text-sm font-medium">
            Start Date
          </label>
          <input
            id="startDate"
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="w-full border rounded px-2 py-1 bg-white text-black"
            required
          />
        </div>

        <div>
          <label htmlFor="weeksBetweenRounds" className="block text-sm font-medium">
            Weeks Between Rounds
          </label>
          <input
            id="weeksBetweenRounds"
            type="number"
            min={1}
            value={weeksBetweenRounds}
            onChange={(e) => setWeeksBetweenRounds(Number(e.target.value))}
            className="w-full border rounded px-2 py-1 bg-white text-black"
            required
          />
        </div>

        {error && <p className="text-red-500 text-sm">{error}</p>}
        {success && <p className="text-green-600 text-sm">{success}</p>}

        <button
          type="submit"
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
        >
          Generate Schedule
        </button>
      </form>
    </div>
  );
}
