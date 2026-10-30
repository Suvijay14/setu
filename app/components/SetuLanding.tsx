import Image from "next/image";
import Link from "next/link";
import CallButton from "./CallButton";

const HERO_IMG = "/images/hero-grandmother-call.jpg";
const FAMILY_IMG = "/images/story-grandfather-chai.jpg";

function Icon({ name, className = "" }: { name: string; className?: string }) {
  return (
    <span className={`material-symbols-outlined ${className}`} aria-hidden>
      {name}
    </span>
  );
}

function StepCard({
  n,
  title,
  body,
}: {
  n: string;
  title: string;
  body: string;
}) {
  return (
    <div className="flex items-start gap-3.5 rounded-xl border border-slate-800 bg-surface-level-1 p-4">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-primary-container/40 bg-surface-level-2 text-sm font-bold text-primary-container">
        {n}
      </div>
      <div>
        <h3 className="mb-1 text-sm font-semibold text-white">{title}</h3>
        <p className="text-xs leading-relaxed text-slate-400">{body}</p>
      </div>
    </div>
  );
}

function FeatureCard({
  emoji,
  title,
  body,
  alert,
}: {
  emoji: string;
  title: string;
  body: string;
  alert?: boolean;
}) {
  return (
    <div
      className={`flex items-start gap-3 rounded-xl border bg-surface-level-1 p-4 ${alert ? "border-alert-coral/40" : "border-slate-800"}`}
    >
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-slate-700 bg-surface-level-2 text-base">
        {emoji}
      </div>
      <div>
        <h3 className="mb-0.5 text-sm font-semibold text-white">{title}</h3>
        <p className="text-xs leading-relaxed text-slate-400">{body}</p>
      </div>
    </div>
  );
}

