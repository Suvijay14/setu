import Link from "next/link";
import type { ReactNode } from "react";
import CallButton from "./CallButton";

function SectionBadge({
  children,
  tone = "cyan",
}: {
  children: ReactNode;
  tone?: "cyan" | "amber" | "rose";
}) {
  const tones = {
    cyan: "text-cyan-400 bg-cyan-500/10 border-cyan-500/20",
    amber: "text-amber-400 bg-amber-500/10 border-amber-500/20",
    rose: "text-rose-400 bg-rose-500/10 border-rose-500/20",
  };
  return (
    <span
      className={`text-xs font-mono font-bold uppercase tracking-widest px-3 py-1 rounded-full border ${tones[tone]}`}
    >
      {children}
    </span>
  );
}

function GlassCard({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`rounded-2xl bg-gradient-to-b from-white/[0.06] to-white/[0.02] border border-white/10 backdrop-blur-xl p-5 shadow-lg ${className}`}
    >
      {children}
    </div>
  );
}

export default function SetuLanding() {
  return (
    <div className="flex min-h-screen flex-col bg-surface-base text-on-surface selection:bg-primary-container selection:text-surface-base">
      <header className="fixed inset-x-0 top-0 z-50 border-b border-white/10 bg-surface-base/85 pt-safe backdrop-blur-xl">
        <div className="mx-auto flex h-20 max-w-6xl items-center justify-between gap-3 px-6">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-primary-container via-surface-level-2 to-surface-level-3 text-xl shadow-[0_0_24px_rgba(255,153,51,0.35)]">
              🌉
            </div>
            <div>
              <div className="flex items-baseline gap-1.5 font-display">
                <span className="text-lg font-bold text-white">Setu</span>
                <span className="bg-gradient-to-r from-amber-400 to-rose-400 bg-clip-text text-lg font-bold text-transparent">
                  सेतु
                </span>
              </div>
              <p className="text-[11px] text-zinc-400">Neural Hindi Telephony</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <a
              href="#live-demo"
              className="hidden rounded-full border border-amber-300/40 bg-gradient-to-r from-amber-500 to-orange-500 px-4 py-2 text-xs font-bold uppercase tracking-wider text-slate-950 shadow-[0_0_25px_rgba(255,153,51,0.4)] sm:inline-flex"
            >
              Try Live
            </a>
            <Link
              href="/dashboard"
              className="rounded-full border border-cyan-500/30 bg-cyan-500/10 px-4 py-2 text-xs font-semibold text-cyan-300 transition hover:bg-cyan-500/20"
            >
              Access Dashboard
            </Link>
          </div>
        </div>
      </header>

      <main className="flex-1 pt-20">
        {/* Hero */}
        <section className="relative overflow-hidden px-6 pb-16 pt-8">
          <div className="pointer-events-none absolute -top-24 left-1/2 h-96 w-96 -translate-x-1/2 rounded-full bg-gradient-to-br from-indigo-600/30 via-cyan-500/20 to-amber-500/30 blur-[100px]" />
          <div className="relative mx-auto flex max-w-2xl flex-col items-center text-center">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3.5 py-1.5 text-xs text-zinc-200">
              <span className="h-2 w-2 animate-ping rounded-full bg-cyan-400" />
              Powered by Neural Hindi TTS
            </div>
            <h1 className="font-display text-3xl font-extrabold tracking-tight text-white sm:text-4xl lg:text-5xl">
              Setu calls your parents.{" "}
              <span className="bg-gradient-to-r from-amber-300 via-rose-300 to-cyan-300 bg-clip-text text-transparent">
                Every day. In Hindi.
              </span>
            </h1>
            <p className="mt-4 max-w-lg text-sm leading-relaxed text-zinc-400 sm:text-base">
              Medication reminders, emergency alerts, and nearby hospital search —
              through an autonomous voice agent. Zero smartphone or internet
              friction for elders.
            </p>
            <div id="hero-call" className="mt-10">
              <CallButton />
            </div>
            <p className="mt-6 max-w-md text-sm italic text-zinc-400">
              Pretend you&apos;re a 72-year-old who forgot her BP tablet
            </p>
            <div className="mt-8 flex w-full max-w-sm flex-col gap-2.5 sm:flex-row sm:max-w-none sm:justify-center">
              <Link
                href="/setup"
                className="flex min-h-[50px] items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/[0.04] px-6 text-sm font-semibold text-white transition hover:bg-white/[0.08]"
              >
                Set Up for My Parents
              </Link>
              <Link
                href="/dashboard"
                className="flex min-h-[50px] items-center justify-center gap-2 rounded-2xl border border-cyan-500/30 bg-cyan-500/10 px-6 text-sm font-semibold text-cyan-300 transition hover:bg-cyan-500/20"
              >
                Access Dashboard
              </Link>
            </div>
          </div>
        </section>

        {/* How it works */}
        <section
          id="how-it-works"
          className="bg-surface-level-1 px-6 py-16"
        >
          <div className="mx-auto max-w-lg text-center">
            <SectionBadge>System Architecture</SectionBadge>
            <h2 className="mt-3 font-display text-2xl font-extrabold text-white">
              How It Works
            </h2>
            <p className="mt-1 text-xs text-zinc-400">
              Three autonomous steps for peace of mind, miles away.
            </p>
          </div>
          <div className="mx-auto mt-8 flex max-w-lg flex-col gap-3">
            {[
              {
                n: "01",
                title: "Family sets up once",
                body: "Enter nickname, daily medicines, and call schedule — about 2 minutes online.",
                tone: "cyan",
              },
              {
                n: "02",
                title: "Setu calls every day",
                body: "A respectful Hindi voice call at their chosen hour on any phone or landline.",
                tone: "amber",
              },
              {
                n: "03",
                title: "Family stays informed",
                body: "WhatsApp and SMS alerts if medicine is skipped or distress is detected.",
                tone: "rose",
              },
            ].map((step) => (
              <GlassCard key={step.n}>
                <div className="flex gap-3.5">
                  <div
                    className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border font-mono text-xs font-bold ${
                      step.tone === "cyan"
                        ? "border-cyan-500/30 bg-cyan-500/10 text-cyan-300"
                        : step.tone === "amber"
                          ? "border-amber-500/30 bg-amber-500/10 text-amber-300"
                          : "border-rose-500/30 bg-rose-500/10 text-rose-300"
                    }`}
                  >
                    {step.n}
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white">{step.title}</h3>
                    <p className="mt-1 text-xs leading-relaxed text-zinc-400">
                      {step.body}
                    </p>
                  </div>
                </div>
              </GlassCard>
            ))}
          </div>
        </section>

        {/* Live demo */}
        <section id="live-demo" className="px-6 py-16">
          <div className="mx-auto max-w-md rounded-3xl border border-indigo-500/30 bg-gradient-to-b from-white/[0.08] via-[#090d20] to-[#040610] p-6 text-center shadow-[0_15px_40px_rgba(0,0,0,0.8)] backdrop-blur-2xl">
            <h2 className="font-display text-2xl font-extrabold text-white">
              Try it yourself, right now
            </h2>
            <p className="mt-2 text-xs leading-relaxed text-zinc-400">
              Start a live web call and experience how Setu listens and speaks in
              respectful Hindi.
            </p>
            <a
              href="#hero-call"
              className="my-8 inline-flex min-h-[48px] items-center justify-center rounded-full bg-primary-container px-6 text-sm font-bold text-surface-base shadow-[0_0_28px_rgba(255,153,51,0.35)]"
            >
              Start live call above ↑
            </a>
            <div className="mt-6 space-y-2 text-left">
              <p className="text-center text-[11px] font-mono uppercase tracking-wider text-zinc-500">
                Suggested test phrases
              </p>
              {[
                "नमस्ते सेतु, मैंने बीपी की दवाई ले ली है।",
                "सीने में हल्का दर्द है, क्या करूँ?",
                "पास का 24 घंटे खुला अस्पताल कहाँ है?",
              ].map((phrase) => (
                <div
                  key={phrase}
                  className="rounded-xl border border-white/10 bg-white/[0.04] p-3 text-xs text-zinc-300"
                >
                  {phrase}
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Problem & stats */}
        <section id="the-problem" className="bg-surface-level-1 px-6 py-16">
          <div className="mx-auto max-w-lg text-center">
            <SectionBadge tone="rose">The Eldercare Reality</SectionBadge>
            <h2 className="mt-3 font-display text-2xl font-extrabold text-white">
              Why Traditional Apps Fail Our Parents
            </h2>
          </div>
          <div className="mx-auto mt-8 flex max-w-lg flex-col gap-3">
            {[
              { stat: "149M", label: "Elderly Indians aged 60+ (2022 Census)" },
              { stat: "27%", label: "Live alone or only with spouse in hometown" },
              { stat: "51%", label: "Medication non-adherence (WHO-SAGE2)" },
            ].map((item) => (
              <GlassCard key={item.stat}>
                <span className="font-mono text-3xl font-black text-amber-300">
                  {item.stat}
                </span>
                <p className="mt-1 text-xs text-zinc-400">{item.label}</p>
              </GlassCard>
            ))}
          </div>
        </section>

        {/* Features */}
        <section id="features" className="px-6 py-16">
          <div className="mx-auto max-w-lg text-center">
            <SectionBadge tone="amber">Devoted Technology</SectionBadge>
            <h2 className="mt-3 font-display text-2xl font-extrabold text-white">
              Built with Care, Powered by AI
            </h2>
          </div>
          <div className="mx-auto mt-8 grid max-w-lg gap-3">
            {[
              {
                title: "Verified Medication",
                body: "Gentle Hindi check-ins that confirm pills were taken.",
              },
              {
                title: "Emergency Detection",
                body: "Distress keywords trigger alerts to adult children.",
              },
              {
                title: "Nearby Hospital Search",
                body: "24/7 pharmacies and ERs through voice in familiar Hindi.",
              },
              {
                title: "Remembers Everything",
                body: "Doctor advice and routines for dignified daily conversation.",
              },
              {
                title: "Two-Way Bridge (सेतु)",
                body: "Family voice notes played warmly at the end of check-ins.",
              },
              {
                title: "Scam Shield",
                body: "Warnings about suspicious calls in their area.",
              },
            ].map((f) => (
              <GlassCard key={f.title}>
                <h3 className="text-sm font-bold text-white">{f.title}</h3>
                <p className="mt-1 text-xs leading-relaxed text-zinc-400">
                  {f.body}
                </p>
              </GlassCard>
            ))}
          </div>
        </section>

        {/* Testimonial */}
        <section className="bg-surface-level-1 px-6 py-16">
          <div className="mx-auto max-w-lg rounded-3xl bg-surface-level-2 p-6 text-center">
            <p className="font-display text-lg italic leading-snug text-white">
              Built for the 140 million Indian elders whose children live far
              away.
            </p>
            <p className="mt-4 text-xs text-text-secondary">
              Trusted by caregiver families across India and the diaspora.
            </p>
          </div>
        </section>

        {/* Dashboard preview */}
        <section id="dashboard-preview" className="px-6 py-16">
          <div className="mx-auto max-w-lg text-center">
            <SectionBadge>Real-Time Reassurance</SectionBadge>
            <h2 className="mt-3 font-display text-2xl font-extrabold text-white">
              Caregiver Family Dashboard
            </h2>
            <p className="mt-1 text-xs text-zinc-400">
              Check logs, health sentiment, and call history anytime.
            </p>
          </div>
          <div className="mx-auto mt-8 max-w-lg rounded-3xl border border-white/10 bg-gradient-to-b from-white/[0.08] to-[#040610] p-6 backdrop-blur-xl">
            <div className="mb-4 flex items-center justify-between rounded-2xl border border-white/5 bg-white/[0.04] px-3 py-2.5">
              <div>
                <h4 className="text-xs font-bold text-white">Daily Log</h4>
                <span className="font-mono text-[10px] text-zinc-400">
                  Live synced
                </span>
              </div>
              <span className="rounded-full border border-emerald-500/30 bg-emerald-500/15 px-2 py-0.5 text-[10px] font-bold text-emerald-300">
                Live
              </span>
            </div>
            <Link
              href="/dashboard"
              className="flex min-h-[46px] w-full items-center justify-center gap-2 rounded-xl border border-cyan-500/30 bg-gradient-to-r from-cyan-500/20 to-indigo-500/20 text-xs font-bold text-cyan-300 transition hover:from-cyan-500/30 hover:to-indigo-500/30"
            >
              Open Caregiver Dashboard
            </Link>
          </div>
        </section>

        <footer className="border-t border-white/5 bg-surface-level-1 px-6 py-12 text-center">
          <div className="flex items-center justify-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary-container text-sm font-bold text-surface-base">
              से
            </span>
            <span className="font-semibold text-white">Setu | सेतु</span>
          </div>
          <p className="mt-2 text-xs text-zinc-400">
            The daily Hindi voice call that keeps your parents safe.
          </p>
          <div className="mt-4 flex flex-wrap items-center justify-center gap-3 text-xs text-text-warm">
            <a href="#live-demo" className="hover:underline">
              Try Setu
            </a>
            <span className="text-zinc-600">•</span>
            <Link href="/setup" className="hover:underline">
              Set Up
            </Link>
            <span className="text-zinc-600">•</span>
            <Link href="/dashboard" className="hover:underline">
              Dashboard
            </Link>
          </div>
          <p className="mt-6 text-[11px] text-zinc-500">
            Built for Bolna × YC Symphony Buildathon 2026
          </p>
        </footer>
      </main>
    </div>
  );
}
