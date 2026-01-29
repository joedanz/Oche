// ABOUTME: Admin-only audit log page for tracking score and role changes.
// ABOUTME: Displays filterable, read-only log of all league actions.

import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "../convex/_generated/api";
import type { Id } from "../convex/_generated/dataModel";
import { usePlan } from "./usePlan";
import { UpgradePrompt } from "./UpgradePrompt";

type AuditAction = "score_entry" | "score_edit" | "score_import" | "role_change";

const ACTION_LABELS: Record<AuditAction, string> = {
  score_entry: "Score Entry",
  score_edit: "Score Edit",
  score_import: "Score Import",
  role_change: "Role Change",
};

interface AuditLogEntry {
  _id: string;
  userId: string;
  userName: string;
  action: AuditAction;
  details: string;
  oldValue?: string;
  newValue?: string;
  createdAt: number;
}

export function AuditLogPage({ leagueId }: { leagueId: Id<"leagues"> }) {
  const { isLoading, canUse } = usePlan();
  const allowed = !isLoading && canUse("audit_log");
  const [actionFilter, setActionFilter] = useState<AuditAction | "">("");

  const queryArgs: { leagueId: Id<"leagues">; action?: AuditAction } = { leagueId };
  if (actionFilter) {
    queryArgs.action = actionFilter;
  }

  const entries = useQuery(api.auditLog.getAuditLog, allowed ? queryArgs : "skip") as AuditLogEntry[] | undefined;

  if (isLoading) return null;
  if (!canUse("audit_log")) {
    return <UpgradePrompt feature="Audit Log" description="Track every score entry, edit, and role change with a complete activity history." />;
  }

  return (
    <div>
      <h2 className="text-2xl font-bold text-white mb-6">Audit Log</h2>

      <div className="mb-4">
        <label htmlFor="action-filter" className="sr-only">
          Filter by action
        </label>
        <select
          id="action-filter"
          value={actionFilter}
          onChange={(e) => setActionFilter(e.target.value as AuditAction | "")}
          className="bg-oche-800 text-white border border-oche-600 rounded px-3 py-2"
        >
          <option value="">All actions</option>
          <option value="score_entry">Score Entry</option>
          <option value="score_edit">Score Edit</option>
          <option value="score_import">Score Import</option>
          <option value="role_change">Role Change</option>
        </select>
      </div>

      {entries === undefined && <p className="text-oche-300">Loading…</p>}

      {entries !== undefined && entries.length === 0 && (
        <p className="text-oche-400">No audit log entries found.</p>
      )}

      {entries !== undefined && entries.length > 0 && (
        <div className="space-y-3">
          {entries.map((entry) => (
            <div
              key={entry._id}
              className="bg-oche-800 border border-oche-700 rounded-lg p-4"
            >
              <div className="flex items-center gap-3 mb-2">
                <span className="inline-block px-2 py-0.5 rounded text-xs font-medium bg-oche-700 text-oche-200">
                  {ACTION_LABELS[entry.action]}
                </span>
                <span className="text-sm text-white font-medium">{entry.userName}</span>
                <span className="text-xs text-oche-400 ml-auto">
                  {new Date(entry.createdAt).toLocaleString()}
                </span>
              </div>
              <p className="text-oche-300 text-sm">{entry.details}</p>
              {(entry.oldValue || entry.newValue) && (
                <div className="mt-2 text-xs text-oche-400">
                  <span className="text-red-400">{entry.oldValue}</span>
                  {" → "}
                  <span className="text-green-400">{entry.newValue}</span>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
