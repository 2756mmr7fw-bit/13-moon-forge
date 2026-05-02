import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  GraduationCap, ArrowRight, CheckCircle2, Lock, Star,
  Users, BookOpen, Flame, Trophy, Shield, Moon, Zap,
  ChevronRight, Circle, AlertTriangle, Cpu, Database,
  FileType2, Network, GitBranch, ScrollText, Timer, Dumbbell,
} from "lucide-react";
import { DRILL_META, DRILL_ORDER } from "./academy/types";

interface Level {
  num: number;
  title: string;
  description: string;
}

interface Section {
  id: number;
  title: string;
  levels: string;
  price: number | "free";
  description: string;
}

interface Track {
  rank: string;
  color: string;
  bg: string;
  border: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  description: string;
  unlocks: string;
}

const LEVELS: Level[] = [
  { num: 1,  title: "Context & History",          description: "How the internet works. How computers work. What the web is and why it matters." },
  { num: 2,  title: "How Developers Think",        description: "Problem solving. Pseudocode. Logic. The mental model before the first line of code." },
  { num: 3,  title: "HTML — Building Structure",  description: "Your first webpage. Real markup. Everything visible on a screen starts here." },
  { num: 4,  title: "CSS — Making It Look Real",  description: "Styling, layout, responsive design. The same web everyone sees." },
  { num: 5,  title: "JavaScript — It Does Things", description: "The language that makes pages alive. Logic, interaction, behavior." },
  { num: 6,  title: "First App",                  description: "A real, working application. Built by you, front to back." },
  { num: 7,  title: "Servers & APIs",             description: "The back end. Where data lives, how apps talk to each other." },
  { num: 8,  title: "Databases",                  description: "Storing real data. SQL, structure, everything that persists." },
  { num: 9,  title: "Full Stack",                 description: "Front end and back end connected. The complete picture." },
  { num: 10, title: "Git",                        description: "Version control. How professionals manage real code on real projects." },
  { num: 11, title: "Deployment",                 description: "Taking it live. A real server, a real URL, something the world can reach." },
  { num: 12, title: "The Capstone",               description: "Finish what you started — or start something you believe in. The final build of the curriculum." },
];

const SECTIONS: Section[] = [
  { id: 0, title: "First Lesson",   levels: "Free",         price: "free", description: "One conversation with Moon AI. What do you want to build? That's the first question. The answer becomes your compass for everything that follows." },
  { id: 1, title: "Section One",    levels: "Levels 1–2",   price: 29,     description: "Context, history, and how developers think. The foundation before the code." },
  { id: 2, title: "Section Two",    levels: "Levels 3–4",   price: 49,     description: "HTML and CSS. Your first real pages, built by your own hands." },
  { id: 3, title: "Section Three",  levels: "Levels 5–6",   price: 79,     description: "JavaScript and your first complete app. This is where it becomes real." },
  { id: 4, title: "Section Four",   levels: "Levels 7–9",   price: 99,     description: "Servers, databases, full stack. The complete picture of how software works." },
  { id: 5, title: "Section Five",   levels: "Levels 10–12", price: 99,     description: "Git, deployment, and the capstone. You ship something the world can reach." },
  { id: 6, title: "Master Track",   levels: "The Final Project", price: 149, description: "A real commercial product, built and shipped. This is the Forge Academy Master credential." },
];

const TRACKS: Track[] = [
  {
    rank: "Student",
    color: "text-zinc-300",
    bg: "bg-zinc-800/60",
    border: "border-zinc-700",
    icon: BookOpen,
    description: "You are learning. The design brief is your guide. Every build points back to what you decided to make in the first lesson.",
    unlocks: "Access to curriculum, Moon AI tutoring, community chat",
  },
  {
    rank: "Journeyman",
    color: "text-orange-400",
    bg: "bg-orange-500/10",
    border: "border-orange-500/30",
    icon: Flame,
    description: "You finished the curriculum. You can build real things. Clients pay you. The referral pipeline opens.",
    unlocks: "Forge referral network, Open Shop eligibility, Journeyman credential",
  },
  {
    rank: "Master",
    color: "text-amber-400",
    bg: "bg-amber-500/10",
    border: "border-amber-500/30",
    icon: Trophy,
    description: "You built a real commercial product, shipped it, and proved you could build anything. The Master Final is live and earning.",
    unlocks: "Master credential, Hall of Fame listing, curriculum contribution rights, 30% Forge discount",
  },
  {
    rank: "Sovereign",
    color: "text-yellow-300",
    bg: "bg-yellow-500/10",
    border: "border-yellow-500/30",
    icon: Shield,
    description: "Multiple products. Real economic independence. You turned around and pulled the next person up. You cannot apply for this — you earn it.",
    unlocks: "Sovereign Registry listing, permanent recognition by Sovereign Digital, the highest mark this school gives",
  },
];

