import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  Server, Globe, GitBranch, CheckCircle2, Circle, Clock,
  Plus, RefreshCw, ExternalLink, ChevronRight, AlertCircle,
  Container, Key, Database, Activity, Zap, Shield,
  Flame, Users, BookOpen, Wrench, Film, Phone, Wallet,
  Scissors, PenLine, GraduationCap, XCircle, Tv, ArrowUpCircle,
  HardDrive, Wifi,
} from "lucide-react";

interface HostedApp {
  id: string;
  name: string;
  domain: string;
  status: "live" | "deploying" | "stopped" | "error";
  lastDeploy: string;
  branch: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  color: string;
  bg: string;
}

interface ChecklistItem {
  id: string;
  label: string;
  description: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
}

const HOSTED_APPS: HostedApp[] = [
  {
    id: "the-forge",
    name: "The Forge",
    domain: "13moonforge.ai",
    status: "live",
    lastDeploy: "Pending first deploy",
    branch: "main",
    icon: Flame,
    color: "text-orange-400",
    bg: "bg-orange-500/10",
  },
  {
    id: "academy",
    name: "Forge Academy",
    domain: "academy.13moonforge.ai",
    status: "stopped",
    lastDeploy: "Not yet deployed",
    branch: "main",
    icon: GraduationCap,
    color: "text-orange-400",
    bg: "bg-orange-500/10",
  },
  {
    id: "town-square",
    name: "People's Town Square",
    domain: "thepeoplestownsq.com",
    status: "stopped",
    lastDeploy: "Not yet deployed",
    branch: "main",
    icon: Users,
    color: "text-green-400",
    bg: "bg-green-500/10",
  },
];

const UPCOMING_APPS = [
  { name: "Town Square Press TV",      icon: Tv,           domain: "tv.13moonforge.ai",        color: "text-red-400" },
  { name: "Town Square Press",         icon: BookOpen,     domain: "press.13moonforge.ai",     color: "text-amber-400" },
  { name: "13 Moon Inventors Workshop",icon: Wrench,       domain: "workshop.13moonforge.ai",  color: "text-cyan-400" },
  { name: "Town Square TV",            icon: Film,         domain: "film.13moonforge.ai",      color: "text-purple-400" },
  { name: "13 Moon Antivirus",         icon: Shield,       domain: "antivirus.13moonforge.ai", color: "text-blue-400" },
  { name: "13 Moon Refusal",           icon: XCircle,      domain: "refusal.13moonforge.ai",   color: "text-rose-400" },
  { name: "13 Moon Call Guardian",     icon: Phone,        domain: "guardian.13moonforge.ai",  color: "text-teal-400" },
  { name: "13 Moon Ledger",            icon: Wallet,       domain: "ledger.13moonforge.ai",    color: "text-emerald-400" },
  { name: "13 Moon Film Editor",       icon: Scissors,     domain: "editor.13moonforge.ai",    color: "text-pink-400" },
  { name: "13 Moon EzQuill",           icon: PenLine,      domain: "ezquill.13moonforge.ai",   color: "text-violet-400" },
];

const MIGRATION_CHECKLIST: ChecklistItem[] = [
  {
    id: "what",
    label: "What does it do?",
    description: "One sentence. What problem does it solve and who uses it?",
    icon: Circle,
  },
  {
    id: "stack",
    label: "What is it built with?",
    description: "Language and framework — Node, Python, React, Next.js, etc. What version?",
    icon: Container,
  },
  {
    id: "port",
    label: "What port does it run on?",
    description: "The port your server listens on. We'll handle the routing from there.",
    icon: Wifi,
  },
  {
    id: "dockerfile",
    label: "Does it have a Dockerfile?",
    description: "If yes, we use it. If not, we build one together before deploying.",
    icon: Container,
  },
  {
    id: "database",
    label: "Does it have a database?",
    description: "Type (Postgres, MySQL, SQLite), and whether it needs migrations on deploy.",
    icon: Database,
  },
  {
    id: "storage",
    label: "Does it store files?",
    description: "Uploads, images, videos, documents — anything stored on disk or a service.",
    icon: HardDrive,
  },
  {
    id: "secrets",
    label: "What environment variables does it need?",
    description: "List the names only — not the values. We set them up securely at deploy time.",
    icon: Key,
  },
  {
    id: "domain",
    label: "What domain should it live at?",
    description: "The full domain or subdomain. Do you already own it?",
    icon: Globe,
  },
  {
    id: "code",
    label: "Where is the code?",
    description: "Already on Forgejo? GitHub? Somewhere else? Which branch is production-ready?",
    icon: GitBranch,
  },
  {
    id: "auth",
    label: "Does it have user authentication?",
    description: "If so, what system — Clerk, custom, OAuth? We need to know before we wire up the shared auth layer.",
    icon: Shield,
  },
];

