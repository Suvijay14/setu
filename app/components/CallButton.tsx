"use client";

import {
  BolnaWebCall,
  type CallError,
  type CallState as BolnaCallState,
} from "@bolna/web-call";
import { useCallback, useEffect, useRef, useState } from "react";

type UiState = "idle" | "requesting-mic" | "connecting" | "active" | "ended";

const MIC_PROMPT =
  "Allow microphone access to speak with Setu";
const MIC_DENIED_MESSAGE =
  "Please allow microphone access in your browser to use the live demo";

const AUDIO_CONSTRAINTS: MediaTrackConstraints = {
  echoCancellation: true,
  noiseSuppression: true,
  autoGainControl: true,
};

function mapBolnaState(state: BolnaCallState): UiState {
  if (state === "connecting" || state === "ringing") return "connecting";
  if (state === "active") return "active";
  if (state === "ended") return "ended";
  return "idle";
}

function formatCallError(err: CallError | unknown): string {
  if (err && typeof err === "object" && "code" in err) {
    const callErr = err as CallError;
    if (callErr.code === "microphone_denied") {
      return MIC_DENIED_MESSAGE;
    }
    if (callErr.message) return callErr.message;
  }
  if (err instanceof Error && err.message) return err.message;
  return "Could not start the call. Please try again.";
}

async function requestMicrophoneAccess(): Promise<
  "granted" | "denied" | "unsupported"
> {
  if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
    return "unsupported";
  }
  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: AUDIO_CONSTRAINTS,
      video: false,
    });
    stream.getTracks().forEach((track) => track.stop());
    return "granted";
  } catch (err) {
    const name = err instanceof DOMException ? err.name : "";
    if (
      name === "NotAllowedError" ||
      name === "PermissionDeniedError" ||
      name === "SecurityError"
    ) {
      return "denied";
    }
    throw err;
  }
}

/** `default` = server picks BOLNA_AGENT_ID (original landing demo agent). */
export type CallButtonAgentType = "default" | "b2c" | "b2b";

const DEMO_USER_DATA = {
  patient_name: "Guest",
  medications: "BP tablet",
  patient_phone: "demo",
} as const;

export type CallButtonProps = {
  variant?: "default" | "warm";
  agentType?: CallButtonAgentType;
};

