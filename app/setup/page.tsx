"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  FAMILY_PHONE_STORAGE_KEY,
  normalizeFamilyPhone,
} from "@/lib/dashboardClient";
import type { Patient } from "@/lib/patient";
import { wp } from "@/lib/warmPortalClasses";

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
      <div className={wp.pageCenter}>
        <div className={`w-full max-w-lg p-8 text-center ${wp.card}`}>
          <p className="font-display text-2xl font-semibold text-warm-ink">
            All set
          </p>
          <p className={`mt-4 ${wp.subtitle}`}>
            Setu is now set up for{" "}
            <span className="font-medium text-warm-ink">{savedPatient.name}</span>
            . They will receive their first call at{" "}
            <span className="font-medium text-warm-primary">{displayTime}</span>.
          </p>
          <Link href="/dashboard" className={`mt-8 inline-block w-full ${wp.btnPrimary}`}>
            View Dashboard
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className={wp.page}>
      <div className="mx-auto max-w-lg px-4 py-10">
        <header className="mb-8 text-center">
          <p className={wp.brand}>Setu | सेतु</p>
          <h1 className="mt-3 font-display text-xl font-semibold text-warm-ink">
            Register your parent
          </h1>
          <p className={`mt-2 ${wp.subtitle}`}>
            Set reminder calls, medicines, and location for Setu voice check-ins.
          </p>
        </header>

        <form onSubmit={handleSubmit} className={`space-y-5 p-6 ${wp.card}`}>
          <label className="block">
            <span className={wp.label}>Parent&apos;s name</span>
            <input
              type="text"
              required
              value={parentName}
              onChange={(e) => setParentName(e.target.value)}
              placeholder="Ramesh"
              className={wp.input}
            />
          </label>

          <label className="block">
            <span className={wp.label}>Parent&apos;s phone</span>
            <input
              type="tel"
              required
              value={parentPhone}
              onChange={(e) => setParentPhone(e.target.value)}
              placeholder="+919876543210"
              className={wp.input}
            />
          </label>

          <label className="block">
            <span className={wp.label}>Medicines they take</span>
            <textarea
              value={medications}
              onChange={(e) => setMedications(e.target.value)}
              placeholder={"BP tablet\nMetformin"}
              rows={4}
              className={`${wp.input} resize-y`}
            />
            <span className="mt-1 block text-xs text-warm-ink-muted">
              One medicine per line
            </span>
          </label>

          <label className="block">
            <span className={wp.label}>Reminder time</span>
            <input
              type="time"
              required
              value={reminderTime}
              onChange={(e) => setReminderTime(e.target.value)}
              className={wp.input}
            />
          </label>

          <label className="block">
            <span className={wp.label}>Parent&apos;s area / city</span>
            <input
              type="text"
              required
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="Lajpat Nagar Delhi"
              className={wp.input}
            />
          </label>

          <label className="block">
            <span className={wp.label}>Family member&apos;s phone</span>
            <input
              type="tel"
              required
              value={familyPhone}
              onChange={(e) => setFamilyPhone(e.target.value)}
              placeholder="+919910036896"
              className={wp.input}
            />
            <span className="mt-1 block text-xs text-warm-ink-muted">
              Used for dashboard login and alerts
            </span>
          </label>

          {submitError ? (
            <p className={wp.error} role="alert">
              {submitError}
            </p>
          ) : null}

          <button
            type="submit"
            disabled={submitting}
            className={`w-full ${wp.btnPrimary}`}
          >
            {submitting ? "Saving…" : "Register parent"}
          </button>
        </form>

        <p className="mt-6 flex flex-col items-center gap-2 text-center text-sm">
          <Link href="/dashboard" className={wp.linkMuted}>
            Back to dashboard login
          </Link>
          <Link href="/" className={wp.linkMuted}>
            Setu home
          </Link>
          <Link href="/org" className={wp.linkMuted}>
            Clinic / org portal
          </Link>
        </p>
      </div>
    </div>
  );
}