const COMMUNITY_CHANNELS = [
  { name: "#general",        desc: "The main room. Everyone, every level." },
  { name: "#questions",      desc: "Ask anything. No question is too basic." },
  { name: "#show-your-work", desc: "Post what you built. Get real feedback." },
  { name: "#game-track",     desc: "The game builders. Their own space." },
  { name: "#tools-and-setup", desc: "Dev environments, editors, the practical stuff." },
  { name: "#masters",        desc: "Journeymen and Masters. The room where the work gets serious." },
];

function SectionCard({ section }: { section: Section }) {
  const isFree = section.price === "free";
  return (
    <div className={cn(
      "relative rounded-2xl border p-6 transition-all duration-200",
      "bg-zinc-900/60 backdrop-blur-sm",
      isFree
        ? "border-orange-500/40 ring-1 ring-orange-500/20"
        : "border-zinc-800 hover:border-zinc-700",
    )}>
      {isFree && (
        <div className="absolute -top-3 left-6">
          <Badge className="bg-orange-500 text-white text-xs font-bold px-3 py-1 border-0">
            Start Here — Free
          </Badge>
        </div>
      )}
      <div className="flex items-start justify-between gap-4 mb-3">
        <div>
          <h3 className="font-bold text-white text-base">{section.title}</h3>
          <p className="text-xs text-zinc-500 mt-0.5">{section.levels}</p>
        </div>
        <div className="text-right shrink-0">
          {isFree ? (
            <span className="text-green-400 font-bold text-lg">Free</span>
          ) : (
            <span className="text-white font-bold text-lg">${section.price}</span>
          )}
        </div>
      </div>
      <p className="text-sm text-zinc-400 leading-relaxed">{section.description}</p>
    </div>
  );
}

function TrackCard({ track }: { track: Track }) {
  const Icon = track.icon;
  return (
    <div className={cn(
      "rounded-2xl border p-6 transition-all",
      "bg-zinc-900/60",
      track.border,
    )}>
      <div className="flex items-center gap-3 mb-4">
        <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center", track.bg)}>
          <Icon size={20} className={track.color} />
        </div>
        <span className={cn("font-black text-lg tracking-tight", track.color)}>{track.rank}</span>
      </div>
      <p className="text-sm text-zinc-300 leading-relaxed mb-4">{track.description}</p>
      <div className="border-t border-zinc-800 pt-4">
        <p className="text-xs text-zinc-500 leading-relaxed">{track.unlocks}</p>
      </div>
    </div>
  );
}

