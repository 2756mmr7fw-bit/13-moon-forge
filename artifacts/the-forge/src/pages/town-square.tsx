import { Link } from "wouter";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  Flame, Users, Tv, BookOpen, Wrench, Film, Shield,
  XCircle, Phone, Wallet, Scissors, PenLine, ArrowRight,
  Moon, Star, GraduationCap,
} from "lucide-react";

interface TownApp {
  id: string;
  name: string;
  tagline: string;
  description: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  color: string;
  bg: string;
  border: string;
  status: "live" | "building" | "soon";
  path?: string;
  moon: number;
}

const APPS: TownApp[] = [
  {
    id: "forge",
    name: "The Forge",
    tagline: "For the small man. Not for the big corporation.",
    description: "AI-powered builder for anyone with something to make. From a rough idea to a working product — this is where it starts.",
    icon: Flame,
    color: "text-orange-400",
    bg: "bg-orange-500/10",
    border: "border-orange-500/20 hover:border-orange-500/50",
    status: "live",
    path: "/",
    moon: 1,
  },
  {
    id: "tpts",
    name: "People's Town Square",
    tagline: "For dirty hands and clean ones alike.",
    description: "The social network for the farmer, the tradesperson, the working man and woman. Advertise yourself. Find people with farms. Start your business. No algorithm deciding who gets seen.",
    icon: Users,
    color: "text-green-400",
    bg: "bg-green-500/10",
    border: "border-green-500/20 hover:border-green-500/50",
    status: "building",
    moon: 2,
  },
  {
    id: "press-tv",
    name: "Town Square Press TV",
    tagline: "YouTube before Google bought it.",
    description: "For the independent journalist and the podcaster. Free speech. Real speech. No demonetization for opinions. No shadow banning. If you have something to say and you'll put your name on it, you have a platform here.",
    icon: Tv,
    color: "text-red-400",
    bg: "bg-red-500/10",
    border: "border-red-500/20 hover:border-red-500/50",
    status: "soon",
    moon: 3,
  },
  {
    id: "press",
    name: "Town Square Press",
    tagline: "You wrote it. You own it. You set the price.",
    description: "For the independent writer. Publish your e-book, your comic book, your poetry, your manifesto, your research. Everything having to do with the written word.",
    icon: BookOpen,
    color: "text-amber-400",
    bg: "bg-amber-500/10",
    border: "border-amber-500/20 hover:border-amber-500/50",
    status: "soon",
    moon: 4,
  },
  {
    id: "inventors-workshop",
    name: "13 Moon Inventors Workshop",
    tagline: "Helping us get our freedom back.",
    description: "The old inventions that got locked away. The new ones that never got funding. Describe what you want to build and the Workshop helps you actually build it — sourcing parts, drawing diagrams, connecting you with others.",
    icon: Wrench,
    color: "text-cyan-400",
    bg: "bg-cyan-500/10",
    border: "border-cyan-500/20 hover:border-cyan-500/50",
    status: "soon",
    moon: 5,
  },
  {
    id: "town-square-tv",
    name: "Town Square TV",
    tagline: "Taking the art back from Hollywood.",
    description: "For the independent filmmaker. Films about real things that happened. Drama, documentary, short film — anything made outside the machine. Find a filmmaker. Fund a film. Watch something true.",
    icon: Film,
    color: "text-purple-400",
    bg: "bg-purple-500/10",
    border: "border-purple-500/20 hover:border-purple-500/50",
    status: "soon",
    moon: 6,
  },
  {
    id: "antivirus",
    name: "13 Moon Antivirus",
    tagline: "Real protection. Not a subscription trap.",
    description: "A real antivirus at a fraction of Norton's price — with more to offer. Built for people who want their computer protected without being nickeled and dimed every year.",
    icon: Shield,
    color: "text-blue-400",
    bg: "bg-blue-500/10",
    border: "border-blue-500/20 hover:border-blue-500/50",
    status: "soon",
    path: "/antivirus",
    moon: 7,
  },
  {
    id: "refusal",
    name: "13 Moon Refusal",
    tagline: "When we refuse to buy, they change.",
    description: "Know what you're putting in your body and in your home. Every ingredient. Every additive. Every chemical behind a name you can't pronounce. Informed refusal is the most powerful consumer act there is.",
    icon: XCircle,
    color: "text-rose-400",
    bg: "bg-rose-500/10",
    border: "border-rose-500/20 hover:border-rose-500/50",
    status: "soon",
    moon: 8,
  },
  {
    id: "call-guardian",
    name: "13 Moon Call Guardian",
    tagline: "Your time is worth protecting.",
    description: "Protects you from scammers, spam callers, and anyone trying to waste your time. Simple, effective, yours.",
    icon: Phone,
    color: "text-teal-400",
    bg: "bg-teal-500/10",
    border: "border-teal-500/20 hover:border-teal-500/50",
    status: "soon",
    moon: 9,
  },
  {
    id: "ledger",
    name: "13 Moon Ledger",
    tagline: "Financial truth without the fine print.",
    description: "Budget. Track. Fix your credit. Get out of debt. Set your goals and work toward them with a tool that tells you the truth about where you stand and what it takes to get where you want to go.",
    icon: Wallet,
    color: "text-emerald-400",
    bg: "bg-emerald-500/10",
    border: "border-emerald-500/20 hover:border-emerald-500/50",
    status: "soon",
    moon: 10,
  },
  {
    id: "film-editor",
    name: "13 Moon Film Editor",
    tagline: "Built by a filmmaker. For filmmakers.",
    description: "A video editing tool that does what you need without the Adobe subscription or the Premiere learning curve. Built originally for personal use. Good enough to share.",
    icon: Scissors,
    color: "text-pink-400",
    bg: "bg-pink-500/10",
    border: "border-pink-500/20 hover:border-pink-500/50",
    status: "soon",
    moon: 11,
  },
  {
    id: "ezquill",
    name: "13 Moon EzQuill",
    tagline: "Your information, filled in once.",
    description: "Like DocuSign, but smarter and cheaper. Saves your most repeated personal information and fills it automatically on any document. Review. Sign. Done. Seconds, not minutes.",
    icon: PenLine,
    color: "text-violet-400",
    bg: "bg-violet-500/10",
    border: "border-violet-500/20 hover:border-violet-500/50",
    status: "soon",
    moon: 12,
  },
];