export default function CallButton({
  variant = "default",
  agentType = "default",
}: CallButtonProps) {
  const publicAgentId =
    agentType === "b2b"
      ? process.env.NEXT_PUBLIC_BOLNA_AGENT_ID_B2B
      : agentType === "b2c"
        ? process.env.NEXT_PUBLIC_BOLNA_AGENT_ID_B2C ??
          process.env.NEXT_PUBLIC_BOLNA_AGENT_ID
        : undefined;

  const callRef = useRef<BolnaWebCall | null>(null);
  const audioElementRef = useRef<HTMLAudioElement | null>(null);
  const [state, setState] = useState<UiState>("idle");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const audioElement = document.createElement("audio");
    audioElement.autoplay = true;
    audioElement.setAttribute("playsinline", "true");
    audioElement.style.display = "none";
    document.body.appendChild(audioElement);
    audioElementRef.current = audioElement;

    const call = new BolnaWebCall({
      audio: AUDIO_CONSTRAINTS,
      audioElement,
      getSession: async () => {
        const user_data = {
          ...DEMO_USER_DATA,
          agent_type: agentType === "b2b" ? "b2b" : "b2c",
        };
        const payload: { agent_id?: string; user_data: typeof user_data } = {
          user_data,
        };
        if (publicAgentId?.trim()) {
          payload.agent_id = publicAgentId.trim();
        }

        const response = await fetch("/api/bolna-session", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (!response.ok) {
          const body = (await response.json().catch(() => ({}))) as {
            error?: string;
          };
          throw new Error(body.error ?? "Failed to start Bolna session");
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

    call.on("media-permission", () => {
      setError(null);
    });

    call.on("error", (err) => {
      setError(formatCallError(err));
      setState("idle");
    });

    return () => {
      void call.stop();
      callRef.current = null;
      audioElement.pause();
      audioElement.remove();
      audioElementRef.current = null;
    };
  }, [publicAgentId, agentType]);

  const startCall = useCallback(async () => {
    const call = callRef.current;
    if (!call) return;
    setError(null);
    setState("requesting-mic");

    try {
      const mic = await requestMicrophoneAccess();
      if (mic === "unsupported") {
        setError(
          "Microphone access is not available in this browser. Try Chrome on desktop.",
        );
        setState("idle");
        return;
      }
      if (mic === "denied") {
        setError(MIC_DENIED_MESSAGE);
        setState("idle");
        return;
      }

      setState("connecting");
      await call.start({
        userData: {
          ...DEMO_USER_DATA,
          agent_type: agentType === "b2b" ? "b2b" : "b2c",
        },
      });
    } catch (err) {
      setError(formatCallError(err));
      setState("idle");
    }
  }, [agentType]);

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

  const warm = variant === "warm";

  const hintCls = warm
    ? "max-w-xs text-center text-sm text-warm-ink-muted"
    : "max-w-xs text-center text-sm text-zinc-400";

  const errorCls = warm
    ? "max-w-sm text-center text-xs text-warm-error"
    : "max-w-sm text-center text-xs text-rose-400";

  if (state === "requesting-mic") {
    return (
      <div className="flex flex-col items-center gap-3">
        <div
          className={
            warm
              ? "flex h-24 w-24 items-center justify-center rounded-full border-2 border-warm-primary/30 bg-warm-linen"
              : "flex h-28 w-28 items-center justify-center rounded-full border-2 border-amber-400/40 bg-surface-level-2"
          }
          aria-busy="true"
        >
          <span
            className={`material-symbols-outlined ${warm ? "text-[32px] text-warm-primary" : "text-3xl text-amber-400"}`}
            aria-hidden
          >
            mic
          </span>
        </div>
        <p className={hintCls}>{MIC_PROMPT}</p>
      </div>
    );
  }

  if (state === "connecting") {
    return (
      <div className="flex flex-col items-center gap-3">
        <div
          className={
            warm
              ? "flex h-24 w-24 items-center justify-center rounded-full border-2 border-warm-primary/30 bg-warm-linen"
              : "flex h-28 w-28 items-center justify-center rounded-full border-2 border-amber-400/40 bg-surface-level-2"
          }
          aria-busy="true"
        >
          <div
            className={
              warm
                ? "h-10 w-10 animate-spin rounded-full border-2 border-warm-primary border-t-transparent"
                : "h-10 w-10 animate-spin rounded-full border-2 border-amber-400 border-t-transparent"
            }
          />
        </div>
        <p
          className={
            warm
              ? "text-sm font-medium text-warm-ink-muted"
              : "text-sm font-medium text-zinc-300"
          }
        >
          Connecting...
        </p>
      </div>
    );
  }

  if (state === "active") {
    return (
      <div className="flex flex-col items-center gap-4">
        <button
          type="button"
          onClick={onPrimaryClick}
          className="min-h-[3.5rem] rounded-full bg-warm-error px-8 py-3 text-sm font-bold text-white shadow-lg transition active:scale-95"
        >
          End Call
        </button>
        <div className="flex h-8 items-center gap-1.5">
          <span className="wave-bar-1 w-1.5 rounded-full bg-warm-secondary" />
          <span className="wave-bar-2 w-1.5 rounded-full bg-warm-secondary" />
          <span className="wave-bar-3 w-1.5 rounded-full bg-warm-secondary" />
          <span className="wave-bar-4 w-1.5 rounded-full bg-warm-secondary" />
          <span className="wave-bar-5 w-1.5 rounded-full bg-warm-secondary" />
        </div>
        <p
          className={
            warm ? "text-sm text-warm-secondary" : "text-sm text-amber-200"
          }
        >
          Connected — speak in Hindi
        </p>
      </div>
    );
  }

  if (state === "ended") {
    return (
      <div className="flex flex-col items-center gap-4 text-center">
        <p
          className={
            warm
              ? "max-w-xs text-sm text-warm-ink-muted"
              : "max-w-xs text-sm text-zinc-300"
          }
        >
          Call ended. Check SMS alerts.
        </p>
        <button
          type="button"
          onClick={onPrimaryClick}
          className={
            warm
              ? "rounded-full bg-warm-primary px-6 py-2.5 text-sm font-bold text-white transition active:scale-95 hover:bg-warm-primary-container"
              : "rounded-full bg-primary-container px-6 py-2.5 text-sm font-bold text-surface-base transition active:scale-95"
          }
        >
          Call again
        </button>
        {error ? <p className={errorCls}>{error}</p> : null}
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-3">
      <p className={`${hintCls} flex items-center justify-center gap-2`}>
        <span
          className={`material-symbols-outlined text-[18px] ${warm ? "text-warm-primary" : "text-amber-400"}`}
          aria-hidden
        >
          mic
        </span>
        {MIC_PROMPT}
      </p>
      <div className="relative">
        {warm ? (
          <div className="absolute -inset-4 animate-pulse-ring rounded-full bg-warm-primary/20" />
        ) : (
          <span className="absolute inset-0 animate-ping rounded-full bg-amber-400/30" />
        )}
        <button
          type="button"
          onClick={onPrimaryClick}
          className={
            warm
              ? "relative z-10 flex h-24 w-24 items-center justify-center rounded-full bg-warm-primary text-white shadow-lg transition hover:bg-warm-primary-container active:scale-95"
              : "group relative flex h-28 w-28 flex-col items-center justify-center rounded-full bg-gradient-to-tr from-amber-400 via-orange-500 to-amber-600 text-surface-base shadow-[0_0_40px_rgba(255,153,51,0.55)] transition active:scale-95"
          }
          aria-label="Call Setu Now"
        >
          <span
            className={`material-symbols-outlined ${warm ? "text-[38px]" : "relative text-3xl"}`}
            aria-hidden
          >
            call
          </span>
          {!warm ? (
            <span className="relative mt-1 text-[10px] font-extrabold uppercase tracking-wider">
              Call Setu Now
            </span>
          ) : null}
        </button>
      </div>
      {error ? (
        <p className={errorCls} role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
