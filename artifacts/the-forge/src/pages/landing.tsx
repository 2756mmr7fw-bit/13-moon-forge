import { useEffect } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@clerk/react";
import { LogoMark } from "@/components/logo";
import { Button } from "@/components/ui/button";
import {
  MonitorPlay, Monitor, Swords, Sparkles, Code2, GraduationCap,
  Crosshair, Shield, ArrowRight, Flame,
} from "lucide-react";

const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

const features = [
  {
    icon: MonitorPlay,
    color: "text-orange-400",
    bg: "bg-orange-400/10",
    title: "Screen Coach",
    desc: "Share your screen and let Forge watch, listen, and talk you through any computer problem — step by step, out loud.",
  },
  {
    icon: Monitor,
    color: "text-blue-400",
    bg: "bg-blue-400/10",
    title: "Computer Advisor",
    desc: "Tell Forge what your computer is like and what you want to do. It tells you exactly what software to get and what to upgrade — for free.",
  },
  {
    icon: Swords,
    color: "text-purple-400",
    bg: "bg-purple-400/10",
    title: "Game Studio",
    desc: "Build a real video game right in your browser. No downloads. No experience needed. Forge writes the code, you make the game.",
  },
  {
    icon: GraduationCap,
    color: "text-green-400",
    bg: "bg-green-400/10",
    title: "Learn with Sage",
    desc: "Ask anything and get a clear, patient explanation. Like having a teacher available 24 hours a day who never makes you feel dumb.",
  },
  {
    icon: Crosshair,
    color: "text-yellow-400",
    bg: "bg-yellow-400/10",
    title: "Ask Hawk",
    desc: "Stuck on something? Hawk cuts through the noise and gives you a direct answer — no fluff, no runaround.",
  },
  {
    icon: Code2,
    color: "text-pink-400",
    bg: "bg-pink-400/10",
    title: "Write Code",
    desc: "Need an app, a script, or a website? Describe what you want and Forge writes it. You don't need to know how to code.",
  },
  {
    icon: Sparkles,
    color: "text-cyan-400",
    bg: "bg-cyan-400/10",
    title: "Brainstorm",
    desc: "Turn a rough idea into a full plan. Forge asks the right questions and helps you figure out exactly what you're building.",
  },
  {
    icon: Shield,
    color: "text-emerald-400",
    bg: "bg-emerald-400/10",
    title: "Sovereign Tools",
    desc: "Move your data, apps, and digital life off of Big Tech. Forge shows you how and walks you through every step.",
  },
];

const stats = [
  { value: "8+", label: "AI-powered tools" },
  { value: "0", label: "downloads required" },
  { value: "100%", label: "browser-based" },
  { value: "24/7", label: "always available" },
];