const STATUS_LABELS: Record<TownApp["status"], string> = {
  live: "Live",
  building: "In Development",
  soon: "Coming Soon",
};

const STATUS_COLORS: Record<TownApp["status"], string> = {
  live: "bg-green-500/15 text-green-400 border-green-500/30",
  building: "bg-orange-500/15 text-orange-400 border-orange-500/30",
  soon: "bg-zinc-800 text-zinc-400 border-zinc-700",
};

function AppCard({ app }: { app: TownApp }) {
  const Icon = app.icon;
  const isClickable = app.status === "live" || app.status === "building";

  const card = (
    <div
      className={cn(
        "group relative rounded-2xl border p-6 transition-all duration-200",
        "bg-zinc-900/60 backdrop-blur-sm",
        app.border,
        isClickable ? "cursor-pointer hover:bg-zinc-900/80" : "opacity-75",
      )}
    >
      <div className="flex items-start justify-between gap-3 mb-4">
        <div className={cn("w-11 h-11 rounded-xl flex items-center justify-center shrink-0", app.bg)}>
          <Icon size={22} className={app.color} />
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-xs text-zinc-600 flex items-center gap-1">
            <Moon size={10} /> {app.moon}
          </span>
          <Badge className={cn("text-[10px] h-5 border font-medium", STATUS_COLORS[app.status])}>
            {STATUS_LABELS[app.status]}
          </Badge>
        </div>
      </div>

      <h3 className="font-bold text-base text-white mb-1 leading-tight">{app.name}</h3>
      <p className={cn("text-xs font-medium mb-3 leading-snug", app.color)}>{app.tagline}</p>
      <p className="text-sm text-zinc-400 leading-relaxed">{app.description}</p>

      {isClickable && (
        <div className="mt-5 flex items-center gap-1 text-xs font-medium text-zinc-500 group-hover:text-zinc-300 transition-colors">
          Open <ArrowRight size={12} className="group-hover:translate-x-0.5 transition-transform" />
        </div>
      )}
    </div>
  );

  if (app.path && isClickable) {
    return <Link href={app.path}>{card}</Link>;
  }

  return card;
}

