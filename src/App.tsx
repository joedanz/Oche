// ABOUTME: Root application component
// ABOUTME: Renders the main app shell with routing and auth-aware redirects
import { Routes, Route, Navigate, useParams } from "react-router-dom";
import { useQuery } from "convex/react";
import { api } from "../convex/_generated/api";
import { LandingPage } from "./LandingPage";
import { LoginPage } from "./LoginPage";
import { SignupPage } from "./SignupPage";
import { Dashboard } from "./Dashboard";
import { OnboardingPage } from "./OnboardingPage";
import { MembersPage } from "./MembersPage";
import { InvitationsPage } from "./InvitationsPage";
import { LeagueLayout } from "./LeagueLayout";
import { CreateLeaguePage } from "./CreateLeaguePage";
import { MatchConfigPage } from "./MatchConfigPage";
import { SeasonsPage } from "./SeasonsPage";
import { DivisionsPage } from "./DivisionsPage";
import { TeamsPage } from "./TeamsPage";
import { RosterPage } from "./RosterPage";
import { SchedulePage } from "./SchedulePage";
import { ScheduleGeneratorPage } from "./ScheduleGeneratorPage";
import { useAuth } from "./useAuth";

function AuthenticatedRedirect() {
  const leagues = useQuery(api.onboarding.getUserLeagues);

  if (leagues === undefined) return null;
  if (leagues.length === 0) return <Navigate to="/onboarding" replace />;
  return <Navigate to="/dashboard" replace />;
}

function AppRoutes() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return null;
  }

  return (
    <Routes>
      <Route
        path="/"
        element={
          isAuthenticated ? <AuthenticatedRedirect /> : <LandingPage />
        }
      />
      <Route
        path="/login"
        element={
          isAuthenticated ? <Navigate to="/" replace /> : <LoginPage />
        }
      />
      <Route
        path="/signup"
        element={
          isAuthenticated ? <Navigate to="/" replace /> : <SignupPage />
        }
      />
      <Route
        path="/onboarding"
        element={
          isAuthenticated ? <OnboardingPage /> : <Navigate to="/login" replace />
        }
      />
      <Route
        path="/dashboard"
        element={
          isAuthenticated ? <Dashboard /> : <Navigate to="/login" replace />
        }
      />
      <Route
        path="/create-league"
        element={
          isAuthenticated ? <CreateLeaguePage /> : <Navigate to="/login" replace />
        }
      />
      <Route
        path="/leagues/:leagueId"
        element={
          isAuthenticated ? <LeagueLayout /> : <Navigate to="/login" replace />
        }
      >
        <Route index element={<LeagueHome />} />
        <Route path="members" element={<MembersRoute />} />
        <Route path="invitations" element={<InvitationsRoute />} />
        <Route path="settings" element={<MatchConfigRoute />} />
        <Route path="seasons" element={<SeasonsRoute />} />
        <Route path="divisions" element={<DivisionsRoute />} />
        <Route path="teams" element={<TeamsRoute />} />
        <Route path="teams/:teamId/roster" element={<RosterRoute />} />
        <Route path="schedule" element={<ScheduleRoute />} />
        <Route path="schedule/generate" element={<ScheduleGeneratorRoute />} />
      </Route>
    </Routes>
  );
}

function LeagueHome() {
  return (
    <div className="text-oche-300">
      <p>Select a section from the menu to get started.</p>
    </div>
  );
}

function MembersRoute() {
  const { leagueId } = useParams<{ leagueId: string }>();
  if (!leagueId) return null;
  return <MembersPage leagueId={leagueId as any} />;
}

function InvitationsRoute() {
  const { leagueId } = useParams<{ leagueId: string }>();
  if (!leagueId) return null;
  return <InvitationsPage leagueId={leagueId as any} />;
}

function MatchConfigRoute() {
  const { leagueId } = useParams<{ leagueId: string }>();
  if (!leagueId) return null;
  return <MatchConfigPage leagueId={leagueId as any} />;
}

function SeasonsRoute() {
  const { leagueId } = useParams<{ leagueId: string }>();
  if (!leagueId) return null;
  return <SeasonsPage leagueId={leagueId as any} />;
}

function DivisionsRoute() {
  const { leagueId } = useParams<{ leagueId: string }>();
  if (!leagueId) return null;
  return <DivisionsPage leagueId={leagueId as any} />;
}

function TeamsRoute() {
  const { leagueId } = useParams<{ leagueId: string }>();
  if (!leagueId) return null;
  return <TeamsPage leagueId={leagueId as any} />;
}

function RosterRoute() {
  const { leagueId, teamId } = useParams<{ leagueId: string; teamId: string }>();
  if (!leagueId || !teamId) return null;
  return <RosterPage leagueId={leagueId as any} teamId={teamId as any} />;
}

function ScheduleRoute() {
  const { leagueId } = useParams<{ leagueId: string }>();
  if (!leagueId) return null;
  return <SchedulePage leagueId={leagueId as any} />;
}

function ScheduleGeneratorRoute() {
  const { leagueId } = useParams<{ leagueId: string }>();
  if (!leagueId) return null;
  return <ScheduleGeneratorPage leagueId={leagueId as any} />;
}

function App() {
  return <AppRoutes />;
}

export default App;
