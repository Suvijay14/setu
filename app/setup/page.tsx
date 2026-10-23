"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  FAMILY_PHONE_STORAGE_KEY,
  normalizeFamilyPhone,
} from "@/lib/dashboardClient";
import type { Patient } from "@/lib/patient";

const inputClassName =
  "mt-2 w-full rounded-lg border border-zinc-700 bg-zinc-900 px-4 py-3 text-zinc-100 placeholder:text-zinc-600 focus:border-emerald-600 focus:outline-none focus:ring-1 focus:ring-emerald-600";

const labelClassName =
  "text-xs font-medium uppercase tracking-wide text-zinc-500";

function formatReminderTimeDisplay(time24: string): string {
  const [hourStr, minuteStr] = time24.split(":");
  const hour = Number(hourStr);
  const minute = minuteStr ?? "00";
  if (Number.isNaN(hour)) return time24;

  const period = hour >= 12 ? "PM" : "AM";
  const hour12 = hour % 12 || 12;
  return `${hour12}:${minute} ${period} IST`;
}

export default function SetupPage() {
  const [parentName, setParentName] = useState("");
  const [parentPhone, setParentPhone] = useState("");
  const [medications, setMedications] = useState("");
  const [reminderTime, setReminderTime] = useState("21:00");
  const [location, setLocation] = useState("");
  const [familyPhone, setFamilyPhone] = useState("");
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [savedPatient, setSavedPatient] = useState<Patient | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem(FAMILY_PHONE_STORAGE_KEY);
    if (stored) {
      setFamilyPhone(stored);
    }
  }, []);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSubmitError(null);
    setSubmitting(true);

    const normalizedParent = normalizeFamilyPhone(parentPhone);
    const normalizedFamily = normalizeFamilyPhone(familyPhone);

    if (!normalizedParent || !normalizedFamily) {
      setSubmitError("Enter valid phone numbers as +91XXXXXXXXXX");
      setSubmitting(false);
      return;
    }

    try {
      const response = await fetch("/api/setup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          parent_name: parentName.trim(),
          parent_phone: normalizedParent,
          medications,
          reminder_time: reminderTime,
          location: location.trim(),
          family_phone: normalizedFamily,
        }),
      });

      const body = (await response.json()) as {
        success?: boolean;
        patient?: Patient;
        error?: string;
      };

      if (!response.ok || !body.success || !body.patient) {
        setSubmitError(body.error ?? "Something went wrong. Please try again.");
        setSubmitting(false);
        return;
      }

      localStorage.setItem(FAMILY_PHONE_STORAGE_KEY, normalizedFamily);
      setSavedPatient(body.patient);
    } catch {
      setSubmitError("Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  if (savedPatient?.name) {
    const displayTime = savedPatient.reminder_time
      ? formatReminderTimeDisplay(savedPatient.reminder_time)
      : reminderTime;

    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-zinc-950 px-4 text-zinc-100">
        <div className="w-full max-w-lg rounded-xl border border-zinc-800 bg-zinc-900/80 p-8 text-center">
          <p className="text-2xl font-semibold text-white">All set</p>
          <p className="mt-4 text-sm leading-relaxed text-zinc-300">
            Setu is now set up for{" "}
            <span className="font-medium text-white">{savedPatient.name}</span>.
            They will receive their first call at{" "}
            <span className="font-medium text-white">{displayTime}</span>.
          </p>
          <Link
            href="/dashboard"
            className="mt-8 inline-block w-full rounded-lg bg-emerald-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-emerald-500"
          >
            View Dashboard
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 px-4 py-10 text-zinc-100">
      <div className="mx-auto max-w-lg">
        <header className="mb-8 text-center">
          <p className="text-3xl font-semibold tracking-tight text-white">
            Setu
          </p>
          <h1 className="mt-3 text-lg font-medium text-zinc-200">
            Register your parent
          </h1>
          <p className="mt-2 text-sm text-zinc-400">
            Set reminder calls, medicines, and location for Setu voice check-ins.
          </p>
        </header>

        <form
          onSubmit={handleSubmit}
          className="space-y-5 rounded-xl border border-zinc-800 bg-zinc-900/50 p-6"
        >
          <label className="block">
            <span className={labelClassName}>Parent&apos;s name</span>
            <input
              type="text"
              required
              value={parentName}
              onChange={(e) => setParentName(e.target.value)}
              placeholder="Ramesh"
              className={inputClassName}
            />
          </label>

          <label className="block">
            <span className={labelClassName}>Parent&apos;s phone</span>
            <input
              type="tel"
              required
              value={parentPhone}
              onChange={(e) => setParentPhone(e.target.value)}
              placeholder="+919876543210"
              className={inputClassName}
            />
          </label>

          <label className="block">
            <span className={labelClassName}>Medicines they take</span>
            <textarea
              value={medications}
              onChange={(e) => setMedications(e.target.value)}
              placeholder={"BP tablet\nMetformin"}
              rows={4}
              className={`${inputClassName} resize-y`}
            />
            <span className="mt-1 block text-xs text-zinc-500">
              One medicine per line
            </span>
          </label>

          <label className="block">
            <span className={labelClassName}>Reminder time</span>
            <input
              type="time"
              required
              value={reminderTime}
              onChange={(e) => setReminderTime(e.target.value)}
              className={inputClassName}
            />
          </label>

          <label className="block">
            <span className={labelClassName}>Parent&apos;s area / city</span>
            <input
              type="text"
              required
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="Lajpat Nagar Delhi"
              className={inputClassName}
            />
          </label>

          <label className="block">
            <span className={labelClassName}>Family member&apos;s phone</span>
            <input
              type="tel"
              required
              value={familyPhone}
              onChange={(e) => setFamilyPhone(e.target.value)}
              placeholder="+919910036896"
              className={inputClassName}
            />
            <span className="mt-1 block text-xs text-zinc-500">
              Used for dashboard login and alerts
            </span>
          </label>

          {submitError ? (
            <p className="text-sm text-red-400" role="alert">
              {submitError}
            </p>
          ) : null}

          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-lg bg-emerald-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {submitting ? "Saving…" : "Register parent"}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-zinc-500">
          <Link
            href="/dashboard"
            className="text-zinc-400 underline-offset-2 hover:text-zinc-200 hover:underline"
          >
            Back to dashboard login
          </Link>
        </p>
      </div>
    </div>
  );
}