const INFRASTRUCTURE = [
  { label: "forge-server-1", value: "5.78.154.21", status: "live", icon: Server },
  { label: "Forgejo",        value: "git.13moonforge.ai", status: "live", icon: GitBranch },
  { label: "Coolify",        value: "Deployment engine", status: "pending", icon: Zap },
  { label: "MinIO",          value: "File storage", status: "pending", icon: HardDrive },
  { label: "PostgreSQL",     value: "Shared database", status: "pending", icon: Database },
];

const STATUS_STYLES = {
  live:      { badge: "bg-green-500/15 text-green-400 border-green-500/30",  dot: "bg-green-500",  label: "Live"       },
  deploying: { badge: "bg-orange-500/15 text-orange-400 border-orange-500/30", dot: "bg-orange-500 animate-pulse", label: "Deploying" },
  stopped:   { badge: "bg-zinc-800 text-zinc-500 border-zinc-700",           dot: "bg-zinc-600",   label: "Not Deployed" },
  error:     { badge: "bg-red-500/15 text-red-400 border-red-500/30",        dot: "bg-red-500",    label: "Error"      },
  live2:     { badge: "bg-green-500/15 text-green-400 border-green-500/30",  dot: "bg-green-500",  label: "Connected"  },
  pending:   { badge: "bg-zinc-800 text-zinc-500 border-zinc-700",           dot: "bg-zinc-600",   label: "Pending Setup" },
};

