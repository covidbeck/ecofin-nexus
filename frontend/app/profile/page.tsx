import { CompanyProfile } from "@/components/company-profile";

export default function ProfilePage() {
  return (
    <main className="mx-auto max-w-6xl px-6 pt-14 pb-24">
      <p className="text-[11px] font-medium tracking-[0.18em] text-accent-400 uppercase">
        Профиль компании
      </p>
      <div className="mt-6">
        <CompanyProfile />
      </div>
    </main>
  );
}
