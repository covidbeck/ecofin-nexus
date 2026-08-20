"use client";

import { CompanyProfile } from "@/components/company-profile";
import { ProtectedRoute } from "@/components/protected-route";

export default function ProfilePage() {
  return (
    <ProtectedRoute>
      <main className="mx-auto max-w-6xl px-6 pt-12 pb-24">
        <p className="text-xs font-semibold tracking-wide text-emerald-700 uppercase">
          Профиль компании
        </p>
        <div className="mt-6">
          <CompanyProfile />
        </div>
      </main>
    </ProtectedRoute>
  );
}
