import { useState, useRef, useCallback } from "react";
import { Volume2, VolumeX, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { getUserId } from "@/lib/userId";

const API_BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

interface SpeakButtonProps {
  text: string;
  moon?: string;
  className?: string;
  size?: number;
}

let globalAudio: HTMLAudioElement | null = null;
const listeners = new Set<() => void>();

function stopGlobalAudio() {
  if (globalAudio) {
    globalAudio.pause();
    globalAudio = null;
    listeners.forEach(fn => fn());
    listeners.clear();
  }
}

export function SpeakButton({ text, moon, className, size = 13 }: SpeakButtonProps) {
  const [state, setState] = useState<"idle" | "loading" | "playing">("idle");
  const isMineRef = useRef(false);

  const stop = useCallback(() => {
    if (isMineRef.current) stopGlobalAudio();
  }, []);

  const speak = useCallback(async () => {
    if (state === "loading") return;
    if (state === "playing") { stop(); return; }

    stopGlobalAudio();
    isMineRef.current = true;
    setState("loading");

    const onOtherStop = () => {
      isMineRef.current = false;
      setState("idle");
    };
    listeners.add(onOtherStop);

    try {
      const res = await fetch(`${API_BASE}/api/tts`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-user-id": getUserId(),
        },
        body: JSON.stringify({ text, moon }),
      });

      listeners.delete(onOtherStop);

      if (!res.ok) {
        setState("idle");
        isMineRef.current = false;
        return;
      }

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);
      globalAudio = audio;

      audio.onended = () => {
        URL.revokeObjectURL(url);
        if (isMineRef.current) { setState("idle"); isMineRef.current = false; }
        if (globalAudio === audio) globalAudio = null;
      };
      audio.onerror = () => {
        URL.revokeObjectURL(url);
        if (isMineRef.current) { setState("idle"); isMineRef.current = false; }
        if (globalAudio === audio) globalAudio = null;
      };

      await audio.play();
      setState("playing");
    } catch {
      setState("idle");
      isMineRef.current = false;
    }
  }, [text, moon, state, stop]);

  return (
    <button
      onClick={speak}
      title={state === "playing" ? "Stop" : moon ? `Hear ${moon.charAt(0).toUpperCase() + moon.slice(1)} speak` : "Hear this read aloud"}
      aria-label={state === "playing" ? "Stop speaking" : "Hear this read aloud"}
      className={cn(
        "inline-flex items-center justify-center rounded transition-colors",
        "text-muted-foreground/60 hover:text-muted-foreground",
        state === "loading" && "cursor-wait opacity-50",
        state === "playing" && "text-primary",
        className,
      )}
    >
      {state === "loading"
        ? <Loader2 size={size} className="animate-spin" />
        : state === "playing"
          ? <VolumeX size={size} />
          : <Volume2 size={size} />
      }
    </button>
  );
}
