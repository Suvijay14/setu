"use client";

import { useState } from "react";

const DISPLAY_PHONE = "+91 99100 36896";

type OutboundState = "idle" | "loading" | "success" | "error";

export default function OutboundDemoCallButton() {
  const [state, setState] = useState<OutboundState>("idle");

  const triggerCall = async () => {
    if (state === "loading") return;
    setState("loading");

    try {
      const response = await fetch("/api/trigger-outbound-call", {
        method: "POST",
      });
      const body = (await response.json().catch(() => ({}))) as {
        success?: boolean;
        error?: unknown;
      };

      if (!response.ok || !body.success) {
        console.error("Outbound demo call failed:", body.error ?? response.status);
        setState("error");
        return;
      }

      setState("success");
    } catch (err) {
      console.error("Outbound demo call failed:", err);
      setState("error");
    }
  };

  const label =
    state === "loading"
      ? "⏳ Calling +91 99100 36896..."
      : state === "success"
        ? "✅ Call initiated! Pick up in a few seconds"
        : state === "error"
          ? "❌ Failed — check console"
          : "📞 Call My Phone";

  return (
    <div className="flex flex-col items-center gap-2">
      <button
        type="button"
        onClick={() => void triggerCall()}
        disabled={state === "loading" || state === "success"}
        className="min-h-[48px] rounded-xl border-2 border-warm-primary/40 bg-transparent px-6 py-3 text-[15px] font-semibold text-warm-primary shadow-sm transition hover:bg-warm-linen disabled:cursor-not-allowed disabled:opacity-70"
      >
        {label}
      </button>
      {state === "idle" ? (
        <p className="text-center text-xs text-warm-ink-muted">
          Get a call on {DISPLAY_PHONE}
        </p>
      ) : null}
    </div>
  );
}
