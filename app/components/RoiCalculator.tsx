"use client";

import { useMemo, useState } from "react";

const SETU_MONTHLY_COST = 2499;

function formatInr(value: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(Math.round(value));
}

function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}

type SliderFieldProps = {
  id: string;
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (value: number) => void;
  formatValue?: (n: number) => string;
  warm?: boolean;
};

function SliderField({
  id,
  label,
  value,
  min,
  max,
  step,
  onChange,
  formatValue = (n) => String(n),
  warm = true,
}: SliderFieldProps) {
  const labelCls = warm
    ? "text-xs font-medium text-warm-ink-muted"
    : "text-xs font-medium text-slate-300";
  const inputCls = warm
    ? "w-28 rounded-lg border border-warm-border-gentle bg-white px-2 py-1 text-right text-sm text-warm-ink focus:border-warm-primary focus:outline-none focus:ring-1 focus:ring-warm-primary/30"
    : "w-28 rounded-lg border border-slate-700 bg-surface-level-2 px-2 py-1 text-right text-sm text-white focus:border-primary-container focus:outline-none focus:ring-1 focus:ring-primary-container/40";
  const rangeCls = warm
    ? "h-2 w-full cursor-pointer appearance-none rounded-full bg-warm-container-high accent-warm-primary"
    : "h-2 w-full cursor-pointer appearance-none rounded-full bg-slate-800 accent-primary-container";
  const hintCls = warm ? "text-[10px] text-warm-ink-muted" : "text-[10px] text-slate-500";

  return (
    <div>
      <div className="mb-2 flex items-end justify-between gap-2">
        <label htmlFor={id} className={labelCls}>
          {label}
        </label>
        <input
          type="number"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => {
            const parsed = Number(e.target.value);
            if (Number.isFinite(parsed)) {
              onChange(clamp(parsed, min, max));
            }
          }}
          className={inputCls}
        />
      </div>
      <input
        id={id}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className={rangeCls}
      />
      <div className={`mt-1 flex justify-between ${hintCls}`}>
        <span>{formatValue(min)}</span>
        <span>{formatValue(max)}</span>
      </div>
    </div>
  );
}

type RoiCalculatorProps = {
  variant?: "warm" | "dark";
  className?: string;
};

export default function RoiCalculator({
  variant = "warm",
  className = "",
}: RoiCalculatorProps) {
  const warm = variant === "warm";
  const [monthlyIncomingCalls, setMonthlyIncomingCalls] = useState(150);
  const [missedCallPercent, setMissedCallPercent] = useState(30);
  const [avgRevenuePerAppointment, setAvgRevenuePerAppointment] = useState(800);

  const metrics = useMemo(() => {
    const missedCallsPerMonth =
      monthlyIncomingCalls * (missedCallPercent / 100);
    const revenueLostPerMonth = missedCallsPerMonth * avgRevenuePerAppointment;
    const recoverablePerMonth = revenueLostPerMonth;
    const roiMultiplier =
      SETU_MONTHLY_COST > 0 ? recoverablePerMonth / SETU_MONTHLY_COST : 0;

    return {
      missedCallsPerMonth,
      revenueLostPerMonth,
      recoverablePerMonth,
      roiMultiplier,
    };
  }, [monthlyIncomingCalls, missedCallPercent, avgRevenuePerAppointment]);

  const shellCls = warm
    ? "rounded-2xl border border-warm-border-gentle bg-white p-5 shadow-warm sm:p-6"
    : "rounded-2xl border border-slate-800 bg-surface-level-1 p-5 text-left shadow-xl sm:p-6";

  return (
    <div className={`text-left ${shellCls} ${className}`}>
      <div className="mb-5 text-center sm:text-left">
        <p
          className={
            warm
              ? "text-xs font-semibold uppercase tracking-wider text-warm-primary"
              : "text-xs font-semibold uppercase tracking-wider text-primary-container"
          }
        >
          Clinic revenue
        </p>
        <h3
          className={
            warm
              ? "mt-1 font-display text-xl font-semibold text-warm-ink"
              : "mt-1 text-lg font-bold text-white"
          }
        >
          Missed Call Revenue Calculator
        </h3>
        <p
          className={
            warm
              ? "mt-1 text-xs text-warm-ink-muted"
              : "mt-1 text-xs text-slate-400"
          }
        >
          Estimate revenue lost when peak-hour calls go unanswered — and what
          inbound AI capture can recover
        </p>
      </div>

      <div className="space-y-5">
        <SliderField
          id="mcr-incoming"
          label="Monthly incoming calls"
          value={monthlyIncomingCalls}
          min={50}
          max={500}
          step={10}
          onChange={setMonthlyIncomingCalls}
          warm={warm}
        />
        <SliderField
          id="mcr-missed"
          label="% calls missed during peak hours"
          value={missedCallPercent}
          min={10}
          max={50}
          step={1}
          onChange={setMissedCallPercent}
          formatValue={(n) => `${n}%`}
          warm={warm}
        />
        <SliderField
          id="mcr-revenue"
          label="Average revenue per appointment (₹)"
          value={avgRevenuePerAppointment}
          min={300}
          max={2000}
          step={50}
          onChange={setAvgRevenuePerAppointment}
          formatValue={(n) => formatInr(n)}
          warm={warm}
        />
      </div>

      <div
        className={
          warm
            ? "mt-6 space-y-2 rounded-xl border border-warm-primary/20 bg-warm-linen p-4"
            : "mt-6 space-y-2 rounded-xl border border-primary-container/25 bg-[#0A0F1E]/80 p-4"
        }
      >
        <p
          className={
            warm ? "text-sm text-warm-ink-muted" : "text-sm text-slate-300"
          }
        >
          Missed calls per month:{" "}
          <span
            className={
              warm ? "font-semibold text-warm-ink" : "font-semibold text-white"
            }
          >
            {Math.round(metrics.missedCallsPerMonth).toLocaleString("en-IN")}
          </span>
        </p>
        <p
          className={
            warm ? "text-sm text-warm-ink-muted" : "text-sm text-slate-300"
          }
        >
          Revenue lost per month:{" "}
          <span
            className={
              warm ? "font-semibold text-warm-ink" : "font-semibold text-white"
            }
          >
            {formatInr(metrics.revenueLostPerMonth)}
          </span>
        </p>
        <p
          className={
            warm
              ? "text-2xl font-bold leading-tight text-warm-primary sm:text-3xl"
              : "text-2xl font-bold leading-tight text-primary-container sm:text-3xl"
          }
        >
          Recover {formatInr(metrics.recoverablePerMonth)}/month with Setu
        </p>
        <p
          className={
            warm
              ? "text-sm font-semibold text-warm-secondary"
              : "text-sm font-semibold text-amber-200/90"
          }
        >
          Setu costs {formatInr(SETU_MONTHLY_COST)}/month ·{" "}
          {metrics.roiMultiplier.toFixed(1)}x return on investment
        </p>
      </div>

      <p
        className={
          warm
            ? "mt-4 text-center text-[11px] leading-snug text-warm-ink-muted sm:text-left"
            : "mt-4 text-center text-[11px] leading-snug text-slate-500 sm:text-left"
        }
      >
        Illustrative model for inbound appointment capture. Assumes recovered
        calls convert at your average appointment value; not a guarantee of
        revenue.
      </p>
    </div>
  );
}
