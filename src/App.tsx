// ABOUTME: Root application component
// ABOUTME: Renders the main app shell with routing and auth-aware redirects
import { Routes, Route, Navigate } from "react-router-dom";
import { LandingPage } from "./LandingPage";
import { LoginPage } from "./LoginPage";
import { SignupPage } from "./SignupPage";
import { Dashboard } from "./Dashboard";
import { useAuth } from "./useAuth";

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
          isAuthenticated ? <Navigate to="/dashboard" replace /> : <LandingPage />
        }
      />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/signup" element={<SignupPage />} />
      <Route
        path="/dashboard"
        element={
          isAuthenticated ? <Dashboard /> : <Navigate to="/login" replace />
        }
      />
    </Routes>
  );
}

function App() {
  return <AppRoutes />;
}

export default App;
