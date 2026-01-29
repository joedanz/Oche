// ABOUTME: Root application component
// ABOUTME: Renders the main app shell with Convex provider
import { ConvexProvider, ConvexReactClient } from "convex/react";

const convex = new ConvexReactClient(
  import.meta.env.VITE_CONVEX_URL ?? "https://placeholder.convex.cloud",
);

function App() {
  return (
    <ConvexProvider client={convex}>
      <main className="flex min-h-screen items-center justify-center">
        <h1 className="text-3xl font-bold">Oche</h1>
      </main>
    </ConvexProvider>
  );
}

export default App;