export default function TownSquare() {
  const live = APPS.filter(a => a.status === "live");
  const building = APPS.filter(a => a.status === "building");
  const soon = APPS.filter(a => a.status === "soon");

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      <div className="max-w-6xl mx-auto px-4 py-16 sm:px-6 lg:px-8">

        {/* Header */}
        <div className="text-center mb-16">
          <div className="flex items-center justify-center gap-2 mb-4">
            <Star size={14} className="text-orange-400" />
            <span className="text-xs font-medium text-zinc-500 tracking-widest uppercase">
              Sovereign Digital LLC
            </span>
            <Star size={14} className="text-orange-400" />
          </div>
          <h1 className="text-4xl sm:text-5xl font-black tracking-tight mb-4">
            People's Town Square
          </h1>
          <p className="text-zinc-400 text-lg max-w-2xl mx-auto leading-relaxed">
            One account. One subscription. Twelve tools built for the people who build things, grow things, write things, and fix things.
          </p>
          <div className="mt-6 flex items-center justify-center gap-3 text-sm text-zinc-500">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-green-500 inline-block" />
              {live.length} live
            </span>
            <span className="text-zinc-700">·</span>
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-orange-500 inline-block" />
              {building.length} in development
            </span>
            <span className="text-zinc-700">·</span>
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-zinc-600 inline-block" />
              {soon.length} coming soon
            </span>
          </div>
        </div>

        {/* Academy Featured Banner */}
        <Link href="/academy">
          <div className="group mb-12 rounded-2xl border border-orange-500/30 bg-gradient-to-r from-orange-500/10 to-orange-500/5 p-6 cursor-pointer hover:border-orange-500/50 transition-all duration-200">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-orange-500/20 flex items-center justify-center shrink-0">
                  <GraduationCap size={24} className="text-orange-400" />
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-black text-white text-lg">Forge Academy</span>
                    <Badge className="bg-green-500/15 text-green-400 border border-green-500/30 text-[10px] h-5">Live</Badge>
                  </div>
                  <p className="text-sm text-orange-400 font-medium mb-1">More free thinkers. Fewer order takers.</p>
                  <p className="text-sm text-zinc-400">The coding school for people who want to build something that belongs to them. First lesson free. $504 total. No subscription.</p>
                </div>
              </div>
              <div className="flex items-center gap-1.5 text-sm font-medium text-zinc-400 group-hover:text-orange-400 transition-colors shrink-0">
                Explore the school <ArrowRight size={14} className="group-hover:translate-x-0.5 transition-transform" />
              </div>
            </div>
          </div>
        </Link>

        {/* Live */}
        {live.length > 0 && (
          <section className="mb-12">
            <div className="flex items-center gap-2 mb-5">
              <span className="w-2 h-2 rounded-full bg-green-500" />
              <h2 className="text-sm font-semibold text-zinc-300 uppercase tracking-wider">Live Now</h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {live.map(app => <AppCard key={app.id} app={app} />)}
            </div>
          </section>
        )}

        {/* Building */}
        {building.length > 0 && (
          <section className="mb-12">
            <div className="flex items-center gap-2 mb-5">
              <span className="w-2 h-2 rounded-full bg-orange-500 animate-pulse" />
              <h2 className="text-sm font-semibold text-zinc-300 uppercase tracking-wider">In Development</h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {building.map(app => <AppCard key={app.id} app={app} />)}
            </div>
          </section>
        )}

        {/* Coming Soon */}
        {soon.length > 0 && (
          <section className="mb-16">
            <div className="flex items-center gap-2 mb-5">
              <span className="w-2 h-2 rounded-full bg-zinc-600" />
              <h2 className="text-sm font-semibold text-zinc-500 uppercase tracking-wider">Coming Soon</h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {soon.map(app => <AppCard key={app.id} app={app} />)}
            </div>
          </section>
        )}

        {/* Bottom CTA */}
        <div className="rounded-2xl border border-orange-500/20 bg-orange-500/5 p-8 text-center">
          <h2 className="text-2xl font-black mb-3">One subscription. Everything.</h2>
          <p className="text-zinc-400 mb-6 max-w-lg mx-auto">
            Subscribe once and every paid feature across all twelve apps is yours. As the family grows, your subscription gets more valuable — not more expensive.
          </p>
          <div className="flex items-center justify-center gap-3 flex-wrap">
            <Link href="/pricing">
              <Button className="bg-orange-500 hover:bg-orange-600 text-white font-bold px-6">
                See Pricing
              </Button>
            </Link>
            <Link href="/">
              <Button variant="outline" className="border-zinc-700 text-zinc-300 hover:text-white">
                Start with The Forge
              </Button>
            </Link>
          </div>
        </div>

        {/* Footer note */}
        <p className="text-center text-xs text-zinc-700 mt-10">
          Built by Sovereign Digital LLC · Aligned to the 13 Moon Natural Time Calendar · Your data is yours
        </p>
      </div>
    </div>
  );
}
