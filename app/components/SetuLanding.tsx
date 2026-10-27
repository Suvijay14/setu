import Image from "next/image";
import Link from "next/link";
import CallButton from "./CallButton";

const HERO_GRANDMOTHER_IMG =
  "https://lh3.googleusercontent.com/aida-public/AB6AXuCL7cMDE-1UN5Hx4vUd1gkKXjnmZrlp5YTQxIAqUXD2RtYYjwAmhn2P0LLDPlSMIMnOlTUWQX2KWcl-UATyPtBTSQZrz533Hs9dd9EQoR5pgSWz96zcgEXWLXQWj3RpGQkNWPchYICYGz6mpjP0dbo8IaliO4Z0GIJix2Rw_7EvvW_wFIJe4RYSLd1pqdqtzBpzNAH9-1f6VvvT9SsNqLSKbJtUjUoFxlB0lLccWSYtFYmRiDSNPPv6OQ";

const STORY_GRANDFATHER_IMG =
  "https://lh3.googleusercontent.com/aida-public/AB6AXuDMX0fgiK_IzGWDUsrRfLzr4icJAvHsperVFHFXpSugho1OOExmHi-clr-Fgs3u9wmmPnoKLBeEJzacl1skD_INtswdmHWNqKl06ilKsyNkl89oEiHxk2mNfHE09gUHNj-zHEjxlICJ-EWvOkQR9lYmpH0qJzNrPncMQMyBJ376TaO0Y4wBuC4iNn5BRaH0q0EMMpaqBEq3r-mW766KMfiTrm805tcInrzTatoLpxwBrRnuXot-Twp2sw";

function Icon({ name, className = "" }: { name: string; className?: string }) {
  return (
    <span className={`material-symbols-outlined ${className}`} aria-hidden>
      {name}
    </span>
  );
}

