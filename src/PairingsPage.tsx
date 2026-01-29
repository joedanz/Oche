// ABOUTME: Player pairings page for assigning players to game slots in a match.
// ABOUTME: Captains and admins assign home/visitor players or blinds per slot.

import { useState, useEffect } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../convex/_generated/api";
import type { Id } from "../convex/_generated/dataModel";

interface PairingsPageProps {
  matchId: Id<"matches">;
  leagueId: Id<"leagues">;
}

interface PairingSlot {
  slot: number;
  homePlayerId: string;
  visitorPlayerId: string;
}

export function PairingsPage({ matchId, leagueId }: PairingsPageProps) {
  const data = useQuery(api.pairings.getMatchWithRosters, { matchId, leagueId });
  const savePairings = useMutation(api.pairings.savePairings);

  const [slots, setSlots] = useState<PairingSlot[]>([]);
  const [initialized, setInitialized] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (data && !initialized) {
      if (data.match.pairings.length > 0) {
        setSlots(
          data.match.pairings.map((p: any) => ({
            slot: p.slot,
            homePlayerId: p.homePlayerId,
            visitorPlayerId: p.visitorPlayerId,
          })),
        );
      } else {
        setSlots([{ slot: 1, homePlayerId: "", visitorPlayerId: "" }]);
      }
      setInitialized(true);
    }
  }, [data, initialized]);

  if (!data) {
    return <p>Loading…</p>;
  }

  const { homeTeamName, visitorTeamName, homePlayers, visitorPlayers } = data;

  function updateSlot(index: number, field: "homePlayerId" | "visitorPlayerId", value: string) {
    setSlots((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      return next;
    });
    setSaved(false);
  }

  function addSlot() {
    setSlots((prev) => [...prev, { slot: prev.length + 1, homePlayerId: "", visitorPlayerId: "" }]);
  }

  function removeSlot(index: number) {
    setSlots((prev) => {
      const next = prev.filter((_, i) => i !== index);
      return next.map((s, i) => ({ ...s, slot: i + 1 }));
    });
  }

  async function handleSave() {
    setError("");
    setSaved(false);

    const pairings = slots
      .filter((s) => s.homePlayerId || s.visitorPlayerId)
      .map((s) => ({
        slot: s.slot,
        homePlayerId: (s.homePlayerId || "blind") as Id<"players"> | "blind",
        visitorPlayerId: (s.visitorPlayerId || "blind") as Id<"players"> | "blind",
      }));

    try {
      await savePairings({ matchId, leagueId, pairings });
      setSaved(true);
    } catch (e: any) {
      setError(e.message ?? "Failed to save pairings");
    }
  }

  return (
    <div>
      <h2 className="text-xl font-bold text-oche-100 mb-4">
        Pairings: {homeTeamName} vs {visitorTeamName}
      </h2>

      {error && <p className="text-red-400 mb-2">{error}</p>}
      {saved && <p className="text-green-400 mb-2">Pairings saved.</p>}

      <div className="space-y-3">
        {slots.map((slot, index) => (
          <div key={index} className="flex items-center gap-3 bg-oche-800 p-3 rounded">
            <span className="text-oche-300 font-mono w-8">#{slot.slot}</span>

            <select
              className="bg-oche-700 text-oche-100 rounded px-2 py-1 flex-1"
              value={slot.homePlayerId}
              onChange={(e) => updateSlot(index, "homePlayerId", e.target.value)}
            >
              <option value="">— Select Home —</option>
              <option value="blind">Blind</option>
              {homePlayers.map((p: any) => (
                <option key={p._id} value={p._id}>
                  {p.name}
                </option>
              ))}
            </select>

            <span className="text-oche-400">vs</span>

            <select
              className="bg-oche-700 text-oche-100 rounded px-2 py-1 flex-1"
              value={slot.visitorPlayerId}
              onChange={(e) => updateSlot(index, "visitorPlayerId", e.target.value)}
            >
              <option value="">— Select Visitor —</option>
              <option value="blind">Blind</option>
              {visitorPlayers.map((p: any) => (
                <option key={p._id} value={p._id}>
                  {p.name}
                </option>
              ))}
            </select>

            <button
              type="button"
              className="text-red-400 hover:text-red-300 px-2"
              onClick={() => removeSlot(index)}
            >
              ✕
            </button>
          </div>
        ))}
      </div>

      <div className="mt-4 flex gap-3">
        <button
          type="button"
          className="bg-oche-700 text-oche-100 px-4 py-2 rounded hover:bg-oche-600"
          onClick={addSlot}
        >
          Add Slot
        </button>
        <button
          type="button"
          className="bg-green-700 text-white px-4 py-2 rounded hover:bg-green-600"
          onClick={handleSave}
        >
          Save Pairings
        </button>
      </div>
    </div>
  );
}