export default function Landing() {
  const { isSignedIn, isLoaded } = useAuth();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (isLoaded && isSignedIn) {
      setLocation("/dashboard");
    }
  }, [isLoaded, isSignedIn, setLocation]);

  if (!isLoaded || isSignedIn) return null;

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
            <Button variant="ghost" size="sm" asChild>
              <a href={`${basePath}/sign-in`}>Sign in</a>
            </Button>
            <Button size="sm" className="gap-1.5" asChild>
              <a href={`${basePath}/sign-up`}>
                Get started <ArrowRight size={13} />
              </a>
            </Button>
          </div>
        </div>
      </nav>

      {/* ── Hero ────────────────────────────────────────────────────────────── */}
      <section className="relative pt-24 pb-20 px-6 text-center overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[700px] h-[400px] bg-primary/10 rounded-full blur-[120px] opacity-60" />
        </div>
        <div className="relative max-w-3xl mx-auto space-y-6">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-primary/30 bg-primary/10 text-primary text-xs font-semibold tracking-wide">
            <Flame size={12} /> Powered by Sovereign Digital LLC
          </div>
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold leading-tight tracking-tight">
            Your personal AI<br />
            <span className="text-primary">tech team.</span>
          </h1>
          <p className="text-lg text-muted-foreground max-w-xl mx-auto leading-relaxed">
            Forge watches your screen, fixes your computer problems, builds your apps, and teaches you anything — right in your browser. No Geek Squad. No downloads. No confusion.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
            <Button size="lg" className="gap-2 text-base px-8" asChild>
              <a href={`${basePath}/sign-up`}>
                Start for free <ArrowRight size={16} />
              </a>
            </Button>
            <Button size="lg" variant="outline" className="gap-2 text-base px-8" asChild>
              <a href={`${basePath}/sign-in`}>
                I already have an account
              </a>
            </Button>
          </div>
        </div>
      </section>

      {/* ── Stats ───────────────────────────────────────────────────────────── */}
      <section className="py-10 border-y border-white/8 bg-white/2">
        <div className="max-w-4xl mx-auto px-6 grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
          {stats.map(s => (
            <div key={s.label}>
              <div className="text-3xl font-extrabold text-primary">{s.value}</div>
              <div className="text-xs text-muted-foreground mt-1">{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Features ────────────────────────────────────────────────────────── */}
      <section className="py-20 px-6">
        <div className="max-w-6xl mx-auto space-y-12">
          <div className="text-center space-y-3">
            <h2 className="text-3xl font-bold tracking-tight">Everything you need, nothing you don't</h2>
            <p className="text-muted-foreground max-w-lg mx-auto">Eight tools, one workspace. Pick what you need and ignore the rest.</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {features.map(f => (
              <div key={f.title} className="rounded-xl border border-white/8 bg-white/3 p-5 space-y-3 hover:border-white/15 hover:bg-white/5 transition-colors">
                <div className={`inline-flex items-center justify-center w-9 h-9 rounded-lg ${f.bg}`}>
                  <f.icon size={18} className={f.color} />
                </div>
                <div>
                  <p className="font-semibold text-sm">{f.title}</p>
                  <p className="text-xs text-muted-foreground leading-relaxed mt-1">{f.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Highlight: Screen Coach ──────────────────────────────────────────── */}
      <section className="py-20 px-6 border-y border-white/8 bg-white/2">
        <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
          <div className="space-y-5">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-orange-400/30 bg-orange-400/10 text-orange-400 text-xs font-semibold">
              <MonitorPlay size={12} /> Featured Tool
            </div>
            <h2 className="text-3xl font-bold tracking-tight">Your own Geek Squad — free.</h2>
            <p className="text-muted-foreground leading-relaxed">
              Screen Coach watches your screen in real time. It sees what you see, talks you through the fix out loud, and even points to exactly where to click. It's like having a tech-savvy friend looking over your shoulder — without the awkward house visit.
            </p>
            <ul className="space-y-2">
              {[
                "Speaks guidance out loud as you work",
                "Shows a glowing pointer on your screen",
                "Detects when something changes and reacts",
                "Quick-fix recipes for the most common problems",
              ].map(item => (
                <li key={item} className="flex items-start gap-2 text-sm text-muted-foreground">
                  <span className="text-primary mt-0.5">✓</span> {item}
                </li>
              ))}
            </ul>
            <Button className="gap-2 mt-2" asChild>
              <a href={`${basePath}/sign-up`}>Try Screen Coach free <ArrowRight size={14} /></a>
            </Button>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/5 p-6 space-y-3">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
              Forge is watching your screen…
            </div>
            {[
              { role: "user", text: "My computer is running really slow" },
              { role: "forge", text: "I can see several browser tabs open and a software update waiting. Let's start by closing the tabs you're not using — look at the top of your screen, the row of open pages. Click the X on any tab you don't need right now." },
            ].map((m, i) => (
              <div key={i} className={`rounded-lg px-4 py-3 text-xs leading-relaxed ${m.role === "user" ? "bg-white/8 text-foreground ml-6" : "bg-primary/15 text-foreground mr-6 border border-primary/20"}`}>
                <span className={`font-semibold text-[10px] uppercase tracking-wider block mb-1 ${m.role === "forge" ? "text-primary" : "text-muted-foreground"}`}>
                  {m.role === "forge" ? "Forge" : "You"}
                </span>
                {m.text}
              </div>
            ))}
            <div className="flex items-center gap-1.5 pt-1">
              <div className="w-1.5 h-1.5 rounded-full bg-primary animate-bounce" style={{ animationDelay: "0ms" }} />
              <div className="w-1.5 h-1.5 rounded-full bg-primary animate-bounce" style={{ animationDelay: "150ms" }} />
              <div className="w-1.5 h-1.5 rounded-full bg-primary animate-bounce" style={{ animationDelay: "300ms" }} />
              <span className="text-[10px] text-muted-foreground ml-1">Forge is thinking…</span>
            </div>
          </div>
        </div>
      </section>

      {/* ── CTA ─────────────────────────────────────────────────────────────── */}
      <section className="py-24 px-6 text-center relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-primary/10 rounded-full blur-[100px] opacity-50" />
        </div>
        <div className="relative max-w-2xl mx-auto space-y-6">
          <LogoMark className="h-12 w-12 mx-auto opacity-80" />
          <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
            Ready to build something?
          </h2>
          <p className="text-muted-foreground text-lg">
            Join 13 Moon Forge and get your personal AI workspace — free to start, no credit card required.
          </p>
          <Button size="lg" className="gap-2 text-base px-10" asChild>
            <a href={`${basePath}/sign-up`}>
              Create your free account <ArrowRight size={16} />
            </a>
          </Button>
        </div>
      </section>

      {/* ── Footer ──────────────────────────────────────────────────────────── */}
      <footer className="border-t border-white/8 py-8 px-6">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-muted-foreground">
          <div className="flex items-center gap-2">
            <LogoMark className="h-5 w-5 opacity-50" />
            <span>© {new Date().getFullYear()} Sovereign Digital LLC. All rights reserved.</span>
          </div>
          <div className="flex items-center gap-5">
            <a href="https://thepeoplestownsq.com" target="_blank" rel="noopener noreferrer" className="hover:text-foreground transition-colors">
              thepeoplestownsq.com
            </a>
            <a href={`${basePath}/pricing`} className="hover:text-foreground transition-colors">Pricing</a>
            <a href={`${basePath}/sign-in`} className="hover:text-foreground transition-colors">Sign in</a>
          </div>
        </div>
      </footer>

    </div>
  );
}
