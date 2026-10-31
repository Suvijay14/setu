"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import CallButton from "./CallButton";
import RoiCalculator from "./RoiCalculator";
import { setSetuUserType } from "@/lib/setuSession";

const HERO_IMG = "/images/hero-grandmother-call.jpg";
const FAMILY_IMG = "/images/story-grandfather-chai.jpg";
const FOUNDER_PHOTO = "/nanaji.jpg";
const INBOUND_LINE = "+91-8064-262082";

function Icon({ name, className = "" }: { name: string; className?: string }) {
  return (
    <span className={`material-symbols-outlined ${className}`} aria-hidden>
      {name}
    </span>
  );
}

function WarmFeature({
  icon,
  iconTone = "primary",
  title,
  body,
  footIcon,
  footLabel,
  footTone = "secondary",
}: {
  icon: string;
  iconTone?: "primary" | "error" | "secondary" | "muted";
  title: string;
  body: string;
  footIcon: string;
  footLabel: string;
  footTone?: "primary" | "secondary" | "error" | "muted";
}) {
  const iconBox =
    iconTone === "error"
      ? "bg-warm-error-container text-warm-error"
      : iconTone === "secondary"
        ? "bg-warm-linen text-warm-secondary"
        : iconTone === "muted"
          ? "bg-warm-linen text-warm-ink-muted"
          : "bg-warm-linen text-warm-primary";
  const footCls =
    footTone === "error"
      ? "text-warm-error"
      : footTone === "primary"
        ? "text-warm-primary"
        : footTone === "muted"
          ? "text-warm-ink-muted"
          : "text-warm-secondary";

  return (
    <div className="flex flex-col gap-4 rounded-2xl bg-warm-cream p-7 shadow-sm transition-shadow hover:shadow-md">
      <div
        className={`flex h-12 w-12 items-center justify-center rounded-xl ${iconBox}`}
      >
        <Icon name={icon} className="text-[26px]" />
      </div>
      <div className="flex flex-col gap-2">
        <h3 className="font-display text-xl font-semibold text-warm-ink">
          {title}
        </h3>
        <p className="text-sm leading-relaxed text-warm-ink-muted">{body}</p>
      </div>
      <span
        className={`mt-auto inline-flex items-center gap-1 pt-3 text-xs font-semibold ${footCls}`}
      >
        <Icon name={footIcon} className="text-[16px]" />
        {footLabel}
      </span>
    </div>
  );
}

function WorkflowStep({
  n,
  icon,
  title,
  body,
  chipIcon,
  chip,
}: {
  n: string;
  icon: string;
  title: string;
  body: string;
  chipIcon: string;
  chip: string;
}) {
  return (
    <div className="flex flex-col gap-4 rounded-2xl bg-warm-cream p-6 shadow-sm transition-shadow hover:shadow-md">
      <div className="flex items-center justify-between">
        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-warm-linen font-display text-xl font-semibold text-warm-primary">
          {n}
        </span>
        <Icon name={icon} className="text-[22px] text-warm-ink-muted" />
      </div>
      <div className="flex flex-col gap-1.5 pt-2">
        <h3 className="font-display text-lg font-semibold text-warm-ink">
          {title}
        </h3>
        <p className="text-sm leading-relaxed text-warm-ink-muted">{body}</p>
      </div>
      <div className="mt-auto pt-4">
        <div className="flex items-center gap-2 rounded-lg bg-warm-linen px-3 py-2 text-xs text-warm-ink-muted">
          <Icon name={chipIcon} className="text-[16px] text-warm-primary" />
          <span>{chip}</span>
        </div>
      </div>
    </div>
  );
}

