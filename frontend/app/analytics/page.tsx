"use client";

import { AnalyticsWorkspace } from "@/components/analytics-workspace";
import { ProtectedRoute } from "@/components/protected-route";

export default function AnalyticsPage() {
  return (
    <ProtectedRoute>
      <main className="mx-auto max-w-6xl px-6 pt-12 pb-24">
        <AnalyticsWorkspace />
      </main>
    </ProtectedRoute>
  );
}
