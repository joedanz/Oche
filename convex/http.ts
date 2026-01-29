// ABOUTME: HTTP router for Convex, handles auth callback and Stripe webhook routes.
// ABOUTME: Required by @convex-dev/auth for session management and Stripe payment processing.
import { httpRouter } from "convex/server";
import { auth } from "./auth";
import { stripeWebhook } from "./stripe";

const http = httpRouter();
auth.addHttpRoutes(http);

http.route({
  path: "/stripe/webhook",
  method: "POST",
  handler: stripeWebhook,
});

export default http;
