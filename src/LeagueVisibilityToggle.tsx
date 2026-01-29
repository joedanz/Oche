// ABOUTME: Admin toggle for league public/private visibility.
// ABOUTME: Shows current state and shareable URL when public.

import { useQuery, useMutation } from "convex/react";
import { api } from "../convex/_generated/api";
import type { Id } from "../convex/_generated/dataModel";
import { usePlan } from "./usePlan";
import { UpgradePrompt } from "./UpgradePrompt";

interface Props {
  leagueId: Id<"leagues">;
}

export function LeagueVisibilityToggle({ leagueId }: Props) {
  const { isLoading, canUse } = usePlan();
  const league = useQuery(api.leagues.getLeague, { leagueId });
  const toggle = useMutation(api.publicLeague.toggleVisibility);

  if (isLoading) return null;
  if (!canUse("public_pages")) {
    return <UpgradePrompt feature="Public League Pages" description="Share your league standings and stats with a public URL anyone can view." />;
  }

  if (!league) return null;

  const isPublic = !!(league as any).isPublic;
  const publicUrl = `/public/${leagueId}`;

  return (
    <div className="bg-oche-900 rounded-lg p-4">
      <h3 className="text-lg font-semibold text-oche-200 mb-2">League Visibility</h3>
      <p className="text-oche-400 mb-3">
        Status: <span className="font-medium text-oche-200">{isPublic ? "Public" : "Private"}</span>
      </p>
      {isPublic && (
        <p className="text-oche-400 mb-3 text-sm">
          Shareable URL: <code className="text-oche-300">{publicUrl}</code>
        </p>
      )}
      <button
        onClick={() => toggle({ leagueId, isPublic: !isPublic })}
        className="px-4 py-2 rounded bg-oche-700 text-oche-100 hover:bg-oche-600"
      >
        {isPublic ? "Make Private" : "Make Public"}
      </button>
    </div>
  );
}
