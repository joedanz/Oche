// ABOUTME: Inline upgrade prompt shown when users hit plan limits or try gated features.
// ABOUTME: Provides a CTA linking to the billing page with plan comparison.

import { Link } from "react-router-dom";

interface UpgradePromptProps {
  message: string;
}

export function UpgradePrompt({ message }: UpgradePromptProps) {
  return (
    <div className="rounded-lg border border-amber-600/30 bg-amber-900/20 px-4 py-3">
      <p className="text-sm text-amber-300">{message}</p>
      <Link
        to="/billing"
        className="mt-2 inline-block rounded-md bg-amber-600 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-amber-500"
      >
        View Plans
      </Link>
    </div>
  );
}
