import { useState, useRef, useEffect } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@clerk/react";
import { LogoMark } from "@/components/logo";
import { Button } from "@/components/ui/button";
import {
  MonitorPlay, Monitor, Swords, Sparkles, Code2, GraduationCap,
  Crosshair, Shield, ArrowRight, Flame, Globe, Scale, Wrench,
  Send, Zap, Users, Star, ExternalLink,
} from "lucide-react";
import { cn } from "@/lib/utils";

const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");
const API_BASE = import.meta.env.BASE_URL.replace(/\/$/, "");
const FREE_MESSAGE_LIMIT = 10;

const MOONS = [
  {
    name: "Forge",
    role: "The Builder",
    color: "text-orange-400",
    bg: "bg-orange-400/10",
    border: "border-orange-400/20",
    icon: Flame,
    desc: "Builds websites, apps, and products. Writes code, generates full project plans, and gets things made. The maker of the family.",
  },
  {
    name: "Hawk",
    role: "The Watcher",
    color: "text-yellow-400",
    bg: "bg-yellow-400/10",
    border: "border-yellow-400/20",
    icon: Crosshair,
    desc: "Sharp, fast answers. No fluff, no runaround. Ask Hawk when you need the truth quick and don't have time for a long explanation.",
  },
  {
    name: "Quill",
    role: "The Scribe",
    color: "text-sky-400",
    bg: "bg-sky-400/10",
    border: "border-sky-400/20",
    icon: Code2,
    desc: "Writes anything — emails, contracts, essays, product copy, legal letters, social posts. If it needs words, Quill handles it.",
  },
  {
    name: "Creed",
    role: "The Counsel",
    color: "text-violet-400",
    bg: "bg-violet-400/10",
    border: "border-violet-400/20",
    icon: Scale,
    desc: "Legal plain-English translator. Breaks down contracts, privacy policies, and terms so you know exactly what you're agreeing to.",
  },
  {
    name: "Sage",
    role: "The Teacher",
    color: "text-green-400",
    bg: "bg-green-400/10",
    border: "border-green-400/20",
    icon: GraduationCap,
    desc: "Patient, clear, thorough. Teaches you anything step by step — never makes you feel dumb for asking. Your 24/7 tutor.",
  },
  {
    name: "Flint",
    role: "The Fixer",
    color: "text-red-400",
    bg: "bg-red-400/10",
    border: "border-red-400/20",
    icon: Wrench,
    desc: "Computer broken? Flint diagnoses it first, then tells you honestly if he can fix it or if you need a specialist. One-time fix, no subscription needed.",
  },
];

const TOOLS = [
  { icon: MonitorPlay, color: "text-orange-400", bg: "bg-orange-400/10", title: "Screen Coach", desc: "Share your screen. Forge watches, talks, and walks you through the fix out loud — step by step." },
  { icon: Monitor,     color: "text-blue-400",   bg: "bg-blue-400/10",   title: "Computer Advisor", desc: "Tell Forge your specs and goals. It tells you exactly what to upgrade, install, or change." },
  { icon: Globe,       color: "text-violet-400", bg: "bg-violet-400/10", title: "Site Forge", desc: "Build a professional business website in 60 seconds. Download the file. Host it free. You own it." },
  { icon: GraduationCap, color: "text-green-400", bg: "bg-green-400/10", title: "Learn with Sage", desc: "Ask anything and get a patient, clear explanation. Like a teacher who never makes you feel dumb." },
  { icon: Crosshair,   color: "text-yellow-400", bg: "bg-yellow-400/10", title: "Ask Hawk", desc: "Hawk cuts through the noise and gives you a direct answer fast. No fluff." },
  { icon: Code2,       color: "text-pink-400",   bg: "bg-pink-400/10",   title: "Write Code", desc: "Describe what you want built and Forge writes it. No coding experience needed." },
  { icon: Swords,      color: "text-purple-400", bg: "bg-purple-400/10", title: "Game Studio", desc: "Build a real video game in your browser. Forge writes the code, you make the game." },
  { icon: Sparkles,    color: "text-cyan-400",   bg: "bg-cyan-400/10",   title: "Brainstorm", desc: "Turn a rough idea into a full plan. Forge asks the right questions and maps everything out." },
  { icon: Scale,       color: "text-amber-400",  bg: "bg-amber-400/10",  title: "Legal Decoder", desc: "Paste any contract or terms and Creed explains exactly what you're agreeing to in plain English." },
  { icon: Shield,      color: "text-emerald-400",bg: "bg-emerald-400/10",title: "Sovereign Stack", desc: "Move your data, apps, and digital life off Big Tech. We show you how, step by step." },
  { icon: Wrench,      color: "text-red-400",    bg: "bg-red-400/10",    title: "Computer Fix", desc: "One-time $19 fix. Flint diagnoses your problem first, then tells you if he can handle it." },
];

