import { DigitalTwin } from "@/components/digital-twin";
import { ProtectedRoute } from "@/components/protected-route";

export default function DashboardPage() {
  return (
    <ProtectedRoute>
      <main className="mx-auto max-w-6xl px-6 py-10">
        <DigitalTwin />
      </main>
    </ProtectedRoute>
  );
}
