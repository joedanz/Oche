// ABOUTME: HTTP router for Convex, handles auth callback routes
// ABOUTME: Required by @convex-dev/auth for session management
import { httpRouter } from "convex/server";
import { auth } from "./auth";

const http = httpRouter();
auth.addHttpRoutes(http);

export default http;
