"use client";

import { BolnaWebCall, type CallState as BolnaCallState } from "@bolna/web-call";
import { useCallback, useEffect, useRef, useState } from "react";

type UiState = "idle" | "connecting" | "active" | "ended";

function mapBolnaState(state: BolnaCallState): UiState {
  if (state === "connecting" || state === "ringing") return "connecting";
  if (state === "active") return "active";
  if (state === "ended") return "ended";
  return "idle";
}

export type CallButtonAgentType = "b2c" | "b2b";

export type CallButtonProps = {
  variant?: "default" | "warm";
  agentType: CallButtonAgentType;
};

export default function CallButton({
  variant = "default",
  agentType,
}: CallButtonProps) {
  const agentId =
    agentType === "b2b"
      ? process.env.NEXT_PUBLIC_BOLNA_AGENT_ID_B2B
      : process.env.NEXT_PUBLIC_BOLNA_AGENT_ID_B2C;

  const callRef = useRef<BolnaWebCall | null>(null);
  const [state, setState] = useState<UiState>("idle");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const call = new BolnaWebCall({
      getSession: async () => {
        const response = await fetch("/api/bolna-session", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ agent_id: agentId }),
        });
        if (!response.ok) {
          const payload = (await response.json().catch(() => ({}))) as {
            error?: string;
          };
          throw new Error(payload.error ?? "Failed to start Bolna session");
        }
        return response.json();
      },
    });
    callRef.current = call;

    call.on("state-change", (next) => {
      setState(mapBolnaState(next));
    });

    call.on("call-end", () => {
      setState("ended");
    });

    call.on("error", (err) => {
      setError(err.message);
      setState("idle");
    });

    return () => {
      void call.stop();
      callRef.current = null;
    };
  }, [agentId]);

  const startCall = useCallback(async () => {
    const call = callRef.current;
    if (!call) return;
    setError(null);
    setState("connecting");
    try {
      await call.start();
    } catch {
      setState("idle");
    }
  }, []);

  const endCall = useCallback(async () => {
    const call = callRef.current;
    if (!call) return;
    await call.stop();
    setState("ended");
  }, []);

  const onPrimaryClick = () => {
    if (state === "active" || state === "connecting") {
      void endCall();
      return;
    }
    void startCall();
  };

  if (state === "connecting") {
    return (
      <div className="flex flex-col items-center gap-3">
        <div
          className="h-28 w-28 rounded-full border-2 border-amber-400/40 bg-surface-level-2 flex items-center justify-center"
          aria-busy="true"
        >
          <div className="h-10 w-10 animate-spin rounded-full border-2 border-amber-400 border-t-transparent" />
        </div>
        <p className="text-sm font-medium text-zinc-300">Connecting...</p>
      </div>
    );
  }

  if (state === "active") {
    return (
      <div className="flex flex-col items-center gap-4">
        <button
          type="button"
          onClick={onPrimaryClick}
          className="min-h-[3.5rem] rounded-full bg-rose-600 px-8 py-3 text-sm font-bold text-white shadow-[0_0_30px_rgba(244,63,94,0.45)] transition active:scale-95"
        >
          End Call
        </button>
        <p className="text-sm text-amber-200">Connected — speak in Hindi</p>
      </div>
    );
  }

  if (state === "ended") {
    return (
      <div className="flex flex-col items-center gap-4 text-center">
        <p className="max-w-xs text-sm text-zinc-300">
          Call ended. Check SMS alerts.
        </p>
        <button
          type="button"
          onClick={onPrimaryClick}
          className="rounded-full bg-primary-container px-6 py-2.5 text-sm font-bold text-surface-base transition active:scale-95"
        >
          Call again
        </button>
      </div>
    );
  }

  const warmIdle = variant === "warm";

  return (
    <div className="flex flex-col items-center gap-3">
      <button
        type="button"
        onClick={onPrimaryClick}
        className={
          warmIdle
            ? "relative flex h-20 w-20 flex-col items-center justify-center rounded-full border-2 border-amber-200/50 bg-gradient-to-tr from-amber-500 to-orange-500 text-slate-950 shadow-lg transition active:scale-95"
            : "group relative flex h-28 w-28 flex-col items-center justify-center rounded-full bg-gradient-to-tr from-amber-400 via-orange-500 to-amber-600 text-surface-base shadow-[0_0_40px_rgba(255,153,51,0.55)] transition active:scale-95"
        }
        aria-label="Call Setu Now"
      >
        {!warmIdle ? (
          <span className="absolute inset-0 animate-ping rounded-full bg-amber-400/30" />
        ) : null}
        <span
          className={`material-symbols-outlined ${warmIdle ? "text-[28px]" : "relative text-3xl"}`}
          aria-hidden
        >
          call
        </span>
        <span
          className={`relative font-extrabold uppercase tracking-wider ${warmIdle ? "mt-0.5 font-sans text-[9px]" : "mt-1 text-[10px]"}`}
        >
          Call Setu Now
        </span>
      </button>
      {error ? (
        <p className="max-w-xs text-center text-xs text-rose-400">{error}</p>
      ) : null}
    </div>
  );
}
