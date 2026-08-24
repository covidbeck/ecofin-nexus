import { CompanyProfile } from "@/components/company-profile";
import { ProtectedRoute } from "@/components/protected-route";

export default function ProfilePage() {
  return (
    <ProtectedRoute>
      <main className="mx-auto max-w-6xl px-6 py-10">
        <CompanyProfile />
      </main>
    </ProtectedRoute>
  );
}
