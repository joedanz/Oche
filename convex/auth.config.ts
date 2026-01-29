// ABOUTME: Auth provider configuration for JWT token validation
// ABOUTME: Required by Convex to verify tokens issued by @convex-dev/auth
export default {
  providers: [
    {
      domain: process.env.CONVEX_SITE_URL,
      applicationID: "convex",
    },
  ],
};
