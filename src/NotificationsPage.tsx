// ABOUTME: In-app notification center for league events.
// ABOUTME: Displays notifications with read/unread status and per-category preference toggles.

import { useQuery, useMutation } from "convex/react";
import { api } from "../convex/_generated/api";
import type { Id } from "../convex/_generated/dataModel";

interface NotificationsPageProps {
  leagueId: Id<"leagues">;
}

const CATEGORY_LABELS: Record<string, string> = {
  match_schedule: "Schedule",
  score_deadline: "Score Deadline",
  roster_change: "Roster Change",
};

export function NotificationsPage({ leagueId }: NotificationsPageProps) {
  const notifications = useQuery(api.notifications.getNotifications, {
    leagueId,
  });
  const preferences = useQuery(api.notifications.getPreferences, { leagueId });
  const markRead = useMutation(api.notifications.markRead);
  const updatePreferences = useMutation(api.notifications.updatePreferences);

  if (notifications === undefined) {
    return <p className="text-oche-400">Loading…</p>;
  }

  function formatTime(ts: number) {
    const d = new Date(ts);
    return d.toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  }

  return (
    <div className="space-y-8">
      <h2 className="text-2xl font-bold text-oche-100">Notifications</h2>

      {/* Notification List */}
      <div className="space-y-2">
        {notifications.length === 0 ? (
          <p className="text-oche-400">No notifications yet.</p>
        ) : (
          notifications.map((n: any) => (
            <div
              key={n._id}
              data-unread={!n.isRead ? "true" : "false"}
              className={`rounded-lg border p-4 ${
                !n.isRead
                  ? "border-sky-500/30 bg-sky-500/5"
                  : "border-oche-700 bg-oche-800/50"
              }`}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <div className="mb-1 flex items-center gap-2">
                    <span className="inline-block rounded bg-oche-700 px-2 py-0.5 text-xs text-oche-300">
                      {CATEGORY_LABELS[n.category] ?? n.category}
                    </span>
                    {!n.isRead && (
                      <span className="inline-block h-2 w-2 rounded-full bg-sky-400" />
                    )}
                  </div>
                  <p className="font-semibold text-oche-100">{n.title}</p>
                  <p className="text-sm text-oche-400">{n.message}</p>
                  <p className="mt-1 text-xs text-oche-500">
                    {formatTime(n.createdAt)}
                  </p>
                </div>
                <button
                  onClick={() =>
                    markRead({
                      notificationId: n._id as Id<"notifications">,
                      isRead: !n.isRead,
                    })
                  }
                  className="shrink-0 rounded border border-oche-600 px-3 py-1 text-xs text-oche-300 hover:bg-oche-700"
                >
                  {n.isRead ? "Mark as Unread" : "Mark as Read"}
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Preferences */}
      {preferences && (
        <div className="rounded-lg border border-oche-700 bg-oche-800/50 p-6">
          <h3 className="mb-4 text-lg font-semibold text-oche-100">
            Notification Preferences
          </h3>
          <div className="space-y-3">
            <label className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={preferences.matchSchedule}
                onChange={() =>
                  updatePreferences({
                    leagueId,
                    matchSchedule: !preferences.matchSchedule,
                    scoreDeadline: preferences.scoreDeadline,
                    rosterChange: preferences.rosterChange,
                  })
                }
                className="h-4 w-4 rounded border-oche-600"
                aria-label="Match schedule"
              />
              <span className="text-oche-200">Upcoming matches</span>
            </label>
            <label className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={preferences.scoreDeadline}
                onChange={() =>
                  updatePreferences({
                    leagueId,
                    matchSchedule: preferences.matchSchedule,
                    scoreDeadline: !preferences.scoreDeadline,
                    rosterChange: preferences.rosterChange,
                  })
                }
                className="h-4 w-4 rounded border-oche-600"
                aria-label="Score deadline"
              />
              <span className="text-oche-200">Score submission deadlines</span>
            </label>
            <label className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={preferences.rosterChange}
                onChange={() =>
                  updatePreferences({
                    leagueId,
                    matchSchedule: preferences.matchSchedule,
                    scoreDeadline: preferences.scoreDeadline,
                    rosterChange: !preferences.rosterChange,
                  })
                }
                className="h-4 w-4 rounded border-oche-600"
                aria-label="Roster change"
              />
              <span className="text-oche-200">Roster changes</span>
            </label>
          </div>
        </div>
      )}
    </div>
  );
}
