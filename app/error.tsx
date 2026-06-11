"use client";

import { useEffect } from "react";
import { RotateCcw } from "lucide-react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Surface the real error in the console (and any error-reporting tool)
    // instead of letting it crash silently with a minified message.
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center gap-4 p-6 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-[#1e2d40] bg-[#0d1a2d]">
        <span className="text-2xl">⚠️</span>
      </div>
      <div>
        <h2 className="text-lg font-semibold text-white">Something went wrong</h2>
        <p className="mt-1 max-w-sm text-sm text-gray-400">
          This section failed to load. You can retry without losing the rest of
          the dashboard.
        </p>
      </div>
      <button
        onClick={() => reset()}
        className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700"
      >
        <RotateCcw className="h-4 w-4" />
        Try again
      </button>
    </div>
  );
}
