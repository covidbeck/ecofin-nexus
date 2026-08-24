import { ProtectedRoute } from "@/components/protected-route";
import { SubscriptionMatrix } from "@/components/subscription-matrix";

export default function SubscriptionPage() {
  return (
    <ProtectedRoute>
      <main className="mx-auto max-w-6xl px-6 py-10">
        <SubscriptionMatrix />
      </main>
    </ProtectedRoute>
  );
}
