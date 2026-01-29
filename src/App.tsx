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
      <Route path="/login" element={<LoginPage />} />
      <Route path="/signup" element={<SignupPage />} />
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
        path="/leagues/:leagueId"
        element={
          isAuthenticated ? <LeagueLayout /> : <Navigate to="/login" replace />
        }
      >
        <Route index element={<LeagueHome />} />
        <Route path="members" element={<MembersRoute />} />
        <Route path="invitations" element={<InvitationsRoute />} />
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

function App() {
  return <AppRoutes />;
}

export default App;