export default function Academy() {
  return (
    <div className="min-h-screen bg-zinc-950 text-white">

      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-orange-500/5 via-transparent to-transparent pointer-events-none" />
        <div className="max-w-5xl mx-auto px-4 pt-20 pb-24 sm:px-6 lg:px-8 text-center">

          <div className="flex items-center justify-center gap-2 mb-6">
            <Moon size={12} className="text-orange-400" />
            <span className="text-xs font-semibold text-zinc-500 tracking-widest uppercase">
              Forge Academy — By Sovereign Digital LLC
            </span>
            <Moon size={12} className="text-orange-400" />
          </div>

          <h1 className="text-5xl sm:text-6xl lg:text-7xl font-black tracking-tight mb-6 leading-none">
            More Free Thinkers.
            <br />
            <span className="text-orange-400">Fewer Order Takers.</span>
          </h1>

          <p className="text-xl text-zinc-300 max-w-2xl mx-auto leading-relaxed mb-4">
            A coding school for people who want to build something that belongs to them.
            Not a better resume. Not a faster path to someone else's payroll.
          </p>
          <p className="text-base text-zinc-500 max-w-xl mx-auto leading-relaxed mb-10">
            The first lesson is free. No credit card. No subscription. One question from Moon AI —
            <em className="text-zinc-300"> What do you want to build?</em> — and you're in.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link href="/sign-up">
              <Button size="lg" className="bg-orange-500 hover:bg-orange-400 text-white font-bold px-8 py-6 text-base rounded-xl gap-2">
                Take the First Lesson — Free
                <ArrowRight size={18} />
              </Button>
            </Link>
            <a href="#how-it-works">
              <Button size="lg" variant="ghost" className="text-zinc-400 hover:text-white px-8 py-6 text-base rounded-xl">
                How It Works
              </Button>
            </a>
          </div>

          <div className="mt-12 flex flex-wrap items-center justify-center gap-6 text-sm text-zinc-500">
            <span className="flex items-center gap-2"><CheckCircle2 size={14} className="text-green-400" /> $504 total — no subscription</span>
            <span className="flex items-center gap-2"><CheckCircle2 size={14} className="text-green-400" /> You own everything you build</span>
            <span className="flex items-center gap-2"><CheckCircle2 size={14} className="text-green-400" /> No income share agreement</span>
            <span className="flex items-center gap-2"><CheckCircle2 size={14} className="text-green-400" /> Work at your pace</span>
          </div>
        </div>
      </div>

      {/* ── Forge Drills ──────────────────────────────────────────────────── */}
      <div className="max-w-5xl mx-auto px-4 py-14 sm:px-6">
        <div className="text-center mb-10">
          <span className="text-xs font-bold text-orange-400 tracking-widest uppercase">Forge Drills</span>
          <h2 className="text-3xl font-black mt-2 mb-3 leading-tight">Use it or lose it.</h2>
          <p className="text-zinc-400 max-w-xl mx-auto text-sm leading-relaxed">
            These are the skills that erode fastest without practice and take the longest to rebuild.
            Stack traces. SQL. Git. Complexity. None of them can be learned by watching — only by doing.
            Reps build reflex.
          </p>
        </div>

        {/* Code Fix Test — featured */}
        <Link href="/code-fix-test">
          <div className="rounded-2xl border border-orange-500/30 bg-orange-500/5 p-5 mb-4 hover:bg-orange-500/10 transition-colors cursor-pointer group flex items-center gap-5">
            <div className="w-12 h-12 rounded-xl bg-orange-500/15 flex items-center justify-center shrink-0">
              <Timer size={20} className="text-orange-400" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-0.5">
                <span className="font-bold text-sm">Code Fix Test</span>
                <Badge className="bg-orange-500/20 text-orange-300 border-orange-500/30 text-xs">20 features</Badge>
              </div>
              <p className="text-xs text-zinc-400 leading-relaxed">Timed bug-fixing at 12 difficulty levels — streak tracking, daily challenges, achievements, blind spot reports.</p>
            </div>
            <ChevronRight size={16} className="text-muted-foreground group-hover:text-orange-400 transition-colors shrink-0" />
          </div>
        </Link>

        {/* 8 drill cards */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {DRILL_ORDER.map(type => {
            const m = DRILL_META[type];
            const icons: Record<string, React.ComponentType<{ size?: number; className?: string }>> = {
              trace:        AlertTriangle,
              "dry-run":    Cpu,
              sql:          Database,
              "big-o":      Zap,
              "type-fixer": FileType2,
              api:          Network,
              git:          GitBranch,
              log:          ScrollText,
            };
            const Icon = icons[type] ?? GraduationCap;
            return (
              <Link key={type} href={m.route}>
                <div className={cn(
                  "rounded-xl border p-4 cursor-pointer hover:scale-[1.02] transition-all duration-150 h-full group",
                  m.border, m.bg,
                )}>
                  <div className="flex items-start gap-3 mb-3">
                    <Icon size={16} className={cn(m.color, "shrink-0 mt-0.5")} />
                    <span className="font-bold text-sm leading-tight">{m.label}</span>
                  </div>
                  <p className="text-xs text-zinc-400 leading-relaxed mb-2">{m.short}</p>
                  <p className="text-xs text-zinc-600 leading-relaxed italic">{m.why.slice(0, 80)}…</p>
                  <div className="mt-3 flex items-center gap-1 text-xs font-semibold opacity-0 group-hover:opacity-100 transition-opacity">
                    <span className={m.color}>Start drill</span>
                    <ChevronRight size={10} className={m.color} />
                  </div>
                </div>
              </Link>
            );
          })}
        </div>

        {/* Forge's Gym — featured below drills */}
        <Link href="/gym">
          <div className="rounded-2xl border border-cyan-500/30 bg-cyan-500/5 p-5 mt-4 hover:bg-cyan-500/10 transition-colors cursor-pointer group flex items-center gap-5">
            <div className="w-12 h-12 rounded-xl bg-cyan-500/15 flex items-center justify-center shrink-0">
              <Dumbbell size={20} className="text-cyan-400" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-0.5">
                <span className="font-bold text-sm">Forge's Gym</span>
                <Badge className="bg-cyan-500/20 text-cyan-300 border-cyan-500/30 text-xs">45+ exercises</Badge>
                <Badge className="bg-purple-500/20 text-purple-300 border-purple-500/30 text-xs">adaptive</Badge>
              </div>
              <p className="text-xs text-zinc-400 leading-relaxed">Write working code from scratch. Pass every test case. 4 tiers from foundations to algorithms — the system learns how you think and adjusts.</p>
            </div>
            <ChevronRight size={16} className="text-muted-foreground group-hover:text-cyan-400 transition-colors shrink-0" />
          </div>
        </Link>
      </div>

      {/* ── Why This School ───────────────────────────────────────────────── */}
      <div className="max-w-4xl mx-auto px-4 py-16 sm:px-6">
        <div className="grid md:grid-cols-2 gap-8 items-center">
          <div>
            <span className="text-xs font-bold text-orange-400 tracking-widest uppercase">The Problem</span>
            <h2 className="text-3xl font-black mt-2 mb-4 leading-tight">
              College will cost you $120,000 and a decade of debt.
            </h2>
            <p className="text-zinc-400 leading-relaxed mb-4">
              $1.7 trillion in student loan debt in the US. The average borrower owes $37,000 at graduation.
              Thirty percent are still paying at forty. For what? A diploma that only has value if an employer
              decides to recognize it. A permission slip.
            </p>
            <p className="text-zinc-400 leading-relaxed">
              Bootcamps charge $15,000–$20,000 to get you a junior job at $45,000 a year with a boss,
              a cubicle, and no ownership of anything you produce.
            </p>
          </div>
          <div className="rounded-2xl border border-orange-500/20 bg-orange-500/5 p-6">
            <span className="text-xs font-bold text-orange-400 tracking-widest uppercase">The Alternative</span>
            <h3 className="text-xl font-black mt-2 mb-4 text-white">This school points somewhere else.</h3>
            <ul className="space-y-3">
              {[
                "$504 total. Buy the work in sections. No ongoing bill.",
                "You own 100% of everything you build. Forever.",
                "The credential is a live product in the market — not a certificate.",
                "The goal is income you control. Not a salary someone else sets.",
                "Graduate with a real app, a real URL, and a real path to independence.",
              ].map((item, i) => (
                <li key={i} className="flex items-start gap-3 text-sm text-zinc-300">
                  <CheckCircle2 size={16} className="text-orange-400 shrink-0 mt-0.5" />
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      {/* ── What This School Is ───────────────────────────────────────────── */}
      <div className="bg-zinc-900/40 border-y border-zinc-800/60 py-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 text-center">
          <span className="text-xs font-bold text-orange-400 tracking-widest uppercase">The Mission</span>
          <h2 className="text-3xl font-black mt-2 mb-6 leading-tight">
            This school is not here to make you a better worker.
          </h2>
          <p className="text-zinc-300 text-lg leading-relaxed max-w-3xl mx-auto mb-6">
            It is not here to make you a stronger employee, a more productive unit, or a more valuable asset
            to someone else's organization. It is not even here to make you a "coder" — not in the way that word
            usually means a type of labor.
          </p>
          <p className="text-zinc-400 leading-relaxed max-w-2xl mx-auto">
            What this school is here to do is grow a person. A whole, well-rounded person who is clear on what they want,
            capable of going after it, and equipped with the tools to build it themselves.
            The coding is the vehicle. <strong className="text-white">You are the destination.</strong>
          </p>
        </div>
      </div>

      {/* ── How It Works ─────────────────────────────────────────────────── */}
      <div id="how-it-works" className="max-w-5xl mx-auto px-4 py-20 sm:px-6">
        <div className="text-center mb-12">
          <span className="text-xs font-bold text-orange-400 tracking-widest uppercase">The Structure</span>
          <h2 className="text-3xl font-black mt-2 leading-tight">How the school works</h2>
          <p className="text-zinc-400 mt-3 max-w-xl mx-auto">
            The measure is work, not time. You advance when you demonstrate mastery, not when the calendar says so.
          </p>
        </div>

        {/* First Lesson */}
        <div className="rounded-2xl border border-orange-500/30 bg-orange-500/5 p-8 mb-8">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-orange-500/20 flex items-center justify-center shrink-0">
              <Zap size={22} className="text-orange-400" />
            </div>
            <div>
              <h3 className="text-xl font-black text-white mb-2">The First Lesson — Free</h3>
              <p className="text-zinc-300 leading-relaxed">
                Moon AI asks one question: <em className="text-orange-300">What do you want to build?</em> Not what language you want to learn.
                Not what job you want. What do you want to exist in the world that doesn't exist yet?
              </p>
              <p className="text-zinc-400 leading-relaxed mt-3">
                Your answer becomes the design brief. That brief becomes the compass for your entire time in this school.
                Every lesson, every build, every readiness check is pointed at the thing you decided to make.
              </p>
            </div>
          </div>
        </div>

        {/* Level list */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-12">
          {LEVELS.map((level) => (
            <div
              key={level.num}
              className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-4 flex items-start gap-3"
            >
              <span className="w-7 h-7 rounded-full bg-zinc-800 text-zinc-400 text-xs font-bold flex items-center justify-center shrink-0">
                {level.num}
              </span>
              <div>
                <p className="text-sm font-semibold text-zinc-200 leading-tight">{level.title}</p>
                <p className="text-xs text-zinc-500 mt-1 leading-snug">{level.description}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Readiness Check */}
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-8">
          <h3 className="text-lg font-black text-white mb-2">The Readiness Check — The Only Gate</h3>
          <p className="text-zinc-400 leading-relaxed mb-4">
            To advance to the next section, you pass a readiness check. Not a test with a score. A conversation —
            three parts: explain the concept, show it working, connect it back to your design brief.
          </p>
          <div className="grid sm:grid-cols-3 gap-4">
            {[
              { label: "Explain it", desc: "Say what it is in plain language — not a definition, your understanding of it." },
              { label: "Show it", desc: "Demonstrate it working. Real code, real output." },
              { label: "Connect it", desc: "Tell Moon AI how this concept shows up in your design brief." },
            ].map((part) => (
              <div key={part.label} className="rounded-xl bg-zinc-800/40 border border-zinc-700/50 p-4">
                <p className="text-sm font-bold text-orange-400 mb-2">{part.label}</p>
                <p className="text-xs text-zinc-400 leading-relaxed">{part.desc}</p>
              </div>
            ))}
          </div>
          <p className="text-xs text-zinc-500 mt-4">
            If you're not ready, Moon AI returns a different angle — not the same explanation repeated. No fail grade. No penalty. Just another path in.
          </p>
        </div>
      </div>

      {/* ── Progression ───────────────────────────────────────────────────── */}
      <div className="bg-zinc-900/40 border-y border-zinc-800/60 py-20">
        <div className="max-w-5xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-12">
            <span className="text-xs font-bold text-orange-400 tracking-widest uppercase">The Path</span>
            <h2 className="text-3xl font-black mt-2 leading-tight">Student → Journeyman → Master → Sovereign</h2>
            <p className="text-zinc-400 mt-3 max-w-xl mx-auto">
              Each rank is earned. The highest cannot be applied for.
            </p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {TRACKS.map((track) => (
              <TrackCard key={track.rank} track={track} />
            ))}
          </div>
          <div className="mt-8 rounded-2xl border border-yellow-500/20 bg-yellow-500/5 p-6 text-center">
            <p className="text-sm text-zinc-300 leading-relaxed max-w-2xl mx-auto">
              <strong className="text-yellow-300">Sovereign</strong> is not a level you complete. It is a recognition you earn —
              recognized first by the community, confirmed by Sovereign Digital when the evidence is undeniable.
              Multiple products. Real income. Real independence. And you brought somebody along.
            </p>
          </div>
        </div>
      </div>

      {/* ── Pricing ───────────────────────────────────────────────────────── */}
      <div className="max-w-5xl mx-auto px-4 py-20 sm:px-6">
        <div className="text-center mb-12">
          <span className="text-xs font-bold text-orange-400 tracking-widest uppercase">The Cost</span>
          <h2 className="text-3xl font-black mt-2 leading-tight">You buy the work. Not the clock.</h2>
          <p className="text-zinc-400 mt-3 max-w-xl mx-auto">
            No monthly subscription. No income share agreement. No bill running while life is busy.
            Complete a section and decide whether to buy the next one.
          </p>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5 mb-8">
          {SECTIONS.map((section) => (
            <SectionCard key={section.id} section={section} />
          ))}
        </div>
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-6 text-center">
          <p className="text-zinc-300 font-semibold mb-1">$504 total for the complete curriculum.</p>
          <p className="text-sm text-zinc-500">
            Every section you complete is permanently yours — even if you stop. No access revoked. No data deleted.
            You paid for the work. You own the work.
          </p>
        </div>
      </div>

      {/* ── Community ─────────────────────────────────────────────────────── */}
      <div className="bg-zinc-900/40 border-y border-zinc-800/60 py-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-12">
            <span className="text-xs font-bold text-orange-400 tracking-widest uppercase">The Community</span>
            <h2 className="text-3xl font-black mt-2 leading-tight">Free to everyone. Before you spend a dollar.</h2>
            <p className="text-zinc-400 mt-3 max-w-xl mx-auto">
              The Academy chat is open to every student the moment they create an account.
              No section required. No payment required. You belong to the community before you buy anything.
            </p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {COMMUNITY_CHANNELS.map((ch) => (
              <div key={ch.name} className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-4">
                <p className="text-sm font-bold text-orange-400 mb-1">{ch.name}</p>
                <p className="text-xs text-zinc-400 leading-relaxed">{ch.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Who This Is For ───────────────────────────────────────────────── */}
      <div className="max-w-4xl mx-auto px-4 py-20 sm:px-6">
        <div className="text-center mb-10">
          <span className="text-xs font-bold text-orange-400 tracking-widest uppercase">Who This Is For</span>
          <h2 className="text-3xl font-black mt-2 leading-tight">The person this school was built for</h2>
        </div>
        <div className="grid sm:grid-cols-2 gap-4">
          {[
            "You have an idea you gave up on because you didn't know where to start.",
            "You looked at someone else's app and thought you could build something better.",
            "You're tired of someone else owning everything you produce.",
            "You think college is a financial trap and you want a different path.",
            "You want income that doesn't depend on whether someone decided to keep you this month.",
            "You want to build something for your community, your trade, your family — and you want it to belong to you.",
          ].map((item, i) => (
            <div key={i} className="flex items-start gap-3 rounded-xl border border-zinc-800 bg-zinc-900/40 p-4">
              <Circle size={8} className="text-orange-400 shrink-0 mt-1.5 fill-orange-400" />
              <p className="text-sm text-zinc-300 leading-relaxed">{item}</p>
            </div>
          ))}
        </div>
        <div className="mt-8 text-center">
          <p className="text-zinc-500 text-sm max-w-lg mx-auto">
            This school is not for everyone. It is for the person who, when they imagine success,
            doesn't imagine getting hired. They imagine building something that belongs to them.
          </p>
        </div>
      </div>

      {/* ── Final CTA ─────────────────────────────────────────────────────── */}
      <div className="border-t border-zinc-800/60 py-24">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 text-center">
          <div className="w-16 h-16 rounded-2xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-center mx-auto mb-6">
            <GraduationCap size={28} className="text-orange-400" />
          </div>
          <h2 className="text-4xl font-black tracking-tight mb-4">
            The first lesson costs nothing.
          </h2>
          <p className="text-zinc-400 text-lg leading-relaxed mb-8 max-w-xl mx-auto">
            One question. One conversation. What you decide to build in that conversation
            becomes the reason for everything that follows.
          </p>
          <Link href="/sign-up">
            <Button size="lg" className="bg-orange-500 hover:bg-orange-400 text-white font-bold px-10 py-6 text-lg rounded-xl gap-2">
              Start — It's Free
              <ArrowRight size={20} />
            </Button>
          </Link>
          <p className="text-zinc-600 text-sm mt-6">
            No credit card. No subscription. Create an account and talk to Moon AI.
          </p>
          <div className="mt-10 pt-10 border-t border-zinc-800/60 text-xs text-zinc-600 space-y-1">
            <p>Forge Academy — a program of Sovereign Digital LLC</p>
            <p>13 Moon Forge · 13moonforge.ai</p>
            <p>All student work is the intellectual property of the student.</p>
          </div>
        </div>
      </div>

    </div>
  );
}
