// ABOUTME: Auth state hook wrapping Convex authentication
// ABOUTME: Provides isAuthenticated and isLoading state for routing
import { useConvexAuth } from "convex/react";

export function useAuth(): { isAuthenticated: boolean; isLoading: boolean } {
  const { isAuthenticated, isLoading } = useConvexAuth();
  return { isAuthenticated, isLoading };
}