export default function SetuLanding() {
  const router = useRouter();

  const goHospital = () => {
    setSetuUserType("hospital");
    router.push("/org");
  };

  const goFamily = () => {
    setSetuUserType("family");
    router.push("/dashboard");
  };

  const goFamilySetup = () => {
    setSetuUserType("family");
    router.push("/setup");
  };

  return (
    <div className="flex min-h-screen flex-col bg-warm-cream text-warm-ink selection:bg-warm-primary/20">
      <header className="fixed inset-x-0 top-0 z-50 bg-warm-cream/90 pt-safe shadow-[0_1px_8px_rgba(0,0,0,0.03)] backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:h-20 sm:px-6 lg:px-12">
          <div className="flex shrink-0 flex-col">
            <div className="flex items-center gap-2">
              <span className="font-display text-lg font-semibold text-warm-primary">
                Setu
              </span>
              <span className="font-display text-lg font-normal text-warm-ink">
                | सेतु
              </span>
            </div>
            <span className="hidden text-[11px] font-semibold uppercase tracking-wide text-warm-ink-muted sm:block">
              Verified adherence. Every patient. Every day.
            </span>
          </div>

          <nav className="hidden items-center gap-1 xl:flex">
            {[
              { href: "#overview", label: "Overview" },
              { href: "#clinical-protocol", label: "Clinical Protocol" },
              { href: "#simulator", label: "Live Simulator" },
              { href: "#telemetry", label: "Telemetry" },
              { href: "#economics", label: "Economics" },
              { href: "#for-families", label: "For Families" },
            ].map((item) => (
              <a
                key={item.href}
                href={item.href}
                className="rounded-lg px-3 py-2 text-[13px] font-medium text-warm-ink-muted transition hover:text-warm-ink"
              >
                {item.label}
              </a>
            ))}
          </nav>

          <div className="flex shrink-0 items-center gap-2 sm:gap-3">
            <button
              type="button"
              onClick={goFamily}
              className="hidden min-h-[44px] items-center justify-center rounded-xl px-3 text-[13px] font-medium text-warm-ink-muted transition hover:bg-warm-linen hover:text-warm-ink md:inline-flex"
            >
              Family Login
            </button>
            <button
              type="button"
              onClick={goHospital}
              className="hidden min-h-[44px] items-center justify-center rounded-xl px-3 text-[13px] font-medium text-warm-ink-muted transition hover:bg-warm-linen hover:text-warm-ink md:inline-flex"
            >
              Hospital Login
            </button>
            <a
              href="#simulator"
              className="hidden min-h-[44px] items-center justify-center rounded-xl bg-warm-linen px-4 text-[13px] font-medium text-warm-ink transition hover:bg-warm-container-high sm:inline-flex"
            >
              Try a Live Call
            </a>
            <button
              type="button"
              onClick={goHospital}
              className="inline-flex min-h-[44px] items-center justify-center rounded-xl bg-warm-primary px-4 text-[13px] font-semibold text-white shadow-sm transition hover:bg-warm-primary-container sm:px-5"
            >
              Request Clinic Pilot
            </button>
          </div>
        </div>
      </header>

      <main className="w-full">
        {/* Founder story — first on page */}
        <section
          id="founder-story"
          aria-label="Founder's story"
          className="scroll-mt-24 border-b border-amber-950/50 bg-gradient-to-b from-[#2a1810] via-[#1a1008] to-[#140c06] pt-16 text-amber-50/95 sm:pt-20"
        >
          <div className="mx-auto grid max-w-7xl grid-cols-1 items-center gap-12 px-4 py-14 sm:px-6 lg:grid-cols-12 lg:gap-16 lg:px-12 lg:py-20">
            <div className="flex justify-center lg:col-span-5 lg:justify-end">
              <div
                className="relative -rotate-2 transition-transform duration-300 hover:-rotate-1"
                style={{ transformOrigin: "center center" }}
              >
                <div className="rounded-sm bg-[#f4ebe3] p-3 pb-12 shadow-[0_16px_48px_rgba(0,0,0,0.55),0_2px_0_rgba(255,255,255,0.06)_inset] ring-1 ring-black/10">
                  <div className="relative aspect-[3/4] w-[min(100%,300px)] overflow-hidden sm:w-[280px] lg:w-[320px]">
                    <Image
                      src={FOUNDER_PHOTO}
                      alt="Founder holding a photograph of Nanaji with family"
                      fill
                      className="object-cover object-center sepia-[0.35] saturate-[0.85]"
                      sizes="(max-width: 1024px) 85vw, 320px"
                      priority
                    />
                    <div
                      className="pointer-events-none absolute inset-0 bg-gradient-to-br from-amber-900/45 via-orange-950/25 to-amber-950/50 mix-blend-multiply"
                      aria-hidden
                    />
                    <div
                      className="pointer-events-none absolute inset-0 bg-amber-600/10"
                      aria-hidden
                    />
                  </div>
                </div>
                <div
                  className="absolute -bottom-2 left-1/2 h-3 w-[92%] -translate-x-1/2 rounded-full bg-black/25 blur-md"
                  aria-hidden
                />
              </div>
            </div>

            <div className="flex flex-col gap-5 lg:col-span-7">
              <div className="space-y-4 font-display text-lg leading-relaxed sm:text-xl sm:leading-relaxed">
                <p className="text-amber-50">
                  My Nanaji died of a heart attack.
                </p>
                <p className="text-amber-100/90">
                  He had an assistant at home. The assistant called one person.
                </p>
                <p className="text-amber-100/90">
                  He had five children — three daughters, two sons — all living
                  in the same city. None of the others knew for two hours.
                </p>
                <p className="text-amber-100/90">
                  If everyone had gotten that call, they might have rushed. He
                  might have been saved.
                </p>
                <p className="text-amber-50">That is why I built Setu.</p>
              </div>
              <p className="font-sans text-sm font-medium tracking-wide text-amber-200/80">
                — Suvijay, Founder
              </p>
              <p className="max-w-xl border-t border-amber-900/60 pt-5 font-sans text-sm leading-relaxed text-amber-200/50">
                Setu means bridge. A bridge between patients and the people who
                love them.
              </p>
            </div>
          </div>
        </section>

        {/* Hero */}
        <section
          id="overview"
          className="relative mx-auto max-w-7xl scroll-mt-24 px-4 pb-16 pt-8 sm:px-6 sm:pb-20 lg:px-12 lg:pt-10"
        >
          <div className="grid grid-cols-1 items-center gap-10 lg:grid-cols-12 lg:gap-16">
            <div className="flex flex-col gap-6 lg:col-span-7">
              <div className="inline-flex w-fit items-center gap-2 rounded-full bg-warm-linen px-3.5 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-warm-primary shadow-sm">
                <span className="h-2 w-2 animate-pulse rounded-full bg-warm-saffron" />
                <span>Automated Chronic Care Telephony • Hindi Voice Protocol</span>
              </div>
              <h1 className="font-display text-4xl font-semibold leading-tight tracking-tight text-warm-ink lg:text-5xl">
                Your patients called.{" "}
                <span className="font-normal italic text-warm-primary">
                  Setu verified.
                </span>
              </h1>
              <p className="max-w-2xl text-lg leading-relaxed text-warm-ink-muted">
                A natural Hindi voice agent that calls your chronic-care patients
                daily, confirms verified medication intake, detects clinical
                distress, and transmits structured outcome telemetry directly to
                your desk — on any basic feature phone.
              </p>
              <div className="flex flex-wrap items-center gap-4 pt-2">
                <button
                  type="button"
                  onClick={goHospital}
                  className="inline-flex min-h-[48px] items-center justify-center gap-2 rounded-xl bg-warm-primary px-7 py-3.5 text-[15px] font-semibold text-white shadow-sm transition hover:bg-warm-primary-container"
                >
                  Request a Clinic Pilot
                  <Icon name="arrow_forward" className="text-[18px]" />
                </button>
                <a
                  href="#simulator"
                  className="group inline-flex min-h-[48px] items-center justify-center gap-3 rounded-xl bg-warm-linen px-6 py-3.5 text-[15px] font-semibold text-warm-ink shadow-sm transition hover:bg-warm-container-high"
                >
                  <span className="relative flex h-6 w-6 items-center justify-center rounded-full bg-warm-primary/10 text-warm-primary">
                    <Icon
                      name="call"
                      className="text-[16px] transition group-hover:scale-110"
                    />
                    <span className="absolute inset-0 animate-pulse-ring rounded-full bg-warm-primary/20" />
                  </span>
                  Try a Live Call
                </a>
              </div>
              <div className="flex flex-wrap items-center gap-x-6 gap-y-3 pt-4 text-[13px] text-warm-ink-muted">
                <span className="inline-flex items-center gap-2">
                  <Icon name="verified" className="text-[18px] text-warm-secondary" />
                  Built on Bolna AI
                </span>
                <span className="hidden text-warm-container-high sm:inline">•</span>
                <span className="inline-flex items-center gap-2">
                  <Icon name="mic" className="text-[18px] text-warm-primary" />
                  Sarvam Hindi Voice
                </span>
                <span className="hidden text-warm-container-high sm:inline">•</span>
                <span className="inline-flex items-center gap-2">
                  <Icon name="hub" className="text-[18px] text-warm-secondary" />
                  India Telecom Routing
                </span>
                <span className="hidden text-warm-container-high sm:inline">•</span>
                <span className="inline-flex items-center gap-2">
                  <Icon name="phonelink_erase" className="text-[18px]" />
                  No smartphone or app required
                </span>
              </div>
            </div>

            <div className="relative lg:col-span-5">
              <div className="relative overflow-hidden rounded-2xl bg-warm-linen p-3 shadow-md">
                <div className="relative aspect-[4/5] overflow-hidden rounded-xl bg-warm-container-high">
                  <Image
                    src={HERO_IMG}
                    alt="Elderly grandmother on a warm phone check-in call at home"
                    fill
                    className="object-cover"
                    sizes="(max-width: 1024px) 100vw, 40vw"
                    priority
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-warm-ink/70 via-transparent to-transparent" />
                  <div className="absolute left-4 right-4 top-4">
                    <div className="flex items-center justify-between rounded-xl bg-warm-cream/95 p-3 shadow-sm backdrop-blur-md">
                      <div className="flex items-center gap-2.5">
                        <span className="relative flex h-3 w-3">
                          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-warm-secondary opacity-75" />
                          <span className="relative inline-flex h-3 w-3 rounded-full bg-warm-secondary" />
                        </span>
                        <div>
                          <p className="text-[11px] font-semibold uppercase tracking-wider text-warm-secondary">
                            Clinical Verification
                          </p>
                          <p className="text-[13px] font-semibold text-warm-ink">
                            94.2% Medication Verified
                          </p>
                        </div>
                      </div>
                      <span className="rounded bg-warm-clinical-bg px-2 py-1 text-[11px] font-semibold text-warm-secondary">
                        Hindi Voice
                      </span>
                    </div>
                  </div>
                  <div className="absolute bottom-4 left-4 right-4">
                    <div className="flex flex-col gap-1.5 rounded-xl bg-warm-cream/95 p-3.5 shadow-md backdrop-blur-md">
                      <div className="flex items-center justify-between">
                        <span className="inline-flex items-center gap-2 text-[13px] font-semibold">
                          <Icon name="check_circle" className="text-[18px] text-warm-primary" />
                          Daily Check-in • 8:45 AM
                        </span>
                        <span className="text-[11px] text-warm-ink-muted">
                          Call ID #8491
                        </span>
                      </div>
                      <div className="flex items-center justify-between pt-1 text-sm text-warm-ink-muted">
                        <span>Amlodipine 5mg</span>
                        <span className="rounded-full bg-warm-clinical-bg px-2 py-0.5 text-[11px] font-semibold text-warm-secondary">
                          VERIFIED TAKEN
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <div className="absolute -bottom-4 -right-4 -z-10 h-32 w-32 rounded-full bg-warm-primary/5 blur-2xl" />
            </div>
          </div>
        </section>

        {/* Clinical problem */}
        <section
          id="clinical-protocol"
          className="scroll-mt-24 bg-warm-linen/80 py-16 sm:py-20"
        >
          <div className="mx-auto flex max-w-7xl flex-col gap-12 px-4 sm:px-6 lg:px-12">
            <div className="flex flex-col justify-between gap-6 md:flex-row md:items-end">
              <div className="flex max-w-2xl flex-col gap-3">
                <span className="text-[11px] font-semibold uppercase tracking-widest text-warm-primary">
                  Outpatient Telemetry Gap
                </span>
                <h2 className="font-display text-3xl font-semibold text-warm-ink">
                  The follow-up gap costs lives
                </h2>
                <p className="text-base leading-relaxed text-warm-ink-muted">
                  Indian outpatient cardiology and endocrinology practices
                  prescribe correct treatment regimens, yet patient adherence
                  collapses the moment patients step outside clinic doors.
                </p>
              </div>
              <div className="inline-flex items-center gap-2 self-start rounded-xl bg-warm-cream px-4 py-2 text-[13px] text-warm-secondary shadow-sm md:self-auto">
                <Icon name="verified_user" className="text-[18px]" />
                Setu costs a fraction of nursing call desks. And it never misses
                a day.
              </div>
            </div>
            <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
              {[
                {
                  label: "National Geriatric Burden",
                  value: "149M",
                  valueCls: "text-warm-primary",
                  title: "Elderly Indians with Chronic Conditions",
                  body: "Requiring ongoing daily oversight, verified dosing, and early decompensation detection at home.",
                },
                {
                  label: "Documented Medication Failure",
                  value: "51%",
                  valueCls: "text-warm-error",
                  title: "Average Chronic Adherence in India",
                  body: "Documented across hypertension and diabetes cohorts. (WHO-SAGE2 India & Frontiers in Pharmacology 2023).",
                  labelCls: "text-warm-error",
                },
                {
                  label: "Human Overhead Barrier",
                  value: "₹5,000+",
                  valueCls: "text-warm-ink",
                  title: "Monthly Cost per Patient for Care Calling",
                  body: "Standard tier for manual coordinator programs, limiting care only to elite households.",
                },
              ].map((card) => (
                <div
                  key={card.title}
                  className="flex flex-col justify-between rounded-2xl bg-warm-cream p-8 shadow-sm transition-shadow hover:shadow-md"
                >
                  <div className="flex flex-col gap-2">
                    <span
                      className={`text-[11px] font-semibold uppercase tracking-wider text-warm-ink-muted ${card.labelCls ?? ""}`}
                    >
                      {card.label}
                    </span>
                    <div
                      className={`font-display pt-2 text-5xl leading-none ${card.valueCls}`}
                    >
                      {card.value}
                    </div>
                  </div>
                  <div className="pt-6">
                    <p className="text-base font-semibold text-warm-ink">
                      {card.title}
                    </p>
                    <p className="pt-1 text-sm text-warm-ink-muted">
                      {card.body}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Workflow */}
        <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:py-24 lg:px-12">
          <div className="mx-auto mb-14 flex max-w-2xl flex-col gap-3 text-center">
            <span className="text-[11px] font-semibold uppercase tracking-widest text-warm-primary">
              Clinic Operational Architecture
            </span>
            <h2 className="font-display text-3xl font-semibold text-warm-ink">
              Designed for busy doctors, not IT teams
            </h2>
            <p className="text-base text-warm-ink-muted">
              Zero complex EMR API integration required. Implement conversational
              adherence telemetry across your chronic caseload in under thirty
              minutes.
            </p>
          </div>
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
            <WorkflowStep
              n="01"
              icon="upload_file"
              title="Upload your patient list"
              body="Drop a standard clinic spreadsheet with patient names, preferred call times, phone numbers, and prescribed medications."
              chipIcon="table_view"
              chip="CSV, Excel, or ABDM FHIR"
            />
            <WorkflowStep
              n="02"
              icon="clinical_notes"
              title="Pick a care protocol"
              body="Select predefined medical scripts: Post-Stent Discharge, Essential Hypertension, Type-2 Glycemic, or define custom questions."
              chipIcon="tune"
              chip="Cardio / Diabetic / Post-Op"
            />
            <WorkflowStep
              n="03"
              icon="phone_in_talk"
              title="Setu calls every patient daily"
              body="Warm, natural Hindi telephony. Speaks at an elder's pace, confirms each specific dose, actively listens, and flags distress signs."
              chipIcon="hearing"
              chip="Natural Hindi voice telephony"
            />
            <WorkflowStep
              n="04"
              icon="analytics"
              title="You see outcomes, not transcripts"
              body="Physicians receive clean metrics: confirmed adherence percentages, missed calls, early distress escalations, and mood trends."
              chipIcon="trending_up"
              chip="Real-time clinical dashboard"
            />
          </div>
        </section>

        {/* Simulator */}
        <section
          id="simulator"
          className="scroll-mt-24 bg-warm-linen py-16 sm:py-20"
        >
          <div className="mx-auto flex max-w-4xl flex-col items-center gap-8 px-4 text-center sm:px-6 lg:px-12">
            <div className="flex max-w-xl flex-col gap-2">
              <span className="text-[11px] font-semibold uppercase tracking-widest text-warm-primary">
                Interactive Telemetry Sandbox
              </span>
              <h2 className="font-display text-3xl font-semibold text-warm-ink">
                Hear what your patients will hear
              </h2>
              <p className="text-base text-warm-ink-muted">
                Click below to initiate a live in-browser Hindi simulation with
                Setu. Say you forgot your morning blood pressure pill or mention
                feeling dizzy.
              </p>
            </div>
            <div className="relative flex w-full flex-col items-center gap-8 overflow-hidden rounded-3xl bg-warm-cream p-8 shadow-md sm:p-12">
              <div className="inline-flex items-center gap-2.5 rounded-full bg-warm-linen px-4 py-2 text-[13px] text-warm-ink-muted">
                <Icon name="record_voice_over" className="text-[18px] text-warm-primary" />
                <span>
                  <strong>Test Scenario:</strong> Pretend you&apos;re a 72-year-old
                  patient who forgot their morning medicine
                </span>
              </div>
              <CallButton variant="warm" agentType="b2c" />
              <div className="flex items-center gap-1.5 h-8">
                <span className="h-2 w-1.5 rounded-full bg-warm-primary/40" />
                <span className="h-3 w-1.5 rounded-full bg-warm-primary/50" />
                <span className="h-4 w-1.5 rounded-full bg-warm-primary/70" />
                <span className="h-3 w-1.5 rounded-full bg-warm-primary/50" />
                <span className="h-2 w-1.5 rounded-full bg-warm-primary/40" />
              </div>
              <div className="flex w-full max-w-lg flex-col gap-2 rounded-xl bg-warm-linen p-4 text-left">
                <div className="flex items-center justify-between text-[11px] text-warm-ink-muted">
                  <span className="inline-flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full bg-warm-secondary" />
                    Setu Voice Stream (Hindi / English Telemetry)
                  </span>
                  <span>Ready to dial</span>
                </div>
                <p className="text-base italic text-warm-ink">
                  &ldquo;नमस्ते शर्मा जी, मैं सेतु बोल रही हूँ। क्या आपने आज सुबह
                  अपनी नाश्ते के बाद वाली Amlodipine 5mg ले ली है?&rdquo;
                </p>
              </div>
              <div className="flex flex-wrap items-center justify-center gap-3 pt-2 text-[11px] text-warm-ink-muted">
                <span className="inline-flex items-center gap-1.5 rounded-lg bg-warm-clinical-bg px-3 py-1.5 font-semibold text-warm-secondary">
                  <Icon name="task_alt" className="text-[16px]" />
                  Logged in clinic telemetry: Amlodipine 5mg verified taken
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-lg bg-warm-linen px-3 py-1.5 text-warm-ink">
                  <Icon name="timer" className="text-[16px]" />
                  Avg call duration: 1m 42s
                </span>
              </div>
            </div>
          </div>
        </section>

        {/* Features */}
        <section
          id="telemetry"
          className="scroll-mt-24 mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:py-24 lg:px-12"
        >
          <div className="mx-auto mb-14 flex max-w-2xl flex-col gap-3 text-center">
            <span className="text-[11px] font-semibold uppercase tracking-widest text-warm-primary">
              Protocol Guardrails
            </span>
            <h2 className="font-display text-3xl font-semibold text-warm-ink">
              Clinical intelligence that protects elders
            </h2>
            <p className="text-base text-warm-ink-muted">
              Beyond a simple reminder phone call. Setu actively monitors
              decompensation patterns, safeguards family relationships, and
              shields elders from financial exploitation.
            </p>
          </div>
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            <WarmFeature
              icon="medication"
              title="Medication Verified"
              body="Confirms specific prescribed pills, exact dosages, and breakfast alignment. Rejects generic affirmative murmurs until the elder specifies the tablet by name or color."
              footIcon="check"
              footLabel="ABDM Protocol Standard"
            />
            <WarmFeature
              icon="emergency_home"
              iconTone="error"
              title="Distress Escalation"
              body="Immediate multi-channel SMS and phone priority alerts sent directly to treating doctors and family members upon verbal cues of chest pressure, breathlessness, or falls."
              footIcon="bolt"
              footLabel="Instant <10s SMS Dispatch"
              footTone="error"
            />
            <WarmFeature
              icon="near_me"
              title="Nearby Care Search"
              body="If a patient asks for emergency transport or immediate pharmacy refilling, Setu dynamically locates verified nearby centers and guides them via clear verbal prompts."
              footIcon="location_on"
              footLabel="Pin-code Aware Engine"
              footTone="muted"
            />
            <WarmFeature
              icon="psychology"
              iconTone="secondary"
              title="Call Memory"
              body={`Remembers previous disclosures: "Are your knees still hurting since yesterday's walk?" Elders engage naturally when spoken to with empathetic human continuity.`}
              footIcon="history_edu"
              footLabel="Longitudinal Memory Ledger"
            />
            <WarmFeature
              icon="family_restroom"
              title="Family Bridge"
              body="Children working across Indian metros or overseas can schedule heartfelt audio notes. Setu delivers them warmly at the conclusion of each daily clinical check-in."
              footIcon="favorite"
              footLabel="Multi-generational Bond"
              footTone="primary"
            />
            <WarmFeature
              icon="shield_person"
              iconTone="muted"
              title="Elder Scam Shield"
              body="Asks gently once per call if anyone contacted them asking for electricity bill payments or bank OTPs. Flags suspicious interactions immediately to the primary caregiver."
              footIcon="security"
              footLabel="Financial Threat Guard"
              footTone="muted"
            />
          </div>
        </section>

        {/* Inbound + outbound (preserved product copy) */}
        <section
          id="inbound"
          className="scroll-mt-24 border-y border-warm-border-gentle bg-warm-linen/60 py-14"
        >
          <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-12">
            <div className="mb-8 text-center">
              <span className="text-[11px] font-semibold uppercase tracking-widest text-warm-primary">
                Two-way voice care
              </span>
              <h2 className="mt-1 font-display text-2xl font-semibold text-warm-ink sm:text-3xl">
                Inbound + outbound on one platform
              </h2>
            </div>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="rounded-2xl border border-warm-border-gentle bg-warm-cream p-6 shadow-sm">
                <h3 className="mb-2 font-display text-lg font-semibold text-warm-ink">
                  Patients call in
                </h3>
                <p className="text-sm leading-relaxed text-warm-ink-muted">
                  Patients call{" "}
                  <a
                    href={`tel:${INBOUND_LINE.replace(/\s/g, "")}`}
                    className="font-semibold text-warm-primary hover:underline"
                  >
                    {INBOUND_LINE}
                  </a>
                  , describe symptoms in Hindi, and get an appointment logged
                  instantly in your org dashboard.
                </p>
              </div>
              <div className="rounded-2xl border border-warm-border-gentle bg-warm-cream p-6 shadow-sm">
                <h3 className="mb-2 font-display text-lg font-semibold text-warm-ink">
                  You call them back
                </h3>
                <p className="text-sm leading-relaxed text-warm-ink-muted">
                  Discharged patients receive automated Hindi follow-up calls.
                  Missed doses and distress get flagged to your team immediately.
                </p>
              </div>
            </div>
            <p className="mt-6 text-center text-xs font-medium text-warm-ink-muted">
              Handling inbound appointments + post-discharge follow-up for pilot
              clinics in Delhi NCR · Oct 2026
            </p>
          </div>
        </section>

        {/* Economics */}
        <section
          id="economics"
          className="scroll-mt-24 bg-warm-linen py-16 sm:py-20"
        >
          <div className="mx-auto flex max-w-5xl flex-col gap-10 px-4 sm:px-6 lg:px-12">
            <div className="flex flex-col gap-2 text-center">
              <span className="text-[11px] font-semibold uppercase tracking-widest text-warm-primary">
                Clinic Operational Economics
              </span>
              <h2 className="font-display text-3xl font-semibold text-warm-ink">
                The math for your clinic
              </h2>
              <p className="mx-auto max-w-xl text-base text-warm-ink-muted">
                An honest breakdown of infrastructure costs versus traditional
                nursing tele-desks — plus missed-call revenue recovery.
              </p>
            </div>
            <div className="flex flex-col gap-8 rounded-3xl bg-warm-cream p-8 shadow-sm lg:p-12">
              <div className="grid grid-cols-1 items-center gap-8 border-b border-warm-container pb-8 md:grid-cols-3">
                <div className="flex flex-col gap-1">
                  <span className="text-[11px] font-semibold uppercase text-warm-ink-muted">
                    Voice Infrastructure
                  </span>
                  <div className="font-display text-3xl font-semibold text-warm-ink">
                    ~$0.034 / min
                  </div>
                  <p className="text-sm text-warm-ink-muted">
                    Bolna India direct telecom telephony routing
                  </p>
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-[11px] font-semibold uppercase text-warm-ink-muted">
                    Per Patient Daily
                  </span>
                  <div className="font-display text-3xl font-semibold text-warm-primary">
                    ₹6 / day
                  </div>
                  <p className="text-sm text-warm-ink-muted">
                    Roughly 2-minute daily check-in call
                  </p>
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-[11px] font-semibold uppercase text-warm-ink-muted">
                    Per Patient Monthly
                  </span>
                  <div className="font-display text-3xl font-semibold text-warm-secondary">
                    ₹180 / month
                  </div>
                  <p className="text-sm text-warm-ink-muted">
                    Voice connectivity base tier per chronic patient
                  </p>
                </div>
              </div>
              <div className="flex flex-col items-start justify-between gap-6 md:flex-row md:items-center">
                <div className="max-w-xl flex flex-col gap-1">
                  <span className="font-display text-lg font-semibold text-warm-ink">
                    Versus nursing staff overhead: ₹200–500 per call
                  </span>
                  <p className="text-sm text-warm-ink-muted">
                    Manual coordinator desks suffer from high attrition, dialect
                    mismatch, and inconsistent transcription. Setu delivers 100%
                    adherence data fidelity with zero clinical staff fatigue.
                  </p>
                </div>
                <div className="shrink-0 rounded-xl bg-warm-linen px-4 py-3 text-[11px] text-warm-ink-muted">
                  <p className="font-semibold text-warm-ink">
                    Cost Transparency Notice
                  </p>
                  <p>
                    Voice cost estimate only. Excludes SMS dispatch, LLM tokens,
                    and hospital server hosting.
                  </p>
                </div>
              </div>
            </div>
            <RoiCalculator variant="warm" />
          </div>
        </section>

        {/* Families */}
        <section
          id="for-families"
          className="scroll-mt-24 mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:py-24 lg:px-12"
        >
          <div className="grid grid-cols-1 items-center gap-12 lg:grid-cols-12">
            <div className="relative lg:col-span-6">
              <div className="overflow-hidden rounded-2xl bg-warm-linen p-3 shadow-md">
                <div className="relative aspect-[16/10] overflow-hidden rounded-xl bg-warm-container-high">
                  <Image
                    src={FAMILY_IMG}
                    alt="Senior father enjoying morning tea with a Setu check-in"
                    fill
                    className="object-cover"
                    sizes="(max-width: 1024px) 100vw, 50vw"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-warm-ink/50 via-transparent to-transparent" />
                  <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between rounded-xl bg-warm-cream/90 p-3 backdrop-blur-md">
                    <span className="inline-flex items-center gap-2 text-[13px] font-semibold">
                      <span className="h-2.5 w-2.5 rounded-full bg-warm-secondary" />
                      Babuji&apos;s Morning Check: Completed
                    </span>
                    <span className="text-[11px] text-warm-ink-muted">
                      8:15 AM IST
                    </span>
                  </div>
                </div>
              </div>
            </div>
            <div className="flex flex-col gap-6 lg:col-span-6">
              <div className="flex flex-col gap-2">
                <span className="text-[11px] font-semibold uppercase tracking-widest text-warm-primary">
                  Global Family Care Ledger
                </span>
                <h2 className="font-display text-3xl font-semibold text-warm-ink">
                  Peace of mind across time zones
                </h2>
                <p className="text-base text-warm-ink-muted">
                  Whether you are working in Bengaluru, London, or San Jose,
                  ensure Babuji and Mataji never miss their routine medications
                  or feel isolated when health challenges emerge.
                </p>
              </div>
              <div className="grid grid-cols-1 gap-4 pt-2 sm:grid-cols-2">
                <div className="flex flex-col justify-between gap-4 rounded-2xl bg-warm-cream p-6 shadow-sm transition-shadow hover:shadow-md">
                  <div className="flex flex-col gap-1.5">
                    <Icon name="schedule" className="text-[24px] text-warm-primary" />
                    <h3 className="font-display text-lg font-semibold">
                      Set up in 2 minutes
                    </h3>
                    <p className="text-sm text-warm-ink-muted">
                      Input their prescribed medicines, schedule, and preferred
                      morning/evening call timings.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={goFamilySetup}
                    className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-warm-primary hover:underline"
                  >
                    Set Up My Parents
                    <Icon name="arrow_forward" className="text-[16px]" />
                  </button>
                </div>
                <div className="flex flex-col justify-between gap-4 rounded-2xl bg-warm-cream p-6 shadow-sm transition-shadow hover:shadow-md">
                  <div className="flex flex-col gap-1.5">
                    <Icon
                      name="favorite_border"
                      className="text-[24px] text-warm-secondary"
                    />
                    <h3 className="font-display text-lg font-semibold">
                      Daily peace of mind
                    </h3>
                    <p className="text-sm text-warm-ink-muted">
                      Receive instant notifications confirming medicine
                      verification and mood on the family dashboard.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={goFamily}
                    className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-warm-secondary hover:underline"
                  >
                    View Family Dashboard
                    <Icon name="arrow_forward" className="text-[16px]" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Pilot banner */}
        <section className="bg-warm-primary py-14 text-white">
          <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-8 px-4 sm:px-6 md:flex-row lg:px-12">
            <div className="flex max-w-2xl flex-col gap-3">
              <div className="inline-flex w-fit items-center gap-2 rounded-full bg-white/20 px-3 py-1 text-[11px] font-semibold">
                <Icon name="calendar_today" className="text-[16px]" />
                Limited Clinic Cohort · Q3 2026
              </div>
              <h2 className="font-display text-3xl font-semibold">
                Run a pilot with your clinic
              </h2>
              <p className="text-base text-white/90">
                We are partnering with 2–3 forward-thinking cardiology or
                endocrinology clinics to run a 30-day chronic-care cohort. No
                software integration required. We onboard your patient list in
                one day.
              </p>
            </div>
            <div className="flex shrink-0 flex-col items-center gap-4 sm:flex-row">
              <button
                type="button"
                onClick={goHospital}
                className="inline-flex min-h-[48px] items-center justify-center rounded-xl bg-warm-cream px-8 py-4 text-[15px] font-semibold text-warm-primary shadow-md transition hover:bg-white"
              >
                Request Pilot Access
              </button>
              <a
                href="mailto:pilot@setucare.in"
                className="inline-flex min-h-[48px] items-center justify-center rounded-xl border border-white/40 px-6 py-4 text-[15px] font-semibold transition hover:bg-white/10"
              >
                pilot@setucare.in
              </a>
            </div>
          </div>
        </section>

        <footer className="bg-warm-linen pb-24 pt-14 shadow-[0_-1px_6px_rgba(0,0,0,0.02)] sm:pb-12">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-12">
            <div className="grid grid-cols-1 gap-10 pb-12 md:grid-cols-12">
              <div className="flex flex-col gap-4 md:col-span-5">
                <span className="font-display text-lg font-semibold text-warm-primary">
                  Setu सेतु
                </span>
                <p className="max-w-md text-base text-warm-ink-muted">
                  Bridging clinical rigor with restorative eldercare. The
                  protocol-first conversational telemetry platform built for
                  Indian outpatient clinics, hospital networks, and global NRI
                  families.
                </p>
                <div className="flex flex-wrap gap-2 pt-2">
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-warm-clinical-bg px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-warm-secondary">
                    <Icon name="verified" className="text-[14px]" />
                    Clinical Standard ABDM Ready
                  </span>
                </div>
              </div>
              <div className="flex flex-col gap-3 md:col-span-4">
                <span className="text-[15px] font-semibold text-warm-ink">
                  Build &amp; Infrastructure
                </span>
                <div className="flex flex-col gap-2.5 rounded-xl bg-warm-cream p-4">
                  <div className="flex items-center gap-2 text-[13px] text-warm-ink-muted">
                    <Icon name="award_star" className="text-[18px] text-warm-primary" />
                    Built for Bolna × YC Symphony Buildathon 2026
                  </div>
                  <div className="flex items-center gap-2 text-[13px] text-warm-ink-muted">
                    <Icon name="neurology" className="text-[18px] text-warm-secondary" />
                    Powered by Bolna AI · Sarvam · Groq · Supabase
                  </div>
                </div>
                <p className="text-sm text-warm-ink-muted">
                  Clinical telemetry assistant. Not a substitute for emergency
                  dispatch.
                </p>
              </div>
              <div className="flex flex-col gap-3 md:col-span-3">
                <span className="text-[15px] font-semibold text-warm-ink">
                  Quick links
                </span>
                <ul className="flex flex-col gap-2 text-sm text-warm-ink-muted">
                  <li>
                    <Link href="/setup" className="transition hover:text-warm-primary">
                      Family setup
                    </Link>
                  </li>
                  <li>
                    <Link
                      href="/dashboard"
                      className="transition hover:text-warm-primary"
                    >
                      Family dashboard
                    </Link>
                  </li>
                  <li>
                    <button
                      type="button"
                      onClick={goHospital}
                      className="transition hover:text-warm-primary"
                    >
                      Hospital / org portal
                    </button>
                  </li>
                  <li>
                    <a href="#simulator" className="transition hover:text-warm-primary">
                      Live call simulator
                    </a>
                  </li>
                  <li>
                    <a href="#economics" className="transition hover:text-warm-primary">
                      Clinic economics &amp; ROI
                    </a>
                  </li>
                </ul>
              </div>
            </div>
            <div className="flex flex-col items-center justify-between gap-4 border-t border-warm-border-gentle pt-8 text-sm text-warm-ink-muted sm:flex-row">
              <p className="text-center sm:text-left">
                © 2026 Setu Care Technologies. All clinical decisions remain
                under treating medical practitioners.
              </p>
              <div className="flex items-center gap-4">
                <button
                  type="button"
                  onClick={goFamily}
                  className="transition hover:text-warm-primary"
                >
                  Family Login
                </button>
                <button
                  type="button"
                  onClick={goHospital}
                  className="transition hover:text-warm-primary"
                >
                  Hospital Login
                </button>
              </div>
            </div>
          </div>
        </footer>
      </main>

      <nav className="fixed inset-x-0 bottom-0 z-50 border-t border-warm-border-gentle bg-warm-cream/90 pb-safe shadow-[0_-1px_12px_rgba(0,0,0,0.05)] backdrop-blur-xl xl:hidden">
        <div className="mx-auto flex max-w-lg items-center gap-2 p-3">
          <a
            href="#simulator"
            className="flex min-h-[48px] flex-1 items-center justify-center gap-2 rounded-xl bg-warm-linen text-[14px] font-semibold text-warm-ink transition hover:bg-warm-container-high"
          >
            <Icon name="phone_in_talk" className="text-[20px] text-warm-primary" />
            Try Live Call
          </a>
          <button
            type="button"
            onClick={goHospital}
            className="flex min-h-[48px] flex-1 items-center justify-center gap-2 rounded-xl bg-warm-primary text-[14px] font-semibold text-white shadow-[0_2px_8px_rgba(167,52,0,0.18)] transition hover:bg-warm-primary-container"
          >
            <Icon name="assignment_turned_in" className="text-[20px]" />
            Clinic Pilot
          </button>
        </div>
      </nav>
    </div>
  );
}
