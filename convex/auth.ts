// ABOUTME: Convex auth configuration with email/password and Google OAuth providers
// ABOUTME: Exports auth functions for use in queries, mutations, and HTTP routes
import Google from "@auth/core/providers/google";
import { Password } from "@convex-dev/auth/providers/Password";
import { convexAuth } from "@convex-dev/auth/server";

export const { auth, signIn, signOut, store } = convexAuth({
  providers: [
    Password({
      profile(params, _ctx) {
        const result: Record<string, string> = {
          email: params.email as string,
        };
        if (params.name) {
          result.name = params.name as string;
        }
        return result as any;
      },
    }),
    Google,
  ],
});
