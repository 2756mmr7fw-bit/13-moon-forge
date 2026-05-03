import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Send, Wrench, AlertTriangle, CheckCircle2, CreditCard, ArrowRight, RotateCcw } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@workspace/replit-auth-web";
import { SpeakButton } from "@/components/speak-button";

const API_BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

interface Msg { role: "user" | "flint"; text: string }

type Phase = "diagnose" | "verdict-fix" | "verdict-doctor" | "payment" | "session" | "error";

const FLINT_INTRO = `I'm Flint. Before we do anything, I need to understand exactly what's going on with your computer.

Tell me what's happening — and I'll ask a couple of targeted questions before giving you my honest assessment. No charge until I tell you I can fix it.

What's the problem?`;

export default function ComputerFix() {
  
  const [phase, setPhase] = useState<Phase>("diagnose");
  const [messages, setMessages] = useState<Msg[]>([{ role: "flint", text: FLINT_INTRO }]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [sessionToken, setSessionToken] = useState<string | null>(null);
  const [checkoutUrl, setCheckoutUrl] = useState<string | null>(null);
  const [paymentLoading, setPaymentLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, streaming]);

  const diagnosisHistory = messages.map(m => ({
    role: m.role === "flint" ? "assistant" : "user",
    content: m.text,
  }));

  async function send(overridePhase?: Phase) {
    const text = input.trim();
    if (!text || streaming) return;
    setInput("");

    const currentPhase = overridePhase ?? phase;
    setMessages(prev => [...prev, { role: "user", text }]);
    setStreaming(true);
    setMessages(prev => [...prev, { role: "flint", text: "" }]);

    const endpoint = currentPhase === "session" ? "/api/fix/session" : "/api/fix/diagnose";

    const body: Record<string, unknown> = {
      message: text,
      history: diagnosisHistory,
    };
    if (currentPhase === "session" && sessionToken) {
      body.sessionToken = sessionToken;
    }

    try {
      
      const res = await fetch(`${API_BASE}${endpoint}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      });

      if (res.status === 402) {
        setPhase("payment");
        setStreaming(false);
        setMessages(prev => prev.slice(0, -1));
        return;
      }

      if (!res.ok || !res.body) throw new Error("failed");

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let accumulated = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const raw = decoder.decode(value, { stream: true });
        for (const line of raw.split("\n\n")) {
          if (!line.startsWith("data: ")) continue;
          const d = line.slice(6).trim();
          if (d === "[DONE]") break;
          try {
            const parsed = JSON.parse(d) as { choices?: { delta?: { content?: string } }[] };
            const delta = parsed.choices?.[0]?.delta?.content ?? "";
            if (delta) {
              accumulated += delta;
              setMessages(prev => {
                const next = [...prev];
                next[next.length - 1] = { role: "flint", text: accumulated };
                return next;
              });
            }
          } catch { /* partial */ }
        }
      }

      // Detect verdict in accumulated text
      if (currentPhase === "diagnose") {
        if (accumulated.includes("✓ I can fix this")) {
          setPhase("verdict-fix");
        } else if (accumulated.includes("✗ You need a computer doctor")) {
          setPhase("verdict-doctor");
        }
      }
    } catch {
      setMessages(prev => {
        const next = [...prev];
        next[next.length - 1] = { role: "flint", text: "Something went wrong. Please try again." };
        return next;
      });
    } finally {
      setStreaming(false);
    }
  }

  async function startPayment() {
    setPaymentLoading(true);
    try {
      
      const res = await fetch(`${API_BASE}/api/fix/checkout`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({}),
      });
      const data = await res.json() as { url?: string; error?: string };
      if (data.url) {
        setCheckoutUrl(data.url);
        window.open(data.url, "_blank");
      }
    } catch {
      // handle
    } finally {
      setPaymentLoading(false);
    }
  }

  async function activateSession() {
    // In production this would verify the Square order ID from the redirect URL
    // For now we'll issue a session token directly after the user confirms payment
    try {
      
      const res = await fetch(`${API_BASE}/api/fix/activate`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ orderId: `manual-${Date.now()}` }),
      });
      const data = await res.json() as { sessionToken?: string };
      if (data.sessionToken) {
        setSessionToken(data.sessionToken);
        setPhase("session");
        setMessages(prev => [
          ...prev,
          {
            role: "flint",
            text: "Payment confirmed. Let's get this fixed. Walk me through where we are — what's the computer doing right now?",
          },
        ]);
      }
    } catch {
      setPhase("error");
    }
  }

  function reset() {
    setPhase("diagnose");
    setMessages([{ role: "flint", text: FLINT_INTRO }]);
    setInput("");
    setSessionToken(null);
    setCheckoutUrl(null);
    setStreaming(false);
  }

  const isFixable = phase === "verdict-fix" || phase === "session";
  const isDoctorVerdict = phase === "verdict-doctor";

  return (
    <div className="max-w-2xl mx-auto space-y-6 p-4 md:p-6">

      {/* Header */}
      <div className="space-y-3">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-red-500/20 shrink-0">
            <Wrench size={22} className="text-red-400" />
          </div>
          <div>
            <h1 className="text-2xl font-black">Computer Fix</h1>
            <p className="text-sm text-muted-foreground">
              Flint diagnoses your problem first — no payment until he says he can fix it.
            </p>
          </div>
        </div>

        {/* Phase indicator */}
        <div className="flex items-center gap-2 text-xs">
          {[
            { label: "Diagnosis", active: phase === "diagnose" || phase === "verdict-fix" || phase === "verdict-doctor" },
            { label: "Payment", active: phase === "payment" || phase === "session" },
            { label: "Fix it", active: phase === "session" },
          ].map((step, i) => (
            <span key={step.label} className="flex items-center gap-2">
              {i > 0 && <span className="text-border">→</span>}
              <span className={cn(
                "font-semibold",
                step.active ? "text-foreground" : "text-muted-foreground"
              )}>
                {step.label}
              </span>
            </span>
          ))}
        </div>
      </div>

      {/* ── Verdict banners ──────────────────────────────────────────────────── */}
      {isFixable && phase !== "session" && (
        <div className="rounded-xl border border-green-500/30 bg-green-950/20 p-4 space-y-3">
          <div className="flex items-center gap-2">
            <CheckCircle2 size={18} className="text-green-400 shrink-0" />
            <p className="font-bold text-green-300">Flint says he can fix this.</p>
          </div>
          <p className="text-sm text-muted-foreground">
            One-time payment of <strong className="text-foreground">$19</strong>. Flint works with you until it's fixed to your satisfaction. No subscription, no recurring charge.
          </p>
          <Button
            className="gap-2 bg-green-600 hover:bg-green-500 text-white font-bold"
            onClick={() => setPhase("payment")}
          >
            <CreditCard size={15} /> Continue — $19 one-time
          </Button>
        </div>
      )}

      {isDoctorVerdict && (
        <div className="rounded-xl border border-amber-500/30 bg-amber-950/20 p-4 space-y-3">
          <div className="flex items-center gap-2">
            <AlertTriangle size={18} className="text-amber-400 shrink-0" />
            <p className="font-bold text-amber-300">This needs physical repair.</p>
          </div>
          <p className="text-sm text-muted-foreground">
            Flint can't fix this remotely — but he gave you exactly what to tell a local technician. Read his full explanation above. No charge.
          </p>
          <Button variant="outline" className="gap-2" onClick={reset}>
            <RotateCcw size={13} /> Start a new problem
          </Button>
        </div>
      )}

      {/* ── Payment gate ─────────────────────────────────────────────────────── */}
      {phase === "payment" && (
        <div className="rounded-xl border border-border bg-muted/10 p-6 space-y-5 text-center">
          <div className="space-y-1">
            <p className="text-4xl font-black text-foreground">$19</p>
            <p className="text-sm text-muted-foreground">One-time · No subscription · No recurring charge</p>
          </div>
          <ul className="text-sm text-left space-y-2 max-w-xs mx-auto">
            {[
              "Flint works with you step by step",
              "Doesn't stop until it's fixed to your satisfaction",
              "If he hits a wall, he tells you exactly what to do next",
              "Nothing more to pay",
            ].map(item => (
              <li key={item} className="flex items-start gap-2 text-muted-foreground">
                <span className="text-green-400 mt-0.5 shrink-0">✓</span> {item}
              </li>
            ))}
          </ul>
          <div className="space-y-2">
            <Button
              size="lg"
              className="w-full gap-2 bg-primary hover:bg-primary/90 font-bold"
              onClick={startPayment}
              disabled={paymentLoading}
            >
              <CreditCard size={16} />
              {paymentLoading ? "Opening checkout…" : "Pay $19 and fix my computer"}
            </Button>
            {checkoutUrl && (
              <div className="space-y-2 pt-1">
                <p className="text-xs text-muted-foreground">
                  Checkout opened in a new tab. Paid? Click below to start.
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-2 w-full"
                  onClick={activateSession}
                >
                  <CheckCircle2 size={13} /> I've paid — start the fix
                </Button>
              </div>
            )}
          </div>
          <button
            className="text-xs text-muted-foreground hover:text-foreground transition-colors"
            onClick={reset}
          >
            ← Go back
          </button>
        </div>
      )}

      {/* ── Chat window ──────────────────────────────────────────────────────── */}
      {phase !== "payment" && (
        <div className="rounded-xl border border-border overflow-hidden">
          {/* Messages */}
          <div className={cn(
            "overflow-y-auto p-4 space-y-3",
            phase === "session" ? "h-[420px]" : "h-[360px]"
          )}>
            {messages.map((m, i) => (
              <div
                key={i}
                className={cn(
                  "rounded-xl px-4 py-3 text-sm leading-relaxed max-w-[90%] whitespace-pre-line",
                  m.role === "user"
                    ? "ml-auto bg-primary/20 border border-primary/20 text-foreground"
                    : "bg-red-400/8 border border-red-400/15 text-foreground"
                )}
              >
                {m.role === "flint" && (
                  <span className="text-[10px] font-bold uppercase tracking-widest text-red-400 block mb-1">
                    Flint
                  </span>
                )}
                {m.text}
                {m.role === "flint" && m.text && !streaming && (
                  <div className="mt-1.5 flex justify-end">
                    <SpeakButton text={m.text} />
                  </div>
                )}
                {m.role === "flint" && m.text === "" && streaming && (
                  <span className="inline-flex gap-0.5 ml-1">
                    {[0, 1, 2].map(i => (
                      <span key={i} className="w-1 h-1 rounded-full bg-red-400 animate-bounce"
                        style={{ animationDelay: `${i * 120}ms` }} />
                    ))}
                  </span>
                )}
              </div>
            ))}
            <div ref={chatEndRef} />
          </div>

          {/* Input — only when diagnosing or in active session */}
          {(phase === "diagnose" || phase === "session") && (
            <div className="border-t border-border p-3 flex gap-2">
              <input
                className="flex-1 bg-background border border-border rounded-lg px-3 py-2 text-sm outline-none focus:border-primary/50 placeholder:text-muted-foreground"
                placeholder={phase === "session" ? "Tell Flint what happened…" : "Describe what's going on…"}
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => e.key === "Enter" && !e.shiftKey && send()}
                disabled={streaming}
              />
              <Button
                size="sm"
                onClick={() => send()}
                disabled={streaming || !input.trim()}
                className="px-3 shrink-0"
              >
                <Send size={14} />
              </Button>
            </div>
          )}

          {/* After verdict, show proceed or reset options in chat footer */}
          {(phase === "verdict-fix" || phase === "verdict-doctor") && (
            <div className="border-t border-border p-3 flex gap-2 justify-end">
              <Button variant="ghost" size="sm" className="gap-1.5 text-xs" onClick={reset}>
                <RotateCcw size={12} /> New problem
              </Button>
              {phase === "verdict-fix" && (
                <Button size="sm" className="gap-1.5 text-xs bg-green-600 hover:bg-green-500 text-white" onClick={() => setPhase("payment")}>
                  <ArrowRight size={12} /> Continue to payment
                </Button>
              )}
            </div>
          )}
        </div>
      )}

      {phase === "error" && (
        <div className="text-center py-6 space-y-3">
          <p className="text-red-400 text-sm">Something went wrong activating your session.</p>
          <Button variant="outline" size="sm" onClick={reset}>Try again</Button>
        </div>
      )}

    </div>
  );
}
