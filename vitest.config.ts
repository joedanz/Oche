// ABOUTME: Vitest configuration for unit and component tests
// ABOUTME: Uses jsdom for DOM simulation
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    setupFiles: ["./src/test-setup.ts"],
  },
});