function AppCard({ app }: { app: HostedApp }) {
  const Icon = app.icon;
  const style = STATUS_STYLES[app.status];

  return (
    <div className={cn(
      "rounded-2xl border bg-zinc-900/60 p-5 transition-all",
      app.status === "live"
        ? "border-zinc-700 hover:border-zinc-600"
        : "border-zinc-800 opacity-80"
    )}>
      <div className="flex items-start justify-between gap-3 mb-4">
        <div className="flex items-center gap-3">
          <div className={cn("w-9 h-9 rounded-xl flex items-center justify-center shrink-0", app.bg)}>
            <Icon size={18} className={app.color} />
          </div>
          <div>
            <p className="font-bold text-sm text-white">{app.name}</p>
            <a
              href={`https://${app.domain}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-zinc-500 hover:text-zinc-300 flex items-center gap-1 transition-colors"
            >
              {app.domain} <ExternalLink size={10} />
            </a>
          </div>
        </div>
        <Badge className={cn("text-[10px] h-5 border font-medium shrink-0", style.badge)}>
          {style.label}
        </Badge>
      </div>

      <div className="space-y-2 mb-4">
        <div className="flex items-center gap-2 text-xs text-zinc-500">
          <GitBranch size={12} />
          <span>{app.branch}</span>
        </div>
        <div className="flex items-center gap-2 text-xs text-zinc-500">
          <Clock size={12} />
          <span>{app.lastDeploy}</span>
        </div>
      </div>

      <div className="flex gap-2">
        <Button
          size="sm"
          variant="outline"
          className="flex-1 text-xs border-zinc-700 hover:border-zinc-500 bg-zinc-800/50 h-8"
        >
          <ArrowUpCircle size={13} className="mr-1.5" />
          Deploy
        </Button>
        <Button
          size="sm"
          variant="ghost"
          className="text-xs text-zinc-500 hover:text-zinc-300 h-8 px-3"
        >
          <Activity size={13} />
        </Button>
      </div>
    </div>
  );
}

export default function ForgeHosting() {
  const [checkedItems, setCheckedItems] = useState<Set<string>>(new Set());
  const [showAddApp, setShowAddApp] = useState(false);

  const toggleCheck = (id: string) => {
    setCheckedItems(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const allChecked = checkedItems.size === MIGRATION_CHECKLIST.length;

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      <div className="max-w-6xl mx-auto px-4 py-10 sm:px-6">

        {/* Header */}
        <div className="mb-10">
          <div className="flex items-center gap-2 mb-2">
            <Server size={18} className="text-orange-400" />
            <span className="text-xs font-bold text-orange-400 tracking-widest uppercase">Forge Hosting</span>
          </div>
          <h1 className="text-3xl font-black text-white mb-2">Your Apps. Your Server. Your Rules.</h1>
          <p className="text-zinc-400 max-w-2xl">
            Every app in the Town Square ecosystem — deployed and managed from here.
            Built on Replit. Hosted on your own infrastructure. Push code, it goes live automatically.
          </p>
        </div>

        {/* Infrastructure Status */}
        <div className="mb-10">
          <h2 className="text-sm font-bold text-zinc-400 uppercase tracking-widest mb-4">Infrastructure</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            {INFRASTRUCTURE.map((item) => {
              const Icon = item.icon;
              const isLive = item.status === "live";
              return (
                <div
                  key={item.label}
                  className={cn(
                    "rounded-xl border p-3 text-center",
                    isLive
                      ? "border-green-500/20 bg-green-500/5"
                      : "border-zinc-800 bg-zinc-900/40"
                  )}
                >
                  <Icon size={16} className={cn("mx-auto mb-2", isLive ? "text-green-400" : "text-zinc-600")} />
                  <p className="text-xs font-bold text-white mb-0.5">{item.label}</p>
                  <p className="text-[10px] text-zinc-500 leading-snug">{item.value}</p>
                  <div className={cn(
                    "mt-2 text-[10px] font-medium",
                    isLive ? "text-green-400" : "text-zinc-600"
                  )}>
                    {isLive ? "Connected" : "Pending Setup"}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">

          {/* Left — Hosted Apps */}
          <div className="lg:col-span-2 space-y-6">

            {/* Active Apps */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-bold text-zinc-400 uppercase tracking-widest">Your Apps</h2>
                <Button
                  size="sm"
                  onClick={() => setShowAddApp(!showAddApp)}
                  className="bg-orange-500 hover:bg-orange-400 text-white text-xs h-8 px-3 gap-1.5"
                >
                  <Plus size={13} /> Add App
                </Button>
              </div>
              <div className="grid sm:grid-cols-2 gap-4">
                {HOSTED_APPS.map(app => <AppCard key={app.id} app={app} />)}
              </div>
            </div>

            {/* Upcoming Apps */}
            <div>
              <h2 className="text-sm font-bold text-zinc-400 uppercase tracking-widest mb-4">
                Coming to the Server
              </h2>
              <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 divide-y divide-zinc-800">
                {UPCOMING_APPS.map((app) => {
                  const Icon = app.icon;
                  return (
                    <div key={app.name} className="flex items-center justify-between px-5 py-3 hover:bg-zinc-800/30 transition-colors">
                      <div className="flex items-center gap-3">
                        <Icon size={15} className={app.color} />
                        <div>
                          <p className="text-sm font-medium text-zinc-200">{app.name}</p>
                          <p className="text-xs text-zinc-600">{app.domain}</p>
                        </div>
                      </div>
                      <Badge className="bg-zinc-800 text-zinc-500 border-zinc-700 text-[10px] h-5 border">
                        Queued
                      </Badge>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Deploy Pipeline */}
            <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-6">
              <h3 className="text-sm font-bold text-zinc-300 mb-4">The Deploy Pipeline</h3>
              <div className="flex items-center gap-2 flex-wrap">
                {[
                  { label: "Write on Replit", icon: Flame, color: "text-orange-400 bg-orange-500/10" },
                  { label: "Push to Forgejo", icon: GitBranch, color: "text-blue-400 bg-blue-500/10" },
                  { label: "Coolify Builds", icon: Zap, color: "text-yellow-400 bg-yellow-500/10" },
                  { label: "Live on Server", icon: Globe, color: "text-green-400 bg-green-500/10" },
                ].map((step, i, arr) => (
                  <div key={step.label} className="flex items-center gap-2">
                    <div className="flex items-center gap-2 rounded-xl border border-zinc-700 bg-zinc-800/60 px-3 py-2">
                      <div className={cn("w-6 h-6 rounded-lg flex items-center justify-center", step.color.split(" ")[1])}>
                        <step.icon size={13} className={step.color.split(" ")[0]} />
                      </div>
                      <span className="text-xs font-medium text-zinc-300">{step.label}</span>
                    </div>
                    {i < arr.length - 1 && <ChevronRight size={14} className="text-zinc-600 shrink-0" />}
                  </div>
                ))}
              </div>
              <p className="text-xs text-zinc-600 mt-4">
                Push code to Forgejo from Replit. Coolify detects the push and redeploys automatically. Your app updates in minutes without touching the server.
              </p>
            </div>
          </div>

          {/* Right — Migration Checklist */}
          <div className="space-y-6">
            <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-5">
              <div className="flex items-center justify-between mb-1">
                <h3 className="text-sm font-bold text-zinc-300">Bring Your App Checklist</h3>
                {allChecked && (
                  <CheckCircle2 size={16} className="text-green-400" />
                )}
              </div>
              <p className="text-xs text-zinc-500 mb-5 leading-relaxed">
                Before migrating any app, gather answers to everything below.
                Check each one off when you have it.
              </p>

              <div className="space-y-3">
                {MIGRATION_CHECKLIST.map((item) => {
                  const checked = checkedItems.has(item.id);
                  const Icon = item.icon;
                  return (
                    <button
                      key={item.id}
                      onClick={() => toggleCheck(item.id)}
                      className={cn(
                        "w-full text-left rounded-xl border p-3 transition-all",
                        checked
                          ? "border-green-500/30 bg-green-500/5"
                          : "border-zinc-700/50 bg-zinc-800/30 hover:border-zinc-600"
                      )}
                    >
                      <div className="flex items-start gap-3">
                        <div className={cn(
                          "w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 mt-0.5 transition-colors",
                          checked
                            ? "border-green-500 bg-green-500"
                            : "border-zinc-600"
                        )}>
                          {checked && <CheckCircle2 size={12} className="text-white" />}
                        </div>
                        <div>
                          <p className={cn("text-xs font-semibold mb-0.5", checked ? "text-green-400" : "text-zinc-200")}>
                            {item.label}
                          </p>
                          <p className="text-[11px] text-zinc-500 leading-snug">{item.description}</p>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>

              {allChecked && (
                <div className="mt-4 rounded-xl border border-green-500/30 bg-green-500/10 p-3 text-center">
                  <p className="text-xs font-bold text-green-400 mb-1">Ready to Deploy</p>
                  <p className="text-[11px] text-zinc-400">You have everything needed. Add the app above to get started.</p>
                </div>
              )}

              {!allChecked && (
                <p className="text-[11px] text-zinc-600 mt-4 text-center">
                  {checkedItems.size} of {MIGRATION_CHECKLIST.length} gathered
                </p>
              )}
            </div>

            {/* Quick Stats */}
            <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-5">
              <h3 className="text-sm font-bold text-zinc-300 mb-4">Platform Overview</h3>
              <div className="space-y-3">
                {[
                  { label: "Total apps planned", value: "13", color: "text-white" },
                  { label: "Currently live",      value: "1",  color: "text-green-400" },
                  { label: "In queue",            value: "12", color: "text-zinc-400" },
                  { label: "Your server",         value: "forge-server-1", color: "text-orange-400" },
                  { label: "Platform fee",        value: "$0 / mo", color: "text-green-400" },
                ].map(stat => (
                  <div key={stat.label} className="flex items-center justify-between">
                    <span className="text-xs text-zinc-500">{stat.label}</span>
                    <span className={cn("text-xs font-bold", stat.color)}>{stat.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
