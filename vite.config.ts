// ABOUTME: Vite configuration with React and Tailwind CSS plugins
// ABOUTME: Entry point for the build system
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
});
