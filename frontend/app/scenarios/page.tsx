import { ProtectedRoute } from "@/components/protected-route";
import { ScenarioSimulator } from "@/components/scenario-simulator";

export default function ScenariosPage() {
  return (
    <ProtectedRoute>
      <main className="mx-auto max-w-6xl px-6 py-10">
        <ScenarioSimulator />
      </main>
    </ProtectedRoute>
  );
}
