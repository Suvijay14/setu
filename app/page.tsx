"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import RoiCalculator from "./components/RoiCalculator";
import SetuLanding from "./components/SetuLanding";

type UserType = "family" | "hospital";

const STORAGE_KEY = "setu_user_type";

export default function Home() {
  const router = useRouter();
  const [userType, setUserType] = useState<UserType | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === "family" || saved === "hospital") {
      setUserType(saved);
    }
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready || !userType) return;
    if (userType === "family") {
      router.replace("/dashboard");
    } else if (userType === "hospital") {
      router.replace("/org");
    }
  }, [userType, ready, router]);

  const chooseFamily = () => {
    localStorage.setItem(STORAGE_KEY, "family");
    setUserType("family");
  };

  const chooseHospital = () => {
    localStorage.setItem(STORAGE_KEY, "hospital");
    setUserType("hospital");
  };

  const switchAccountType = () => {
    localStorage.removeItem(STORAGE_KEY);
    setUserType(null);
  };

  if (!ready) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-surface-base text-slate-400">
        Loading…
      </div>
    );
  }

  if (userType === "family" || userType === "hospital") {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-surface-base text-slate-300">
        <p className="text-sm">Redirecting to your dashboard…</p>
        <button
          type="button"
          onClick={switchAccountType}
          className="text-xs text-slate-500 underline-offset-2 hover:text-primary-container hover:underline"
        >
          Switch account type
        </button>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-surface-base">
      <section className="border-b border-slate-800/80 bg-[#0A0F1E] px-4 pb-8 pt-24 text-center">
        <h1 className="mx-auto max-w-lg text-2xl font-bold leading-tight tracking-tight text-white sm:text-3xl">
          Setu — AI Voice Follow-Up for Indian Healthcare
        </h1>
        <p className="mx-auto mt-3 max-w-xl text-sm leading-relaxed text-slate-300 sm:text-base">
          AI-powered Hindi voice follow-up for Indian hospitals. Reduce
          readmissions. Stay NABH compliant. Zero extra staff.
        </p>
        <div className="mx-auto mt-5 flex max-w-2xl flex-wrap items-center justify-center gap-2">
          {[
            "📞 Automated Hindi Calls",
            "🏥 NABH Audit Trail",
            "📊 Readmission Risk Tracking",
          ].map((label) => (
            <span
              key={label}
              className="rounded-full border border-slate-700 bg-surface-level-1 px-3 py-1.5 text-xs font-medium text-slate-200"
            >
              {label}
            </span>
          ))}
        </div>
        <p className="mx-auto mt-4 text-xs text-slate-500">
          Piloting with 3 hospitals in Delhi NCR · Oct 2026
        </p>
        <RoiCalculator />
        <p className="mx-auto mt-4 max-w-xl px-2 text-xs leading-relaxed text-slate-500">
          Trusted for compliance: All calls logged with timestamp, medication
          adherence tracked, and exportable for NABH audit.
        </p>
        <div className="mx-auto mt-8 flex max-w-md flex-col gap-3 sm:flex-row sm:justify-center">
          <button
            type="button"
            onClick={chooseFamily}
            className="min-h-[52px] flex-1 rounded-xl border border-slate-700 bg-[#0A0F1E] px-5 py-3 text-sm font-semibold text-white shadow-md transition hover:bg-slate-900 active:scale-[0.98]"
          >
            👨‍👩‍👧 Family Login
          </button>
          <button
            type="button"
            onClick={chooseHospital}
            className="min-h-[52px] flex-1 rounded-xl border border-amber-300/40 bg-gradient-to-r from-amber-500 to-orange-500 px-5 py-3 text-sm font-semibold text-slate-950 shadow-md transition hover:brightness-105 active:scale-[0.98]"
          >
            🏥 Hospital Login
          </button>
        </div>
      </section>

      <SetuLanding />

      <div className="border-t border-slate-800/80 bg-surface-base py-6 text-center">
        <button
          type="button"
          onClick={switchAccountType}
          className="text-xs text-slate-500 underline-offset-2 hover:text-primary-container hover:underline"
        >
          Switch account type
        </button>
      </div>
    </div>
  );
}