interface ChatMsg { role: "user" | "forge"; text: string }

const FORGE_INTRO = `Hey — I'm Forge. I'm part of the 13 Moon family built by Sovereign Digital LLC. You've got 10 free messages to use with me right here.

Tell me what you're dealing with — a broken computer, a website idea, a legal document you don't understand, a game you want to build, anything. I'll tell you exactly which Moon can help and what it costs to get it done.

What's going on?`;

export default function Landing() {
  const { isSignedIn, isLoaded } = useAuth();
  const [, setLocation] = useLocation();

  const [messages, setMessages] = useState<ChatMsg[]>([
    { role: "forge", text: FORGE_INTRO },
  ]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [msgCount, setMsgCount] = useState(0);
  const [hitLimit, setHitLimit] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isLoaded && isSignedIn) setLocation("/dashboard");
  }, [isLoaded, isSignedIn, setLocation]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, streaming]);

  if (!isLoaded || isSignedIn) return null;

  async function sendMessage() {
    const text = input.trim();
    if (!text || streaming || hitLimit) return;

    const newCount = msgCount + 1;
    setMsgCount(newCount);
    if (newCount >= FREE_MESSAGE_LIMIT) setHitLimit(true);

    setInput("");
    setMessages(prev => [...prev, { role: "user", text }]);
    setStreaming(true);

    setMessages(prev => [...prev, { role: "forge", text: "" }]);

    try {
      const history = messages.map(m => ({
        role: m.role === "forge" ? "assistant" : "user",
        content: m.text,
      }));

      const res = await fetch(`${API_BASE}/api/landing-forge/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text, history }),
      });

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
                next[next.length - 1] = { role: "forge", text: accumulated };
                return next;
              });
            }
          } catch { /* partial */ }
        }
      }
    } catch {
      setMessages(prev => {
        const next = [...prev];
        next[next.length - 1] = { role: "forge", text: "Something went wrong. Try again or sign up to continue." };
        return next;
      });
    } finally {
      setStreaming(false);
    }
  }

  const remaining = FREE_MESSAGE_LIMIT - msgCount;

  return (
    <div className="min-h-screen bg-background text-foreground overflow-x-hidden">

      {/* ── Nav ─────────────────────────────────────────────────────────────── */}
      <nav className="sticky top-0 z-50 border-b border-white/8 bg-background/80 backdrop-blur-md">
        <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <LogoMark className="h-7 w-7" />
            <span className="font-bold text-sm tracking-wide">13 Moon Forge</span>
          </div>
          <div className="flex items-center gap-3">
            <a href="https://thepeoplestownsq.com" target="_blank" rel="noopener noreferrer"
              className="hidden sm:flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors">
              <ExternalLink size={11} /> Town Square
            </a>
            <Button variant="ghost" size="sm" asChild>
              <a href={`${basePath}/sign-in`}>Sign in</a>
            </Button>
            <Button size="sm" className="gap-1.5" asChild>
              <a href={`${basePath}/sign-up`}>Get started <ArrowRight size={13} /></a>
            </Button>
          </div>
        </div>
      </nav>

      {/* ── Hero ────────────────────────────────────────────────────────────── */}
      <section className="relative pt-20 pb-16 px-6 text-center overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[700px] h-[400px] bg-primary/10 rounded-full blur-[120px] opacity-60" />
        </div>
        <div className="relative max-w-3xl mx-auto space-y-5">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-primary/30 bg-primary/10 text-primary text-xs font-semibold tracking-wide">
            <Flame size={12} /> A product of Sovereign Digital LLC · The People's Town Square
          </div>
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold leading-tight tracking-tight">
            Your personal AI<br />
            <span className="text-primary">tech team.</span>
          </h1>
          <p className="text-lg text-muted-foreground max-w-xl mx-auto leading-relaxed">
            Six AI specialists. One workspace. Fix your computer, build a website, understand a contract, learn anything — right in your browser. No Geek Squad. No downloads. No confusion.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
            <Button size="lg" className="gap-2 text-base px-8" asChild>
              <a href={`${basePath}/sign-up`}>Start for free <ArrowRight size={16} /></a>
            </Button>
            <Button size="lg" variant="outline" className="gap-2 text-base px-8" asChild>
              <a href={`${basePath}/pricing`}>See pricing</a>
            </Button>
          </div>
        </div>
      </section>

      {/* ── Stats ───────────────────────────────────────────────────────────── */}
      <section className="py-8 border-y border-white/8 bg-white/2">
        <div className="max-w-4xl mx-auto px-6 grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
          {[
            { value: "6", label: "AI specialists" },
            { value: "11+", label: "tools included" },
            { value: "$0", label: "to start" },
            { value: "24/7", label: "always available" },
          ].map(s => (
            <div key={s.label}>
              <div className="text-3xl font-extrabold text-primary">{s.value}</div>
              <div className="text-xs text-muted-foreground mt-1">{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Live Forge Chat ──────────────────────────────────────────────────── */}
      <section className="py-16 px-6">
        <div className="max-w-2xl mx-auto space-y-4">
          <div className="text-center space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-primary/30 bg-primary/10 text-primary text-xs font-semibold">
              <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
              Forge is live — talk to him now
            </div>
            <h2 className="text-2xl font-bold">Not sure what you need?</h2>
            <p className="text-sm text-muted-foreground">
              Tell Forge what's going on. He'll ask a couple of questions and tell you exactly which Moon can help — and what it costs.
            </p>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/3 overflow-hidden">
            {/* Messages */}
            <div className="h-72 overflow-y-auto p-4 space-y-3">
              {messages.map((m, i) => (
                <div key={i} className={cn(
                  "rounded-xl px-4 py-3 text-sm leading-relaxed max-w-[88%]",
                  m.role === "user"
                    ? "ml-auto bg-primary/20 text-foreground border border-primary/20"
                    : "bg-white/5 text-foreground border border-white/8"
                )}>
                  {m.role === "forge" && (
                    <span className="text-[10px] font-bold uppercase tracking-widest text-primary block mb-1">Forge</span>
                  )}
                  <span className="whitespace-pre-wrap">{m.text}</span>
                  {m.role === "forge" && m.text === "" && streaming && (
                    <span className="inline-flex gap-0.5 ml-1">
                      {[0,1,2].map(i => (
                        <span key={i} className="w-1 h-1 rounded-full bg-primary animate-bounce" style={{ animationDelay: `${i*120}ms` }} />
                      ))}
                    </span>
                  )}
                </div>
              ))}
              <div ref={chatEndRef} />
            </div>

            {/* Input */}
            <div className="border-t border-white/8 p-3 space-y-2">
              {hitLimit ? (
                <div className="text-center space-y-2 py-2">
                  <p className="text-sm text-muted-foreground">You've used your 10 free messages.</p>
                  <Button size="sm" className="gap-2" asChild>
                    <a href={`${basePath}/sign-up`}>Create a free account to keep going <ArrowRight size={13} /></a>
                  </Button>
                </div>
              ) : (
                <>
                  <div className="flex gap-2">
                    <input
                      className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm outline-none focus:border-primary/50 placeholder:text-muted-foreground"
                      placeholder="Tell Forge what you need…"
                      value={input}
                      onChange={e => setInput(e.target.value)}
                      onKeyDown={e => e.key === "Enter" && !e.shiftKey && sendMessage()}
                      disabled={streaming}
                    />
                    <Button size="sm" onClick={sendMessage} disabled={streaming || !input.trim()} className="px-3 shrink-0">
                      <Send size={14} />
                    </Button>
                  </div>
                  <p className="text-[11px] text-muted-foreground text-center">
                    {remaining} free message{remaining !== 1 ? "s" : ""} remaining · <a href={`${basePath}/sign-up`} className="text-primary hover:underline">Sign up for more</a>
                  </p>
                </>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* ── The 13 Moons ────────────────────────────────────────────────────── */}
      <section className="py-20 px-6 border-t border-white/8 bg-white/2">
        <div className="max-w-6xl mx-auto space-y-12">
          <div className="text-center space-y-3">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-white/10 bg-white/5 text-xs font-semibold text-muted-foreground">
              <Users size={11} /> The 13 Moon Family
            </div>
            <h2 className="text-3xl font-bold tracking-tight">Six AI specialists, one team</h2>
            <p className="text-muted-foreground max-w-lg mx-auto">
              Each Moon was built for a specific job. They're not general-purpose chatbots — they know their craft.
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {MOONS.map(moon => (
              <div key={moon.name} className={cn(
                "rounded-xl border p-5 space-y-3 transition-colors hover:bg-white/5",
                moon.border, "bg-white/2"
              )}>
                <div className="flex items-center gap-3">
                  <div className={cn("w-9 h-9 rounded-lg flex items-center justify-center shrink-0", moon.bg)}>
                    <moon.icon size={18} className={moon.color} />
                  </div>
                  <div>
                    <p className="font-bold text-sm leading-none">{moon.name}</p>
                    <p className={cn("text-[11px] font-semibold mt-0.5", moon.color)}>{moon.role}</p>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">{moon.desc}</p>
              </div>
            ))}
          </div>
          <p className="text-center text-xs text-muted-foreground">
            Part of{" "}
            <a href="https://thepeoplestownsq.com" target="_blank" rel="noopener noreferrer"
              className="text-primary hover:underline inline-flex items-center gap-1">
              The People's Town Square <ExternalLink size={10} />
            </a>{" "}
            · Built by Sovereign Digital LLC
          </p>
        </div>
      </section>

      {/* ── All Tools ───────────────────────────────────────────────────────── */}
      <section className="py-20 px-6">
        <div className="max-w-6xl mx-auto space-y-12">
          <div className="text-center space-y-3">
            <h2 className="text-3xl font-bold tracking-tight">Everything you can do on Forge</h2>
            <p className="text-muted-foreground max-w-lg mx-auto">
              Eleven tools in one workspace. Pick what you need, ignore the rest.
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {TOOLS.map(t => (
              <div key={t.title} className="rounded-xl border border-white/8 bg-white/3 p-5 space-y-3 hover:border-white/15 hover:bg-white/5 transition-colors">
                <div className={cn("inline-flex items-center justify-center w-9 h-9 rounded-lg", t.bg)}>
                  <t.icon size={18} className={t.color} />
                </div>
                <div>
                  <p className="font-semibold text-sm">{t.title}</p>
                  <p className="text-xs text-muted-foreground leading-relaxed mt-1">{t.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── One-time Fix ────────────────────────────────────────────────────── */}
      <section className="py-20 px-6 border-t border-white/8 bg-white/2">
        <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
          <div className="space-y-5">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-red-400/30 bg-red-400/10 text-red-400 text-xs font-semibold">
              <Wrench size={12} /> One-time fix — no subscription
            </div>
            <h2 className="text-3xl font-bold tracking-tight">Just need your computer fixed?</h2>
            <p className="text-muted-foreground leading-relaxed">
              Don't need a monthly plan. Flint runs a full diagnosis of your problem first — before you pay a cent. He'll tell you honestly: <strong className="text-foreground">"I can fix this"</strong> or <strong className="text-foreground">"You need a computer doctor."</strong>
            </p>
            <ul className="space-y-2">
              {[
                "Full diagnosis before any payment",
                "$19 one-time — no recurring charge",
                "Flint works with you until it's fixed to your satisfaction",
                "If he can't fix it, he tells you exactly who can",
              ].map(item => (
                <li key={item} className="flex items-start gap-2 text-sm text-muted-foreground">
                  <span className="text-red-400 mt-0.5">✓</span> {item}
                </li>
              ))}
            </ul>
            <Button className="gap-2 mt-2 bg-red-500 hover:bg-red-400 text-white" asChild>
              <a href={`${basePath}/sign-up`}>Get your computer fixed — $19 <ArrowRight size={14} /></a>
            </Button>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/5 p-6 space-y-3">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <div className="w-2 h-2 rounded-full bg-red-400 animate-pulse" />
              Flint is running a diagnosis…
            </div>
            {[
              { role: "user", text: "My computer keeps freezing and restarting randomly" },
              { role: "forge", text: "Got it. Before we do anything, let me run through a few things so I know exactly what we're dealing with.\n\nHow long has this been happening? And does it freeze at random times, or only when you're doing something specific — like gaming, watching video, or opening a program?" },
              { role: "user", text: "Started about a week ago. Happens randomly, sometimes when I'm just browsing" },
              { role: "forge", text: "That pattern tells me something. Random freezes that started suddenly — especially not tied to a heavy task — usually point to overheating, a failing drive, or a RAM issue. None of those are hopeless.\n\n✓ I can diagnose and walk you through fixing this.\n\nReady to continue? It's $19 one-time, and we don't stop until it's right." },
            ].map((m, i) => (
              <div key={i} className={cn(
                "rounded-lg px-4 py-3 text-xs leading-relaxed whitespace-pre-line",
                m.role === "user"
                  ? "bg-white/8 text-foreground ml-6"
                  : "bg-red-400/10 text-foreground mr-6 border border-red-400/20"
              )}>
                <span className={cn(
                  "font-semibold text-[10px] uppercase tracking-wider block mb-1",
                  m.role === "forge" ? "text-red-400" : "text-muted-foreground"
                )}>
                  {m.role === "forge" ? "Flint" : "You"}
                </span>
                {m.text}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Sovereignty pitch ────────────────────────────────────────────────── */}
      <section className="py-20 px-6">
        <div className="max-w-4xl mx-auto text-center space-y-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-emerald-400/30 bg-emerald-400/10 text-emerald-400 text-xs font-semibold">
            <Shield size={12} /> Digital Sovereignty
          </div>
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight">
            Tired of companies holding your stuff hostage?
          </h2>
          <p className="text-muted-foreground text-lg leading-relaxed max-w-2xl mx-auto">
            We built Forge for people who are done paying Geek Squad $150 per visit, $80/month for a website they can't touch, and $200/year to cloud companies for data they own. You should control your own digital life.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-left mt-4">
            {[
              { icon: Globe, color: "text-violet-400", bg: "bg-violet-400/10", title: "Site Forge", body: "Build your own website. Download the file. Host it free on Cloudflare. Nobody can raise your rent or delete it." },
              { icon: Shield, color: "text-emerald-400", bg: "bg-emerald-400/10", title: "Sovereign Stack", body: "Step-by-step guides to move your apps off Replit, Heroku, and AWS onto a $4/month server you own." },
              { icon: Zap, color: "text-yellow-400", bg: "bg-yellow-400/10", title: "Migration Wizard", body: "Walk through your migration with Forge. He reads your code and tells you exactly how to move it." },
            ].map(f => (
              <div key={f.title} className="rounded-xl border border-white/8 bg-white/3 p-5 space-y-3">
                <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center", f.bg)}>
                  <f.icon size={16} className={f.color} />
                </div>
                <p className="font-semibold text-sm">{f.title}</p>
                <p className="text-xs text-muted-foreground leading-relaxed">{f.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Town Square ─────────────────────────────────────────────────────── */}
      <section className="py-16 px-6 border-t border-white/8 bg-white/2">
        <div className="max-w-3xl mx-auto text-center space-y-5">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-primary/30 bg-primary/10 text-primary text-xs font-semibold">
            <Star size={11} /> The People's Town Square
          </div>
          <h2 className="text-2xl font-bold">Forge is part of something bigger</h2>
          <p className="text-muted-foreground leading-relaxed">
            13 Moon Forge is one product in The People's Town Square — a growing ecosystem of tools, communities, and services built for regular people who are tired of being treated like products. Subscriptions and billing go through Town Square, keeping everything in one place.
          </p>
          <Button variant="outline" className="gap-2" asChild>
            <a href="https://thepeoplestownsq.com" target="_blank" rel="noopener noreferrer">
              Visit The People's Town Square <ExternalLink size={13} />
            </a>
          </Button>
        </div>
      </section>

      {/* ── CTA ─────────────────────────────────────────────────────────────── */}
      <section className="py-24 px-6 text-center relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-primary/10 rounded-full blur-[100px] opacity-50" />
        </div>
        <div className="relative max-w-2xl mx-auto space-y-6">
          <LogoMark className="h-12 w-12 mx-auto opacity-80" />
          <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight">Ready to own your tech?</h2>
          <p className="text-muted-foreground text-lg">
            Free to start. No credit card. Cancel anytime. Your data is yours.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button size="lg" className="gap-2 text-base px-10" asChild>
              <a href={`${basePath}/sign-up`}>Create your free account <ArrowRight size={16} /></a>
            </Button>
            <Button size="lg" variant="outline" className="gap-2 text-base" asChild>
              <a href={`${basePath}/pricing`}>View pricing</a>
            </Button>
          </div>
        </div>
      </section>

      {/* ── Footer ──────────────────────────────────────────────────────────── */}
      <footer className="border-t border-white/8 py-8 px-6">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-muted-foreground">
          <div className="flex items-center gap-2">
            <LogoMark className="h-5 w-5 opacity-50" />
            <span>© {new Date().getFullYear()} Sovereign Digital LLC. All rights reserved.</span>
          </div>
          <div className="flex items-center gap-5 flex-wrap justify-center">
            <a href="https://thepeoplestownsq.com" target="_blank" rel="noopener noreferrer" className="hover:text-foreground transition-colors inline-flex items-center gap-1">
              thepeoplestownsq.com <ExternalLink size={10} />
            </a>
            <a href={`${basePath}/pricing`} className="hover:text-foreground transition-colors">Pricing</a>
            <a href={`${basePath}/sign-in`} className="hover:text-foreground transition-colors">Sign in</a>
          </div>
        </div>
      </footer>

    </div>
  );
}