export default function SetuLanding() {
  return (
    <div className="flex min-h-screen flex-col bg-surface-base text-slate-200 selection:bg-primary-container/30 selection:text-white">
      <header className="fixed inset-x-0 top-0 z-50 border-b border-slate-800/80 bg-surface-base/95 pt-safe shadow-md backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-md items-center justify-between gap-3 px-4 sm:max-w-6xl sm:px-6">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-primary-container to-amber-600 text-sm font-bold text-slate-950 shadow-sm">
              से
            </div>
            <div className="flex flex-col">
              <div className="flex items-baseline gap-1.5">
                <span className="text-base font-bold tracking-tight text-white">
                  Setu
                </span>
                <span className="text-xs font-semibold text-primary-container">
                  (सेतु)
                </span>
              </div>
              <span className="text-[10px] leading-tight text-slate-400">
                NABH-ready voice follow-up for hospitals
              </span>
            </div>
          </div>
          <Link
            href="/org"
            className="rounded-md bg-primary-container px-3.5 py-1.5 text-xs font-semibold tracking-wide text-slate-950 shadow-sm transition active:scale-95 hover:bg-saffron-hover"
          >
            Org Login
          </Link>
        </div>
      </header>

      <main className="relative mx-auto w-full max-w-md flex-1 pb-36 pt-16 sm:max-w-3xl lg:max-w-5xl">
        <section className="flex flex-col items-center px-4 pb-8 pt-6">
          <div className="mb-4 inline-flex items-center gap-1.5 rounded-full border border-slate-700 bg-slate-800/80 px-3 py-1 text-xs font-medium text-slate-300">
            <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-brand" />
            Daily Voice Adherence for Clinics &amp; Hospitals
          </div>
          <h1 className="mb-3 text-center text-[30px] font-bold leading-[1.2] tracking-tight text-white">
            Your patients called.{" "}
            <span className="text-primary-container">Setu verified.</span>
          </h1>
          <p className="mb-6 px-1 text-center text-sm leading-relaxed text-slate-300">
            AI-powered Hindi voice care for Indian hospitals. Patients call in.
            Discharged patients get called back. Zero extra staff.
          </p>
          <div className="mb-5 flex w-full flex-col gap-2.5">
            <Link
              href="/org"
              className="flex min-h-[48px] w-full items-center justify-center gap-2 rounded-lg bg-primary-container text-sm font-bold text-slate-950 shadow-md transition active:scale-[0.98] hover:bg-saffron-hover"
            >
              <Icon name="domain" className="text-[19px]" />
              Request a Clinic Pilot
            </Link>
            <a
              href="#live-demo"
              className="flex min-h-[46px] w-full items-center justify-center gap-2 rounded-lg border border-slate-700 bg-transparent text-sm font-medium text-white transition hover:bg-slate-800/60 active:scale-[0.98]"
            >
              <Icon name="phone_in_talk" className="text-[18px] text-primary-container" />
              Try a Live Call
            </a>
          </div>
          <div className="mb-6 w-full rounded-lg border border-slate-800 bg-surface-level-1 px-3 py-2.5 text-center">
            <p className="text-[11px] leading-snug text-slate-400">
              Built on Bolna AI · Sarvam Hindi Voice · India Routing · No app for
              patients
            </p>
          </div>
          <div className="relative w-full overflow-hidden rounded-2xl border border-slate-800 bg-surface-level-1 shadow-2xl">
            <Image
              src={HERO_IMG}
              alt="Smiling Indian grandmother on a landline call at home"
              width={1920}
              height={1080}
              className="aspect-video w-full rounded-xl object-cover object-center"
              priority
            />
            <div className="absolute inset-0 bg-gradient-to-t from-surface-base via-transparent to-transparent opacity-90" />
            <div className="absolute inset-x-3 bottom-3 flex items-center gap-2 rounded-xl border border-slate-700/80 bg-surface-level-1/95 px-3 py-1.5 backdrop-blur-md">
              <span className="h-2 w-2 rounded-full bg-emerald-brand" />
              <span className="text-xs font-semibold text-slate-200">
                94.2% Medication Verified · Hindi Voice Check-in
              </span>
            </div>
          </div>
        </section>

        <section className="border-y border-slate-800/80 bg-surface-level-1 px-4 py-8">
          <div className="mb-5 text-center">
            <h2 className="text-xl font-bold tracking-tight text-white">
              The follow-up gap costs lives
            </h2>
            <p className="mt-1 text-xs text-slate-400">
              Post-discharge care falls off once patients leave the facility.
            </p>
          </div>
          <div className="mb-4 flex flex-col gap-3">
            {[
              {
                stat: "149M",
                title: "Elderly Indians with Chronic Conditions",
                body: "Require daily medication oversight to avoid emergency readmissions.",
              },
              {
                stat: "51%",
                title: "Average Medication Adherence",
                body: "Among chronic-disease patients in India (WHO-SAGE2 India).",
                coral: true,
              },
            ].map((item) => (
              <div
                key={item.title}
                className="flex items-start gap-3.5 rounded-xl border border-slate-800 bg-surface-level-2 p-4"
              >
                <div
                  className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-lg border text-lg font-bold ${item.coral ? "border-alert-coral/30 bg-rose-500/10 text-alert-coral" : "border-primary-container/30 bg-amber-500/10 text-primary-container"}`}
                >
                  {item.stat}
                </div>
                <div>
                  <div className="mb-0.5 text-xs font-semibold text-white">
                    {item.title}
                  </div>
                  <p className="text-xs leading-snug text-slate-400">{item.body}</p>
                </div>
              </div>
            ))}
          </div>
          <p className="rounded-lg border border-slate-800 bg-surface-base p-3 text-center text-xs font-medium text-slate-300">
            <span className="font-semibold text-primary-container">
              Setu costs a fraction of nurse follow-up.
            </span>{" "}
            And it never misses a call.
          </p>
        </section>

        <section className="px-4 py-8">
          <div className="mb-6 text-center">
            <span className="text-xs font-semibold uppercase tracking-wider text-primary-container">
              Clinical Workflow
            </span>
            <h2 className="mt-1 text-xl font-bold tracking-tight text-white">
              How It Works for Clinics
            </h2>
          </div>
          <div className="flex flex-col gap-3">
            <StepCard
              n="1"
              title="Upload your patient list"
              body="CSV upload with name, phone, medicine schedule, and cohort protocol."
            />
            <StepCard
              n="2"
              title="Pick a care protocol"
              body="Post-discharge, hypertension, diabetes, or custom clinic protocols."
            />
            <StepCard
              n="3"
              title="Setu calls every patient daily"
              body="Natural Hindi on any mobile or landline. Asks about medicine and listens for distress."
            />
            <StepCard
              n="4"
              title="You see outcomes, not transcripts"
              body="Org dashboard: adherence, missed calls, escalations, and mood trends."
            />
          </div>
          <Link
            href="/org"
            className="mt-5 flex min-h-[44px] w-full items-center justify-center gap-2 rounded-lg border border-primary-container/40 bg-primary-container/10 text-sm font-semibold text-primary-container transition hover:bg-primary-container/20"
          >
            Open Organization Portal
            <Icon name="arrow_forward" className="text-[18px]" />
          </Link>
        </section>

        <section
          id="live-demo"
          className="border-y border-slate-800/80 bg-surface-level-1 px-4 py-8"
        >
          <div className="flex flex-col items-center rounded-2xl border border-slate-700 bg-surface-level-2 p-5 text-center shadow-xl">
            <span className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-primary-container">
              Interactive Clinical Demo
            </span>
            <h2 className="mb-1 text-lg font-bold text-white">
              Hear what your patients will hear
            </h2>
            <p className="mb-5 text-xs leading-relaxed text-slate-400">
              Speak to Setu in Hindi. Say you forgot your BP tablet or feel
              unwell.
            </p>
            <CallButton variant="warm" agentType="b2c" />
            <p className="mt-4 max-w-xs text-xs italic text-slate-400">
              Pretend you&apos;re a 72-year-old patient who forgot their morning
              medicine
            </p>
            <div className="mt-4 w-full rounded-lg border border-emerald-brand/30 bg-emerald-brand/10 p-2.5 text-left">
              <div className="flex items-center gap-2">
                <Icon name="verified" className="text-[18px] text-emerald-brand" />
                <span className="text-xs font-semibold text-emerald-300">
                  Logged in clinic telemetry:
                </span>
              </div>
              <span className="mt-1 block font-mono text-[11px] text-emerald-200">
                Amlodipine 5mg verified taken
              </span>
            </div>
          </div>
        </section>

        <section className="px-4 py-8">
          <div className="mb-6 text-center">
            <span className="text-xs font-semibold uppercase tracking-wider text-primary-container">
              Clinical Intelligence
            </span>
            <h2 className="mt-1 text-xl font-bold text-white">What Setu Detects</h2>
          </div>
          <div className="grid grid-cols-1 gap-3">
            <FeatureCard
              emoji="💊"
              title="Medication Verified"
              body="Confirms specific pills taken. Logs yes/no/unclear into patient records."
            />
            <FeatureCard
              emoji="🚨"
              title="Distress Escalation"
              body="Chest pain, falls, breathlessness — SMS alert to family and clinic triage."
              alert
            />
            <FeatureCard
              emoji="📍"
              title="Nearby Care Search"
              body="Hospital or pharmacy lookup by voice without internet on the patient's phone."
            />
            <FeatureCard
              emoji="🧠"
              title="Call Memory"
              body="Remembers yesterday's conversation and references it on the next call."
            />
            <FeatureCard
              emoji="📋"
              title="Instant Appointment Booking via Call"
              body="Patients call your clinic line in Hindi; symptoms and preferred time land in your org dashboard."
            />
          </div>
        </section>

        <section className="border-y border-slate-800/80 bg-surface-level-1 px-4 py-8">
          <div className="mb-6 text-center">
            <span className="text-xs font-semibold uppercase tracking-wider text-primary-container">
              Two-way voice care
            </span>
            <h2 className="mt-1 text-xl font-bold tracking-tight text-white">
              Inbound + outbound on one platform
            </h2>
          </div>
          <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
            <div className="rounded-xl border border-slate-800 bg-surface-level-2 p-5">
              <h3 className="mb-2 text-sm font-semibold text-white">
                Patients Call In
              </h3>
              <p className="text-xs leading-relaxed text-slate-400">
                Patients call +91-8064-262082, describe symptoms in Hindi, and
                get an appointment logged instantly.
              </p>
            </div>
            <div className="rounded-xl border border-slate-800 bg-surface-level-2 p-5">
              <h3 className="mb-2 text-sm font-semibold text-white">
                You Call Them Back
              </h3>
              <p className="text-xs leading-relaxed text-slate-400">
                Discharged patients receive automated Hindi follow-up calls.
                Missed doses and distress get flagged to your team immediately.
              </p>
            </div>
          </div>
          <p className="mt-5 text-center text-xs font-medium text-slate-400">
            Handling inbound appointments + post-discharge follow-up for pilot
            clinics in Delhi NCR · Oct 2026
          </p>
        </section>

        <section className="px-4 py-8">
          <div className="mb-5 text-center">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Secondary Buyer
            </span>
            <h2 className="mt-1 text-xl font-bold text-white">
              Also built for families
            </h2>
          </div>
          <div className="relative mb-5 overflow-hidden rounded-2xl border border-slate-800 shadow-lg">
            <Image
              src={FAMILY_IMG}
              alt="Indian grandfather at morning chai, answering a Setu check-in call"
              width={1920}
              height={1080}
              className="aspect-video w-full object-cover object-center"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-surface-base via-transparent to-transparent opacity-80" />
          </div>
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between gap-3 rounded-xl border border-slate-800 bg-surface-level-1 p-4">
              <div>
                <h3 className="text-sm font-semibold text-white">
                  Set up in 2 minutes
                </h3>
                <p className="text-xs text-slate-400">Medicines, timings &amp; area.</p>
              </div>
              <Link
                href="/setup"
                className="shrink-0 rounded-lg border border-slate-700 bg-slate-800 px-3.5 py-2 text-xs font-semibold text-slate-100 transition hover:bg-slate-700"
              >
                Set Up →
              </Link>
            </div>
            <div className="flex items-center justify-between gap-3 rounded-xl border border-slate-800 bg-surface-level-1 p-4">
              <div>
                <h3 className="text-sm font-semibold text-white">
                  Daily peace of mind
                </h3>
                <p className="text-xs text-slate-400">Family caregiver dashboard.</p>
              </div>
              <Link
                href="/dashboard"
                className="shrink-0 rounded-lg border border-slate-700 bg-slate-800 px-3.5 py-2 text-xs font-semibold text-slate-100 transition hover:bg-slate-700"
              >
                Dashboard →
              </Link>
            </div>
          </div>
        </section>

        <section className="px-4 py-8">
          <div className="rounded-2xl bg-gradient-to-br from-primary-container to-amber-600 p-6 text-center text-slate-950 shadow-2xl">
            <h2 className="mb-2 text-xl font-extrabold tracking-tight">
              Run a pilot with your clinic
            </h2>
            <p className="mb-5 text-xs font-medium leading-relaxed text-slate-950/90">
              30-day chronic-care pilot. No EHR integration required. CSV upload
              onboarding in one day.
            </p>
            <Link
              href="/org"
              className="mb-3 flex min-h-[46px] w-full items-center justify-center gap-2 rounded-lg bg-slate-950 text-sm font-bold text-white shadow-lg transition hover:bg-slate-900 active:scale-[0.98]"
            >
              Request Pilot Access
              <Icon name="arrow_forward" className="text-[18px]" />
            </Link>
          </div>
        </section>

        <footer className="flex flex-col items-center border-t border-slate-800/80 bg-surface-base px-4 pb-12 pt-6 text-center">
          <div className="mb-4 flex flex-wrap items-center justify-center gap-2.5 text-xs text-slate-400">
            <a href="#live-demo" className="transition hover:text-white">
              Try Live
            </a>
            <span>·</span>
            <Link href="/setup" className="transition hover:text-white">
              Setup
            </Link>
            <span>·</span>
            <Link href="/dashboard" className="transition hover:text-white">
              Family Dashboard
            </Link>
            <span>·</span>
            <Link href="/org" className="transition hover:text-white">
              Org Login
            </Link>
          </div>
          <div className="max-w-xs rounded-lg border border-slate-800 bg-surface-level-1 px-3 py-2 text-[11px] text-slate-400">
            <span className="font-semibold text-slate-300">
              Bolna AI Buildathon 2026
            </span>
            <br />
            Clinical telemetry assistant. Not a substitute for emergency dispatch.
          </div>
        </footer>
      </main>

      <aside className="fixed inset-x-0 bottom-0 z-50 border-t border-slate-800 bg-surface-base/95 pb-safe shadow-2xl backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-md items-center justify-between gap-2.5 px-4 sm:max-w-3xl">
          <Link
            href="/org"
            className="flex min-h-[44px] flex-1 items-center justify-center gap-1.5 rounded-lg bg-primary-container text-xs font-bold text-slate-950 shadow-md transition active:scale-[0.98] hover:bg-saffron-hover"
          >
            <Icon name="domain" className="text-[17px]" />
            Clinic Pilot
          </Link>
          <a
            href="#live-demo"
            className="flex min-h-[44px] shrink-0 items-center justify-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800 px-4 text-xs font-medium text-white transition hover:bg-slate-700 active:scale-[0.98]"
          >
            <Icon name="phone_in_talk" className="text-[17px] text-primary-container" />
            Try Call
          </a>
        </div>
      </aside>
    </div>
  );
}
