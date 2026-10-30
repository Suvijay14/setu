"use client";

import { useMemo, useState } from "react";

const READMISSION_REDUCTION = 0.3;
const SETU_COST_PER_BED_YEAR = 8000;
const BEDS_PER_30_PATIENTS = 30;

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
}: SliderFieldProps) {
  return (
    <div>
      <div className="mb-2 flex items-end justify-between gap-2">
        <label htmlFor={id} className="text-xs font-medium text-slate-300">
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
          className="w-28 rounded-lg border border-slate-700 bg-surface-level-2 px-2 py-1 text-right text-sm text-white focus:border-primary-container focus:outline-none focus:ring-1 focus:ring-primary-container/40"
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
        className="h-2 w-full cursor-pointer appearance-none rounded-full bg-slate-800 accent-primary-container"
      />
      <div className="mt-1 flex justify-between text-[10px] text-slate-500">
        <span>{formatValue(min)}</span>
        <span>{formatValue(max)}</span>
      </div>
    </div>
  );
}

export default function RoiCalculator() {
  const [monthlyPatients, setMonthlyPatients] = useState(500);
  const [readmissionRate, setReadmissionRate] = useState(18);
  const [avgReadmissionCost, setAvgReadmissionCost] = useState(45000);

  const metrics = useMemo(() => {
    const monthlyReadmissions =
      monthlyPatients * (readmissionRate / 100);
    const monthlyReadmissionCost =
      monthlyReadmissions * avgReadmissionCost;
    const patientsSaved = monthlyReadmissions * READMISSION_REDUCTION;
    const monthlySavings = patientsSaved * avgReadmissionCost;
    const annualSavings = monthlySavings * 12;
    const setuAnnualCost =
      SETU_COST_PER_BED_YEAR * (monthlyPatients / BEDS_PER_30_PATIENTS);
    const netRoi = annualSavings - setuAnnualCost;
    const roiMultiplier =
      setuAnnualCost > 0 ? annualSavings / setuAnnualCost : 0;

    return {
      monthlyReadmissions,
      monthlyReadmissionCost,
      patientsSaved,
      monthlySavings,
      annualSavings,
      setuAnnualCost,
      netRoi,
      roiMultiplier,
    };
  }, [monthlyPatients, readmissionRate, avgReadmissionCost]);

  return (
    <div className="mx-auto mt-8 max-w-2xl rounded-2xl border border-slate-800 bg-surface-level-1 p-5 text-left shadow-xl sm:p-6">
      <div className="mb-5 text-center sm:text-left">
        <p className="text-xs font-semibold uppercase tracking-wider text-primary-container">
          Hospital ROI
        </p>
        <h2 className="mt-1 text-lg font-bold text-white">
          Readmission savings calculator
        </h2>
        <p className="mt-1 text-xs text-slate-400">
          Estimate impact of 30% fewer readmissions with daily voice follow-up
        </p>
      </div>

      <div className="space-y-5">
        <SliderField
          id="roi-patients"
          label="Monthly discharged patients"
          value={monthlyPatients}
          min={100}
          max={5000}
          step={50}
          onChange={setMonthlyPatients}
        />
        <SliderField
          id="roi-rate"
          label="Current readmission rate (%)"
          value={readmissionRate}
          min={5}
          max={40}
          step={1}
          onChange={setReadmissionRate}
          formatValue={(n) => `${n}%`}
        />
        <SliderField
          id="roi-cost"
          label="Average readmission cost (₹)"
          value={avgReadmissionCost}
          min={10000}
          max={200000}
          step={5000}
          onChange={setAvgReadmissionCost}
          formatValue={(n) => formatInr(n)}
        />
      </div>

      <div className="mt-6 rounded-xl border border-primary-container/25 bg-[#0A0F1E]/80 p-4">
        <p className="text-2xl font-bold leading-tight text-primary-container sm:text-3xl">
          Save {formatInr(metrics.monthlySavings)}/month
        </p>
        <p className="mt-2 text-sm text-slate-300">
          {formatInr(metrics.annualSavings)} estimated annual savings
        </p>
        <p className="mt-1 text-sm font-semibold text-amber-200/90">
          {metrics.roiMultiplier.toFixed(1)}x return on investment
        </p>
        <p className="mt-3 text-xs text-slate-500">
          Assumes Setu reduces readmissions by{" "}
          <span className="text-slate-400">30%</span> · Setu est.{" "}
          {formatInr(metrics.setuAnnualCost)}/year · Net{" "}
          {formatInr(metrics.netRoi)}/year
        </p>
      </div>

      <details className="mt-4 rounded-lg border border-slate-800 bg-surface-level-2/80 px-3 py-2 text-xs text-slate-400">
        <summary className="cursor-pointer font-medium text-slate-300">
          Calculation breakdown
        </summary>
        <ul className="mt-2 space-y-1 pb-1">
          <li>
            Monthly readmissions: {metrics.monthlyReadmissions.toFixed(1)} (
            {formatInr(metrics.monthlyReadmissionCost)} cost)
          </li>
          <li>
            Patients saved (30%): {metrics.patientsSaved.toFixed(1)}/month
          </li>
          <li>Setu annual cost: {formatInr(metrics.setuAnnualCost)}</li>
        </ul>
      </details>

      <p className="mt-4 text-center text-[11px] leading-snug text-slate-500 sm:text-left">
        Based on published NABH readmission data for Indian hospitals.
        Illustrative model only; not a guarantee of clinical or financial
        outcomes.
      </p>
    </div>
  );
}
