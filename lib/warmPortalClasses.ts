/** Shared warm editorial UI tokens for family/org portals (matches landing). */
export const wp = {
  page: "min-h-screen bg-warm-cream text-warm-ink",
  pageCenter:
    "flex min-h-screen flex-col items-center justify-center bg-warm-cream px-4 text-warm-ink",
  loading:
    "flex min-h-screen items-center justify-center bg-warm-cream text-warm-ink-muted",
  container: "mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8",
  brand: "font-display text-3xl font-semibold tracking-tight text-warm-primary",
  brandSm: "font-display text-2xl font-semibold tracking-tight text-warm-ink",
  h1: "font-display text-2xl font-semibold tracking-tight text-warm-ink",
  subtitle: "text-sm leading-relaxed text-warm-ink-muted",
  label:
    "text-xs font-semibold uppercase tracking-wide text-warm-ink-muted",
  card: "rounded-2xl border border-warm-border-gentle bg-white shadow-sm",
  cardInset: "rounded-2xl border border-warm-border-gentle bg-warm-linen/80",
  stat: "rounded-2xl border border-warm-border-gentle bg-white p-5 shadow-sm",
  input:
    "mt-2 w-full rounded-xl border border-warm-border-gentle bg-warm-paper px-4 py-3 text-warm-ink placeholder:text-warm-ink-muted/50 focus:border-warm-primary focus:outline-none focus:ring-2 focus:ring-warm-primary/15 disabled:opacity-60",
  select:
    "mt-2 w-full rounded-xl border border-warm-border-gentle bg-warm-paper px-4 py-3 text-warm-ink focus:border-warm-primary focus:outline-none focus:ring-2 focus:ring-warm-primary/15",
  btnPrimary:
    "rounded-xl bg-warm-primary px-4 py-3 text-sm font-semibold text-white transition hover:bg-warm-primary-container disabled:cursor-not-allowed disabled:opacity-60",
  btnSecondary:
    "rounded-xl border border-warm-border-gentle bg-warm-linen px-4 py-2 text-sm font-medium text-warm-ink transition hover:bg-warm-container-high",
  link: "text-warm-primary underline-offset-2 hover:underline",
  linkMuted:
    "text-warm-ink-muted underline-offset-2 hover:text-warm-primary hover:underline",
  demoBox:
    "rounded-xl border border-warm-primary/25 bg-warm-linen px-4 py-3 text-left",
  tableWrap:
    "overflow-hidden rounded-2xl border border-warm-border-gentle bg-white shadow-sm",
  thead: "bg-warm-linen text-xs uppercase tracking-wide text-warm-ink-muted",
  tbody: "divide-y divide-warm-border-gentle bg-white",
  tabActive: "rounded-xl bg-warm-primary text-white shadow-sm",
  tabIdle:
    "rounded-xl border border-warm-border-gentle bg-white text-warm-ink-muted hover:bg-warm-linen hover:text-warm-ink",
  success: "text-sm text-warm-secondary",
  error: "text-sm text-warm-error",
} as const;
