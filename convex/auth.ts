// ABOUTME: Convex auth configuration with email/password provider
// ABOUTME: Exports auth functions for use in queries, mutations, and HTTP routes
import { Password } from "@convex-dev/auth/providers/Password";
import { convexAuth } from "@convex-dev/auth/server";

export const { auth, signIn, signOut, store } = convexAuth({
  providers: [Password],
});
