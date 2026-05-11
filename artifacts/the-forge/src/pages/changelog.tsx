import { Sparkles, Wrench, Zap, Shield, Globe, TrendingUp, Bell, BarChart2, Gift } from "lucide-react";

interface Entry {
  date: string;
  version: string;
  tag: "new" | "improved" | "fixed" | "infra";
  items: { icon: React.ComponentType<{ size: number; className?: string }>; text: string }[];
}

const TAG_STYLES: Record<Entry["tag"], string> = {
  new:      "bg-primary/15 text-primary border-primary/30",
  improved: "bg-blue-500/15 text-blue-400 border-blue-500/30",
  fixed:    "bg-yellow-500/15 text-yellow-400 border-yellow-500/30",
  infra:    "bg-zinc-500/15 text-zinc-400 border-zinc-500/30",
};

const TAG_LABELS: Record<Entry["tag"], string> = {
  new:      "New",
  improved: "Improved",
  fixed:    "Fixed",
  infra:    "Infrastructure",
};

const CHANGELOG: Entry[] = [
  {
    date: "May 2026",
    version: "v2.8",
    tag: "new",
    items: [
      { icon: Gift,      text: "Referral program — earn 50 bonus messages for every friend you invite" },
      { icon: Bell,      text: "Notifications center — real-time alerts for deploys, domain expiry, and more" },
      { icon: BarChart2, text: "Usage dashboard — see your message quota, Moon entitlements, and plan details in one place" },
      { icon: TrendingUp, text: "Showcase 'Get Your App Seen' section — 25 advertising platforms curated for builders" },
      { icon: Globe,     text: "Showcase hero rewritten — two clear paths: Host with Forge (automatic) or Advertise Only (pay first)" },
    ],
  },
  {
    date: "April 2026",
    version: "v2.7",
    tag: "new",
    items: [
      { icon: Globe,   text: "Domain Hub — track all your domains with DNS status, SSL health, expiry alerts, and renewal reminders" },
      { icon: Shield,  text: "Live domain status indicators — green/yellow/red/grey per-domain with one-click health check" },
      { icon: Sparkles, text: "App Showcase — App Store-style broadcast with live thum.io screenshots on every card" },
      { icon: Zap,     text: "Auto-showcase — apps hosted on Forge appear in the Showcase automatically on deploy" },
    ],
  },
  {
    date: "March 2026",
    version: "v2.6",
    tag: "new",
    items: [
      { icon: Zap,      text: "Agent Bridge — connect local Forge Agents, send commands, install apps remotely" },
      { icon: Wrench,   text: "App Logs — live container logs from deployed Coolify apps, streamed in real time" },
      { icon: Shield,   text: "Code Vault — every version of your code auto-saved on every push, always downloadable" },
      { icon: Sparkles, text: "Forge Coder — describe anything and Forge writes and deploys the complete code" },
    ],
  },
  {
    date: "February 2026",
    version: "v2.5",
    tag: "improved",
    items: [
      { icon: Zap,      text: "Deploy Dashboard — trigger redeploys, view logs, and check status for all running apps" },
      { icon: Wrench,   text: "Forge Inspector — Forge logs into your apps, visits every page, and reports what's broken" },
      { icon: Globe,    text: "Freedom Center — self-hosting migration flow with Sovereign Stack compliance checklist" },
      { icon: Shield,   text: "Secrets Vault — AES-256-GCM encrypted secret storage with anonymous-to-auth migration" },
    ],
  },
  {
    date: "January 2026",
    version: "v2.4",
    tag: "new",
    items: [
      { icon: Sparkles, text: "Project Room — crew HQ to assemble Moons and track everything in one place" },
      { icon: Wrench,   text: "Forge Academy — timed bug-fixing tests, trace reading, SQL drills, and Git drills" },
      { icon: Zap,      text: "The Gym — code exercises with difficulty levels, AI feedback, and progress tracking" },
      { icon: Globe,    text: "Forge Marketplace — browse and install pre-built apps to your Coolify server" },
    ],
  },
  {
    date: "December 2025",
    version: "v2.3",
    tag: "infra",
    items: [
      { icon: Shield,   text: "Clerk authentication — upgraded from Replit Auth to Clerk for better session management" },
      { icon: Zap,      text: "Express 5 upgrade — faster routing, improved error handling across all API routes" },
      { icon: Wrench,   text: "Drizzle ORM migration — replaced raw SQL with type-safe schema-first queries" },
      { icon: Globe,    text: "Unified Docker image — single container serves both Express API and React frontend" },
    ],
  },
];

export default function ChangelogPage() {
  return (
    <div className="max-w-2xl mx-auto px-4 py-8 space-y-8">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
          <Sparkles size={20} className="text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">What's New</h1>
          <p className="text-sm text-muted-foreground">Everything that's shipped in The Forge, newest first</p>
        </div>
      </div>

      <div className="relative">
        <div className="absolute left-3.5 top-0 bottom-0 w-px bg-border" />
        <div className="space-y-8">
          {CHANGELOG.map((entry, idx) => (
            <div key={idx} className="relative pl-10">
              <div className="absolute left-0 w-7 h-7 rounded-full bg-background border-2 border-primary/40 flex items-center justify-center">
                <div className="w-2 h-2 rounded-full bg-primary" />
              </div>

              <div className="flex items-center gap-3 mb-3">
                <span className="text-sm font-semibold">{entry.date}</span>
                <span className="text-xs text-muted-foreground font-mono">{entry.version}</span>
                <span className={`text-[10px] px-2 py-0.5 rounded-full border font-semibold uppercase tracking-wider ${TAG_STYLES[entry.tag]}`}>
                  {TAG_LABELS[entry.tag]}
                </span>
              </div>

              <div className="rounded-xl border bg-card divide-y divide-border overflow-hidden">
                {entry.items.map((item, i) => (
                  <div key={i} className="flex items-start gap-3 p-3.5">
                    <item.icon size={15} className="text-primary mt-0.5 shrink-0" />
                    <p className="text-sm text-muted-foreground leading-snug">{item.text}</p>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      <p className="text-xs text-muted-foreground text-center pb-4">
        Forge ships continuously — check back often for new features.
      </p>
    </div>
  );
}