export default function SetuLanding() {
  return (
    <div className="flex min-h-screen flex-col bg-surface-base text-on-surface selection:bg-primary-container selection:text-surface-base">
      <header className="fixed inset-x-0 top-0 z-50 border-b border-amber-900/20 bg-[#0E1322]/90 pt-safe backdrop-blur-md shadow-[0_4px_24px_rgba(0,0,0,0.35)]">
        <div className="mx-auto flex h-16 max-w-lg items-center justify-between gap-3 px-5 sm:max-w-6xl sm:px-6">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-full border border-amber-200/30 bg-gradient-to-br from-amber-500 to-orange-600 font-display text-lg font-black text-[#1E1102] shadow-sm">
              से
            </div>
            <div>
              <div className="flex items-baseline gap-1.5">
                <span className="font-display text-xl font-bold tracking-tight text-white">
                  Setu
                </span>
                <span className="font-display text-sm font-semibold text-amber-300/90">
                  | सेतु
                </span>
              </div>
              <p className="text-[10px] font-medium tracking-wide text-amber-200/60">
                Daily Elder Voice Companion
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <a
              href="#live-demo"
              className="flex items-center gap-1.5 rounded-full bg-gradient-to-r from-amber-500 to-orange-500 px-3.5 py-1.5 text-xs font-bold tracking-wide text-slate-950 shadow-sm transition active:scale-95"
            >
              <Icon name="call" className="text-[15px]" />
              Try Live
            </a>
            <Link
              href="/dashboard"
              className="hidden rounded-full border border-amber-400/30 bg-amber-500/10 px-3 py-1.5 text-xs font-semibold text-amber-200 sm:inline-flex"
            >
              Dashboard
            </Link>
          </div>
        </div>
      </header>

      <main className="relative flex-1 pb-40 pt-16">
        {/* Hero */}
        <section className="relative flex flex-col items-center overflow-hidden px-5 pb-8 pt-6">
          <div className="pointer-events-none absolute -top-12 left-1/2 h-80 w-80 -translate-x-1/2 rounded-full bg-amber-600/15 blur-[90px]" />
          <div className="relative mx-auto flex w-full max-w-sm flex-col items-center text-center lg:max-w-2xl">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-amber-500/25 bg-amber-500/10 px-3.5 py-1.5 text-xs font-medium tracking-wide text-amber-300 shadow-sm">
              <span className="h-2 w-2 rounded-full bg-amber-400" />
              <span className="font-display italic">
                Daily Hindi Check-ins • 100% Voice
              </span>
            </div>
            <h1 className="mb-3 max-w-sm font-display text-[32px] font-semibold leading-[1.22] text-white">
              Setu calls your parents.{" "}
              <span className="font-normal italic text-amber-300">
                Every day. In Hindi.
              </span>
            </h1>
            <p className="mb-5 max-w-xs text-sm leading-relaxed text-zinc-300/90">
              Gentle medication reminders, morning chai greetings, and immediate
              family alerts — like a loving child calling home every morning.
            </p>
            <div className="mb-5 flex w-full max-w-sm flex-col gap-2.5">
              <a
                href="#live-demo"
                className="flex min-h-[50px] w-full items-center justify-center gap-2 rounded-xl border border-amber-200/40 bg-gradient-to-r from-amber-400 via-orange-500 to-amber-500 text-sm font-bold tracking-wide text-slate-950 shadow-[0_4px_20px_rgba(245,158,11,0.25)] transition active:scale-95"
              >
                <Icon name="call" className="text-[19px]" />
                Try a Live Hindi Call
              </a>
              <Link
                href="/setup"
                className="flex min-h-[46px] w-full items-center justify-center gap-1.5 rounded-xl border border-white/15 bg-white/[0.06] text-xs font-medium text-white transition hover:bg-white/[0.1] active:scale-95"
              >
                Set Up for My Parents
                <Icon name="arrow_forward" className="text-[16px] text-amber-300" />
              </Link>
            </div>
            <div className="mb-6 flex w-full max-w-sm items-center justify-center gap-2 rounded-lg border border-amber-900/30 bg-surface-level-1 px-3 py-2 text-center">
              <Icon name="phone_enabled" className="text-[18px] text-amber-400" />
              <span className="text-[11px] leading-tight text-amber-200/80">
                Works on JioPhone, BSNL landlines &amp; basic keypad phones. No
                smartphone required.
              </span>
            </div>
            <div className="relative w-full max-w-sm overflow-hidden rounded-3xl border border-amber-500/20 bg-surface-level-1 shadow-2xl">
              <Image
                src={HERO_GRANDMOTHER_IMG}
                alt="Smiling Indian grandmother having morning call on phone"
                width={800}
                height={600}
                className="aspect-[4/3] w-full object-cover object-center"
                priority
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#0D111E] via-transparent to-transparent opacity-90" />
              <div className="absolute inset-x-3.5 bottom-3.5 flex items-end justify-between gap-2">
                <div className="rounded-2xl border border-amber-300/20 bg-[#12192B]/90 px-3.5 py-2 backdrop-blur-md">
                  <p className="font-display text-xs italic text-amber-200">
                    “नमस्ते दादीजी, आज सुबह कैसी तबीयत है?”
                  </p>
                  <span className="mt-0.5 block font-sans text-[10px] text-zinc-400">
                    Dadi Asha, 74 • Daily 9:00 AM check-in
                  </span>
                </div>
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-emerald-400/40 bg-emerald-500/20 text-emerald-300">
                  <Icon name="verified" className="text-[18px]" />
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Story */}
        <section className="border-y border-white/5 bg-surface-level-1 px-5 py-10">
          <div className="mx-auto flex w-full max-w-sm flex-col lg:max-w-2xl">
            <span className="mb-1 font-display text-xs font-semibold italic text-amber-400">
              Caring from miles away
            </span>
            <h2 className="mb-3 font-display text-2xl font-semibold leading-snug tracking-tight text-white">
              You are in Bengaluru or the Bay Area.{" "}
              <span className="font-normal text-zinc-300">
                They are in Lucknow or Jaipur.
              </span>
            </h2>
            <p className="mb-5 text-xs leading-relaxed text-zinc-400">
              Between back-to-back meetings and time zones, you worry:{" "}
              <em>Did Dad take his blood pressure pill? Did Mom feel dizzy again?</em>{" "}
              They won&apos;t mention minor aches because they never want to
              trouble you.
            </p>
            <div className="relative mb-5 overflow-hidden rounded-2xl border border-white/10 shadow-lg">
              <Image
                src={STORY_GRANDFATHER_IMG}
                alt="Indian grandfather having morning chai while listening to phone call"
                width={800}
                height={600}
                className="aspect-[4/3] w-full object-cover"
              />
              <div className="absolute inset-x-2.5 bottom-2.5 rounded-xl border border-white/10 bg-black/60 px-3 py-1.5 backdrop-blur-md">
                <p className="text-[11px] text-zinc-200">
                  “Setu feels like a caring family member checking in over
                  morning chai.”
                </p>
              </div>
            </div>
            <div className="mb-2 grid grid-cols-2 gap-3">
              <div className="flex flex-col rounded-2xl border border-white/5 bg-surface-level-2 p-3.5">
                <span className="mb-0.5 font-display text-2xl font-bold text-amber-300">
                  149M
                </span>
                <span className="mb-1 text-xs font-medium text-white">
                  Aging parents
                </span>
                <span className="text-[10px] leading-snug text-zinc-400">
                  In India, over 149M elders require daily health oversight.
                </span>
              </div>
              <div className="flex flex-col rounded-2xl border border-white/5 bg-surface-level-2 p-3.5">
                <span className="mb-0.5 font-display text-2xl font-bold text-amber-300">
                  27%
                </span>
                <span className="mb-1 text-xs font-medium text-white">
                  Living alone
                </span>
                <span className="text-[10px] leading-snug text-zinc-400">
                  Living independently while their adult children work elsewhere.
                </span>
              </div>
            </div>
          </div>
        </section>

        {/* Live demo + Bolna */}
        <section
          id="live-demo"
          className="flex flex-col items-center px-5 py-10"
        >
          <div className="relative mx-auto w-full max-w-sm overflow-hidden rounded-3xl border border-amber-500/25 bg-surface-level-2 p-5 text-center shadow-xl">
            <div className="pointer-events-none absolute -right-10 -top-10 h-36 w-36 rounded-full bg-amber-500/10 blur-2xl" />
            <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-full border border-amber-500/30 bg-amber-500/15 text-amber-400">
              <Icon name="hearing" className="text-[22px]" />
            </div>
            <h2 className="mb-1 font-display text-xl font-bold text-white">
              Hear Setu Speak in Hindi
            </h2>
            <p className="mb-4 max-w-xs text-xs text-zinc-400">
              Respectful, unhurried, and culturally grounded — start a real web
              call below.
            </p>
            <div className="mb-4 flex w-full flex-col items-center rounded-2xl border border-amber-400/20 bg-[#111728] p-4">
              <CallButton variant="warm" />
              <p className="mt-4 max-w-xs text-xs italic text-zinc-400">
                Pretend you&apos;re a 72-year-old who forgot her BP tablet
              </p>
              <div className="mt-3 flex h-6 items-center justify-center gap-1.5 px-4 opacity-40">
                {[2, 3.5, 5, 4, 2.5].map((h, i) => (
                  <span
                    key={i}
                    className="w-1.5 rounded-full bg-amber-400/80"
                    style={{ height: `${h * 4}px` }}
                  />
                ))}
              </div>
            </div>
            <div className="mb-4 w-full text-left">
              <span className="mb-2 block font-display text-[11px] font-medium italic text-amber-200/70">
                Sample authentic elder conversations:
              </span>
              <div className="flex flex-col gap-2">
                {[
                  "“नमस्ते बेटा, नाश्ते के बाद बीपी की गोली ले ली।”",
                  "“आज छाती में हल्का सा भारीपन लग रहा है।”",
                ].map((phrase) => (
                  <div
                    key={phrase}
                    className="flex items-center justify-between rounded-xl border border-white/10 bg-white/[0.04] p-2.5 text-left text-xs"
                  >
                    <span className="font-display text-zinc-200">{phrase}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="flex w-full items-start gap-2.5 rounded-2xl border border-emerald-600/30 bg-[#091712] p-3 text-left">
              <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-emerald-500/30 bg-emerald-500/20 text-emerald-400">
                <Icon name="chat" className="text-[16px]" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-emerald-400">
                    WhatsApp to Child
                  </span>
                  <span className="font-mono text-[9px] text-emerald-300/60">
                    9:04 AM
                  </span>
                </div>
                <p className="mt-1 text-xs leading-snug text-zinc-200">
                  ✅ <strong>Maa&apos;s Morning Update:</strong> Spoke for 2
                  mins. BP medicine taken after poha. Mood cheerful. No
                  discomfort reported.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* How it works */}
        <section
          id="how-it-works"
          className="border-t border-white/5 bg-surface-level-1 px-5 py-10"
        >
          <div className="mx-auto mb-5 max-w-sm text-center">
            <span className="font-display text-xs italic text-amber-400">
              Simple for you, seamless for them
            </span>
            <h2 className="mt-1 font-display text-2xl font-semibold text-white">
              How Setu Works
            </h2>
          </div>
          <div className="mx-auto flex max-w-sm flex-col gap-3">
            {[
              {
                n: "1",
                title: "Share their routine once",
                body: "Tell us their medicines, preferred morning call time, and local doctor details in 2 minutes.",
              },
              {
                n: "2",
                title: "Setu calls on regular phone",
                body: "A respectful Hindi call rings their landline or keypad mobile. No apps, no logins, no Wi-Fi needed.",
              },
              {
                n: "3",
                title: "Peace of mind on your phone",
                body: "You receive a reassuring summary on WhatsApp. If medicines are skipped or distress is sensed, you are called immediately.",
              },
            ].map((step) => (
              <div
                key={step.n}
                className="flex items-start gap-3.5 rounded-2xl border border-white/5 bg-surface-level-2 p-4"
              >
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-amber-500/30 bg-amber-500/15 font-display text-sm font-bold text-amber-300">
                  {step.n}
                </div>
                <div>
                  <h3 className="mb-0.5 text-sm font-semibold text-white">
                    {step.title}
                  </h3>
                  <p className="text-xs leading-relaxed text-zinc-400">
                    {step.body}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Features */}
        <section id="features" className="px-5 py-10">
          <div className="mx-auto mb-5 max-w-sm text-center">
            <span className="font-display text-xs italic text-amber-400">
              Devoted Care
            </span>
            <h2 className="mt-1 font-display text-2xl font-semibold text-white">
              Thoughtful Indian Eldercare
            </h2>
          </div>
          <div className="mx-auto flex max-w-sm flex-col gap-3">
            {[
              {
                icon: "pill",
                title: "Gentle Medication Verification",
                body: (
                  <>
                    Setu kindly asks:{" "}
                    <em className="text-amber-200">
                      “दादी, क्या आपने नाश्ते के बाद वाली पीली गोली ले ली?”
                    </em>{" "}
                    and listens for confirmation.
                  </>
                ),
              },
              {
                icon: "emergency",
                title: "Instant Distress Alerts",
                body: "Senses distress signals (चक्कर, सीने में दर्द, गिर गए) and immediately dials you and local emergency contacts.",
                coral: true,
              },
              {
                icon: "local_hospital",
                title: "Nearby Hospital & Pharmacy Search",
                body: "Parents can ask Setu naturally for open pharmacies or clinics in their colony without touching a screen.",
              },
              {
                icon: "family_restroom",
                title: "Voice Notes from Grandchildren",
                body: "Record a message on your dashboard. Setu lovingly plays it for Dadi at the end of the morning call.",
              },
            ].map((f) => (
              <div
                key={f.title}
                className="flex flex-col rounded-2xl border border-white/10 bg-surface-level-1 p-4"
              >
                <div
                  className={`mb-2.5 flex h-9 w-9 items-center justify-center rounded-xl border ${
                    f.coral
                      ? "border-rose-500/30 bg-rose-500/15 text-alert-coral"
                      : "border-amber-500/30 bg-amber-500/15 text-amber-400"
                  }`}
                >
                  <Icon name={f.icon} className="text-[20px]" />
                </div>
                <h3 className="mb-1 text-sm font-semibold text-white">
                  {f.title}
                </h3>
                <p className="text-xs leading-relaxed text-zinc-400">{f.body}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Testimonial */}
        <section className="border-t border-white/5 bg-surface-level-1 px-5 py-10">
          <div className="relative mx-auto max-w-sm rounded-3xl border border-amber-500/20 bg-surface-level-2 p-5 text-center">
            <div className="mb-1 font-display text-3xl leading-none text-amber-400">
              “
            </div>
            <p className="mb-3 font-display text-sm italic leading-relaxed text-white">
              My mother in Pune lives alone. She loves Setu&apos;s polite voice
              and proudly tells me every Sunday that she never misses her BP
              medicine now. It&apos;s the best gift I gave her.
            </p>
            <div className="mb-2 flex items-center justify-center gap-2">
              <span className="text-xs font-semibold text-amber-200">
                Rohit S.
              </span>
              <span className="text-[10px] text-zinc-400">
                • Software Engineer, Sunnyvale, CA
              </span>
            </div>
            <div className="inline-flex items-center gap-1 text-xs text-amber-400">
              <span>★★★★★</span>
              <span className="ml-1 text-[11px] text-zinc-300">
                Trusted by 850+ NRI &amp; Indian families
              </span>
            </div>
          </div>
        </section>

        {/* Dashboard preview */}
        <section
          id="dashboard-preview"
          className="flex flex-col items-center px-5 py-10"
        >
          <div className="mb-4 max-w-sm text-center">
            <span className="font-display text-xs italic text-amber-400">
              Caregiver Reassurance
            </span>
            <h2 className="mt-1 font-display text-xl font-semibold text-white">
              Your Parent&apos;s Daily Health Card
            </h2>
          </div>
          <div className="w-full max-w-sm rounded-3xl border border-white/10 bg-surface-level-2 p-4 shadow-xl">
            <div className="mb-3 flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-full border border-amber-500/30 bg-amber-500/15 font-display text-xs font-bold text-amber-300">
                  दा
                </div>
                <div>
                  <h4 className="text-xs font-bold text-white">
                    Dadi Asha Devi (Pune)
                  </h4>
                  <span className="text-[10px] text-zinc-400">
                    Morning Call • 9:02 AM Today
                  </span>
                </div>
              </div>
              <span className="flex items-center gap-1 rounded-full border border-emerald-500/30 bg-emerald-500/15 px-2 py-0.5 text-[10px] font-medium text-emerald-300">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                Completed
              </span>
            </div>
            <div className="mb-4 flex flex-col gap-2">
              {[
                ["Amlodipine 5mg (BP)", "Taken after breakfast"],
                ["Metformin 500mg", "Taken with morning tea"],
                ["Overall Well-being", "Cheerful, slept well"],
              ].map(([label, value]) => (
                <div
                  key={label}
                  className="flex items-center justify-between rounded-xl border border-white/5 bg-surface-base px-3 py-2"
                >
                  <span className="text-xs text-zinc-300">{label}</span>
                  <span className="text-[11px] font-medium text-emerald-300">
                    {value}
                  </span>
                </div>
              ))}
            </div>
            <Link
              href="/dashboard"
              className="flex min-h-[44px] w-full items-center justify-center gap-1.5 rounded-xl border border-amber-400/30 bg-amber-500/15 text-xs font-medium text-amber-300 transition hover:bg-amber-500/25 active:scale-95"
            >
              Open Family Caregiver View
              <Icon name="arrow_forward" className="text-[16px]" />
            </Link>
          </div>
        </section>

        <footer className="flex flex-col items-center border-t border-white/5 bg-surface-level-1 px-5 pb-8 pt-10 text-center">
          <div className="mb-1.5 flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-amber-500 font-display text-xs font-bold text-[#1E1102]">
              से
            </div>
            <div className="flex items-baseline gap-1">
              <span className="font-display text-base font-bold text-white">
                Setu
              </span>
              <span className="font-display text-sm text-amber-400">
                | सेतु
              </span>
            </div>
          </div>
          <p className="mb-4 max-w-xs text-xs text-zinc-400">
            The gentle daily Hindi voice call keeping your elderly parents safe,
            healthy, and loved.
          </p>
          <div className="mb-4 flex flex-wrap items-center justify-center gap-3 text-xs text-amber-300/80">
            <a href="#live-demo" className="hover:underline">
              Try Setu
            </a>
            <span>•</span>
            <Link href="/setup" className="hover:underline">
              Set Up Routine
            </Link>
            <span>•</span>
            <Link href="/dashboard" className="hover:underline">
              Caregiver Login
            </Link>
          </div>
          <p className="flex items-center justify-center gap-1 text-xs text-zinc-400">
            <span>Made with</span>
            <span className="text-alert-coral">❤️</span>
            <span>for Indian families worldwide</span>
          </p>
          <p className="mt-3">
            <Link
              href="/org"
              className="text-[11px] text-zinc-500 underline-offset-2 hover:text-amber-300/80 hover:underline"
            >
              For clinics →
            </Link>
          </p>
        </footer>
      </main>

      <div className="pointer-events-none fixed inset-x-0 bottom-20 z-40 flex justify-center px-5">
        <a
          href="#live-demo"
          className="pointer-events-auto flex min-h-[50px] w-full max-w-sm items-center justify-center gap-2 rounded-xl border border-amber-200/50 bg-gradient-to-r from-amber-400 via-orange-500 to-amber-500 px-4 py-3 text-sm font-bold tracking-wide text-slate-950 shadow-[0_4px_25px_rgba(245,158,11,0.4)] transition active:scale-95"
        >
          <Icon name="call" className="text-[20px]" />
          Try Live Hindi Call
          <span className="rounded-full bg-black/20 px-2 py-0.5 font-sans text-[10px] font-extrabold text-black">
            FREE
          </span>
        </a>
      </div>

      <nav className="fixed inset-x-0 bottom-0 z-50 border-t border-amber-900/20 bg-[#0B0F1C]/95 pb-safe backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-lg items-center justify-around px-5">
          <a
            href="#"
            className="flex min-w-[56px] flex-col items-center justify-center gap-0.5 text-amber-400"
          >
            <Icon name="home" className="text-[20px]" />
            <span className="font-sans text-[10px] font-medium">Home</span>
          </a>
          <a
            href="#live-demo"
            className="flex min-w-[56px] flex-col items-center justify-center gap-0.5 text-zinc-400 transition hover:text-white"
          >
            <Icon name="phone_in_talk" className="text-[20px]" />
            <span className="font-sans text-[10px] font-medium">Demo</span>
          </a>
          <Link
            href="/dashboard"
            className="flex min-w-[56px] flex-col items-center justify-center gap-0.5 text-zinc-400 transition hover:text-white"
          >
            <Icon name="favorite" className="text-[20px]" />
            <span className="font-sans text-[10px] font-medium">Caregiver</span>
          </Link>
        </div>
      </nav>
    </div>
  );
}
