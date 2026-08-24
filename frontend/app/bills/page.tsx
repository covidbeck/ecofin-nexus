import { BillsManager } from "@/components/bills-manager";
import { ProtectedRoute } from "@/components/protected-route";

export default function BillsPage() {
  return (
    <ProtectedRoute>
      <main className="mx-auto max-w-6xl px-6 py-10">
        <BillsManager />
      </main>
    </ProtectedRoute>
  );
}
