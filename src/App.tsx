// ABOUTME: Root application component
// ABOUTME: Renders the main app shell with Convex provider
import { ConvexProvider, ConvexReactClient } from "convex/react";
import { LandingPage } from "./LandingPage";

const convex = new ConvexReactClient(
  import.meta.env.VITE_CONVEX_URL ?? "https://placeholder.convex.cloud",
);

function App() {
  return (
    <ConvexProvider client={convex}>
      <LandingPage />
    </ConvexProvider>
  );
}

export default App;
