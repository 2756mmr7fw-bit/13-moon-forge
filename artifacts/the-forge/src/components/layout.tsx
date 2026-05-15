import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import {
  Flame, FolderKanban, PlusCircle, CreditCard, ExternalLink,
  Sparkles, Code2, Wand2, Layers, Scale, Crosshair, Activity,
  GraduationCap, ArrowRightLeft, Wrench, BookOpen, Archive, Gamepad2, Rocket, LogOut,
  Shield, Github, Package, User, Users, LogIn, Menu, X, Settings, KeyRound,
  ShieldAlert, ShieldCheck, PlugZap, Swords, Monitor, MonitorPlay, Globe, Download,
  LayoutTemplate, PencilLine, Mail, Search, Grid3X3, Server, Upload, ScanLine,
  Bug, Timer, Vault, Zap, Compass, Receipt, Dumbbell, Megaphone, Feather, Terminal,
  HardDrive, Radio, Bell, BarChart2, Gift, ScrollText, Database, Newspaper, Map,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { LogoMark, LogoWordmark } from "@/components/logo";
import { OnboardingModal } from "@/components/onboarding-modal";
import { useAuth } from "@workspace/replit-auth-web";
import { SkillLevelBadge, SkillLevelDialog } from "@/components/skill-level-selector";
import { CommandPalette, useCommandPalette } from "@/components/command-palette";
import { HelpChat } from "@/components/help-chat";

const OUR_APPS_URL = "https://thepeoplestownsq.com";

interface NavItem {
  href: string;
  label: string;
  icon: React.ComponentType<{ size: number }>;
  tip: string;
  green?: boolean;
}

type SidebarTab = "home" | "build" | "create" | "learn" | "own";

const TAB_PREFIXES: Record<SidebarTab, string[]> = {
  home:   ["/dashboard", "/showcase", "/projects", "/brainstorm", "/town-square", "/gallery", "/mailbox", "/academy", "/pricing", "/promise", "/notifications", "/changelog", "/usage", "/referral", "/builder"],
  build:  ["/workspace", "/build-with-me", "/starters", "/project-room", "/moons", "/hawk", "/snippets"],
  create: ["/site-forge", "/tools", "/code-forge", "/game-doc", "/game-tools", "/game-studio",
           "/computer-advisor", "/screen-coach", "/launch", "/legal", "/fix", "/download"],
  learn:  ["/sage", "/diy-code", "/debug-forge", "/code-fix-test"],
  own:    ["/freedom-center", "/forge-hosting", "/forge-coder", "/app-inspector", "/get-forge",
           "/migrate", "/deploys", "/vault", "/activity", "/github", "/wizard", "/migration",
           "/leaving", "/sovereign", "/forge-drop", "/app-hub", "/registry", "/secrets",
           "/monitor", "/connections", "/antivirus", "/mail-scanner", "/admin",
           "/domain-hub", "/analytics", "/env-manager", "/cron-jobs", "/backup-restore",
           "/database-manager", "/team", "/code-vault", "/app-logs", "/agent-bridge",
           "/services", "/admin-hosting", "/brand-scout", "/forge-press", "/discover"],
};

function detectTab(path: string): SidebarTab {
  for (const [tab, prefixes] of Object.entries(TAB_PREFIXES) as [SidebarTab, string[]][]) {
    if (prefixes.some(p => path === p || path.startsWith(p + "/"))) return tab;
  }
  return "home";
}

const API_BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

export function Layout({ children }: { children: React.ReactNode }) {
  const [mobileOpen, setMobileOpen]   = useState(false);
  const [isAdmin, setIsAdmin]         = useState(false);
  const [skillOpen, setSkillOpen]     = useState(false);
  const [activeTab, setActiveTab]     = useState<SidebarTab>("home");
  const { open: cmdOpen, setOpen: setCmdOpen } = useCommandPalette();
  const { user, isAuthenticated, logout } = useAuth();
  const location = useLocation()[0];

  useEffect(() => {
    setActiveTab(detectTab(location));
  }, [location]);

  useEffect(() => {
    (async () => {
      try {
        const r = await fetch(`${API_BASE}/api/admin/check`, { credentials: "include" });
        if (r.ok) { const d = await r.json() as { isAdmin: boolean }; setIsAdmin(d.isAdmin); }
      } catch { /* not admin */ }
    })();
  }, [isAuthenticated]);

  // ── Tab definitions ──────────────────────────────────────────────────────

  const TABS: { id: SidebarTab; label: string; icon: React.ComponentType<{ size: number }> }[] = [
    { id: "home",   label: "Home",   icon: Flame        },
    { id: "build",  label: "Build",  icon: Layers       },
    { id: "create", label: "Create", icon: Sparkles     },
    { id: "learn",  label: "Learn",  icon: GraduationCap },
    { id: "own",    label: "Own It", icon: ShieldCheck  },
  ];

  // ── Nav item groups ──────────────────────────────────────────────────────

  const homeItems: NavItem[] = [
    { href: "/dashboard",      label: "Home",           icon: Flame,         tip: "Your dashboard — projects, stats, quick actions" },
    { href: "/notifications",  label: "Notifications",  icon: Bell,          tip: "Alerts for deploys, domain expiry, and more" },
    { href: "/usage",          label: "Usage & Plan",   icon: BarChart2,     tip: "Your message quota, Moon entitlements, and plan details" },
    { href: "/showcase",       label: "Showcase",       icon: Sparkles,      tip: "Free broadcast for apps hosted by Forge" },
    { href: "/projects",       label: "My Projects",    icon: FolderKanban,  tip: "View and manage all your projects" },
    { href: "/projects/new",   label: "New Project",    icon: PlusCircle,    tip: "Start a brand-new project from scratch" },
    { href: "/brainstorm",     label: "Brainstorm",     icon: Sparkles,      tip: "AI helps you flesh out and plan your idea" },
    { href: "/town-square",    label: "Town Square",    icon: Users,         tip: "The full family of apps — one account, one subscription" },
    { href: "/gallery",        label: "Forge Gallery",  icon: Grid3X3,       tip: "See what people have built — public shared outputs" },
    { href: "/mailbox",        label: "Forge Inbox",    icon: Mail,          tip: "Forward emails here — attachments land in Workspace" },
    { href: "/academy",        label: "Forge Academy",  icon: GraduationCap, tip: "The coding school — sovereign coders, not order takers" },
    { href: "/referral",       label: "Invite Friends", icon: Gift,          tip: "Share your referral link — earn 50 bonus messages per invite" },
    { href: "/changelog",      label: "What's New",     icon: ScrollText,    tip: "Everything that's shipped in The Forge, newest first" },
  ];

  const buildItems: NavItem[] = [
    { href: "/workspace",     label: "Workspace",      icon: LayoutTemplate, tip: "Forge builds folders, plans, blueprints, PDFs — anything you need" },
    { href: "/build-with-me", label: "Build With Me",  icon: Flame,          tip: "Tell Forge what to build — get a step-by-step Moon plan" },
    { href: "/starters",      label: "Forge Starters", icon: Rocket,         tip: "Pre-built Moon workflows — pick a use case and launch instantly" },
    { href: "/project-room",  label: "Project Room",   icon: Layers,         tip: "Your crew HQ — assemble your moons, track everything in one place" },
    { href: "/moons/sage",    label: "Sage — Planner", icon: Compass,        tip: "Figures out what you're building and why, before a line is written" },
    { href: "/moons/scout",   label: "Scout — Research", icon: Crosshair,    tip: "Finds what already exists so you don't build the wrong thing" },
    { href: "/moons/quill",   label: "Quill — Writer", icon: Feather,        tip: "Names, copy, pitches, docs, brainstorms — everything that needs words" },
    { href: "/moons/ledger",  label: "Ledger — Tracker", icon: Receipt,      tip: "Time logged, money spent — always visible so nothing bleeds invisibly" },
    { href: "/moons/grit",    label: "Grit — Push",    icon: Dumbbell,       tip: "When you've hit the wall, Grit gets you one concrete step forward" },
    { href: "/moons/herald",  label: "Herald — Launch", icon: Megaphone,     tip: "Plan and execute the moment your work goes into the world" },
    { href: "/hawk",          label: "Ask Hawk",        icon: Crosshair,     tip: "Get quick answers about your project or code" },
    { href: "/snippets",      label: "Saved Snippets",  icon: Archive,       tip: "Your personal library of reusable code pieces" },
  ];

  const createItems: NavItem[] = [
    { href: "/site-forge",       label: "Site Forge",        icon: Globe,       tip: "Build a professional business website in 60 seconds — yours forever" },
    { href: "/tools",            label: "AI Tools",          icon: Wrench,      tip: "A collection of AI-powered builder utilities" },
    { href: "/code-forge",       label: "Write Code (AI)",   icon: Code2,       tip: "Generate, explain, and improve code with AI" },
    { href: "/game-doc",         label: "Game Docs",         icon: BookOpen,    tip: "Build design documents for your game" },
    { href: "/game-tools",       label: "Game Design",       icon: Gamepad2,    tip: "AI tools for game mechanics, lore, and balance" },
    { href: "/game-studio",      label: "Game Studio",       icon: Swords,      tip: "Build a real game in Godot — right in your browser, AI-assisted" },
    { href: "/computer-advisor", label: "Computer Advisor",  icon: Monitor,     tip: "Personalized tips for your PC — gaming, speed, free software" },
    { href: "/screen-coach",     label: "Screen Coach",      icon: MonitorPlay, tip: "Share your screen and Forge watches, guides, walks you through everything" },
    { href: "/fix",              label: "Computer Fix",      icon: Wrench,      tip: "Flint diagnoses your computer problem first — $19 one-time fix" },
    { href: "/launch",           label: "Launch Checklist",  icon: Rocket,      tip: "Make sure your app is ready to ship" },
    { href: "/legal",            label: "Legal Explainer",   icon: Scale,       tip: "Translate legal terms into plain English" },
    { href: "/download",         label: "Get the App",       icon: Download,    tip: "Install 13 Moon Forge on any device — or download the Forge Remote Agent" },
  ];

  const learnItems: NavItem[] = [
    { href: "/sage",          label: "Learn to Code",       icon: GraduationCap, tip: "Step-by-step AI tutor — learn anything at your pace, beginner to advanced" },
    { href: "/diy-code",      label: "Write Code Yourself", icon: PencilLine,    tip: "Code editor — write your own code with no AI, no credits needed" },
    { href: "/debug-forge",   label: "Debug Forge",         icon: Bug,           tip: "Practice finding and fixing bugs — 12 difficulty levels, AI feedback" },
    { href: "/code-fix-test", label: "Code Fix Test",       icon: Timer,         tip: "Timed bug-fixing tests — every session tracked so you can improve" },
  ];

  const ownItems: NavItem[] = [
    { href: "/freedom-center", label: "Freedom Center",     icon: ShieldCheck, green: true, tip: "Move your app here — affordable hosting we'll never shut down" },
    { href: "/forge-hosting",  label: "Forge Hosting",      icon: Server,      tip: "All your apps — deployed, managed, and live on your own server" },
    { href: "/forge-coder",    label: "Forge Coder",        icon: Flame,       tip: "Describe anything — Forge writes and deploys the complete code for you" },
    { href: "/deploys",        label: "Deploy Dashboard",   icon: Zap,         tip: "All your running apps — trigger redeploys, view logs, check status" },
    { href: "/app-hub",        label: "Deploy Apps",        icon: Layers,      tip: "Deploy apps to your Coolify server with one click" },
    { href: "/migrate",        label: "Connect & Deploy",   icon: Rocket,      tip: "Build in Replit, auto-deploy here — connect a GitHub repo in 5 steps" },
    { href: "/github",         label: "GitHub",             icon: Github,      tip: "Connect your GitHub repositories" },
    { href: "/vault",          label: "The Vault",          icon: Vault,       tip: "Your private code vault — store, import, and own your repos" },
    { href: "/secrets",        label: "API Keys",           icon: KeyRound,    tip: "Securely store passwords, API keys, and tokens" },
    { href: "/monitor",        label: "App Health",         icon: Activity,    tip: "Live CPU, RAM, Disk gauges — know exactly when to upgrade" },
    { href: "/activity",       label: "Activity Feed",      icon: HardDrive,   tip: "Timeline of everything that happened — repos, imports, deployments" },
    { href: "/app-inspector",  label: "Forge Inspector",    icon: ScanLine,    tip: "Forge logs into your apps, visits every page, reports what's broken" },
    { href: "/get-forge",      label: "Forge Agent (CLI)",  icon: Terminal,    tip: "Install Forge on your computer — tell it what you need, it does it" },
    { href: "/forge-drop",     label: "Forge Drop",         icon: Upload,      tip: "Send files to any app in the ecosystem — zip, video, PDF, images" },
    { href: "/wizard",         label: "Move My App",        icon: Wand2,       tip: "Step-by-step wizard to move your app off Replit, Heroku, or Render" },
    { href: "/migration",      label: "Migration Status",   icon: ArrowRightLeft, tip: "Check the progress of an ongoing migration" },
    { href: "/leaving",        label: "Leaving Replit",     icon: LogOut,      tip: "Guides for escaping cloud platforms to your own server" },
    { href: "/sovereign",      label: "Self-Hosting Guide", icon: Shield,      tip: "The 13-point standard for truly owning your stack" },
    { href: "/registry",       label: "App Directory",      icon: Package,     tip: "Browse and submit self-hostable open-source apps" },
    { href: "/connections",    label: "Integrations",       icon: PlugZap,     tip: "Connect third-party services to the Forge" },
    { href: "/antivirus",      label: "Antivirus Link",     icon: ShieldAlert, tip: "Link 13 Moon Antivirus — extract emailed code and send it to Forge" },
    { href: "/mail-scanner",   label: "Mail Scanner",       icon: ScanLine,    tip: "Scan email attachments and route clean files to any app" },
    { href: "/domain-hub",     label: "Domain Hub",         icon: Globe,       tip: "Track all your domains — DNS status, SSL health, and expiry alerts" },
    { href: "/analytics",      label: "Analytics",          icon: BarChart2,   tip: "Page-view tracking for your hosted domains — add a snippet, see data instantly" },
    { href: "/env-manager",    label: "Env Manager",        icon: KeyRound,    tip: "View and edit environment variables for your deployed Coolify apps" },
    { href: "/cron-jobs",      label: "Cron Jobs",          icon: Timer,       tip: "Schedule recurring tasks — cleanups, reports, notifications — on your server" },
    { href: "/backup-restore", label: "Backup & Restore",   icon: HardDrive,   tip: "Snapshot and restore your Forge data with one click" },
    { href: "/database-manager", label: "DB Manager",       icon: Database,    tip: "Run SQL queries and browse tables in your Forge database" },
    { href: "/team",           label: "Team",               icon: Users,       tip: "Invite collaborators — editors and viewers with role-based access" },
    { href: "/code-vault",     label: "Code Vault",         icon: Archive,     tip: "Every version of your code — auto-saved on every push, always downloadable" },
    { href: "/app-logs",       label: "App Logs",           icon: Terminal,    tip: "Live container logs from your deployed Coolify apps" },
    { href: "/agent-bridge",   label: "Agent Bridge",       icon: Radio,       tip: "Connect local Forge Agents — send commands, relay messages, install apps remotely" },
    { href: "/services",       label: "Service Marketplace", icon: Database,    tip: "Every service a builder needs — VPS, databases, AI APIs, email, payments, and more" },
    { href: "/brand-scout",    label: "Brand Scout",         icon: Search,      tip: "Scan your brand's search presence, news coverage, and online reputation — get a fix plan" },
    { href: "/forge-press",    label: "Forge Press",         icon: Newspaper,   tip: "AI writes SEO press releases about your brand and distributes them to authority news sites" },
    { href: "/distribution-plan", label: "Distribution Plan", icon: Map,        tip: "Your full 6-tier roadmap — what I've built, what I'll build, what you do, and the honest cost of each" },
    { href: "/launch-kit",     label: "Launch Kit",          icon: Rocket,      tip: "Ready-to-paste copy + step-by-step submission for Product Hunt, BetaList, AlternativeTo, Indie Hackers, Show HN, and Nextdoor" },
    { href: "/accounts",       label: "Accounts & Sites",    icon: KeyRound,    tip: "Every external site you need to visit — 20 accounts, signup steps, status of each" },
    { href: "/discover",       label: "App Discovery",       icon: Globe,       tip: "Browse self-hostable apps — find something you love and Forge sets it up on your server" },
    { href: "/admin-hosting",  label: "Hosting Admin",       icon: Users,       tip: "Admin panel for managing Forge managed hosting users" },
  ];

  const TAB_ITEMS: Record<SidebarTab, NavItem[]> = {
    home:   homeItems,
    build:  buildItems,
    create: createItems,
    learn:  learnItems,
    own:    ownItems,
  };

  const TAB_DESCRIPTIONS: Record<SidebarTab, string> = {
    home:   "Start here",
    build:  "Build your idea with AI",
    create: "Tools & specialized AI",
    learn:  "Learn to code at your pace",
    own:    "Host & own your apps",
  };

  // ── Helpers ──────────────────────────────────────────────────────────────

  const isActive = (href: string) =>
    location === href ||
    (href !== "/" && href !== "/dashboard" && location.startsWith(href)) ||
    (href === "/dashboard" && location === "/dashboard");

  const NavLink = ({ href, label, icon: Icon, tip, green, onClick }: NavItem & { onClick?: () => void }) => (
    <Link
      href={href}
      onClick={onClick}
      title={tip}
      className={cn(
        "flex items-center gap-3 px-3 py-2 rounded-md transition-all duration-200",
        green
          ? isActive(href)
            ? "bg-green-500/15 text-green-400 font-semibold border border-green-500/30"
            : "text-green-500 hover:text-green-300 hover:bg-green-500/10 font-medium"
          : isActive(href)
            ? "bg-primary/10 text-primary font-medium"
            : "text-muted-foreground hover:text-foreground hover:bg-muted"
      )}
    >
      <Icon size={17} />
      <span className="flex-1 text-sm leading-tight">{label}</span>
    </Link>
  );

  // ── User panel ───────────────────────────────────────────────────────────

  const UserPanel = ({ onNavigate }: { onNavigate?: () => void }) => (
    isAuthenticated ? (
      <div className="flex items-center gap-2 p-2 rounded-lg hover:bg-muted transition-colors">
        {user?.profileImageUrl
          ? <img src={user.profileImageUrl} alt="" className="w-8 h-8 rounded-full" />
          : <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center"><User size={14} className="text-primary" /></div>
        }
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold truncate">{user?.firstName ?? "My Account"}</p>
          <p className="text-[10px] text-muted-foreground truncate">{user?.email}</p>
        </div>
        <div className="flex items-center gap-1">
          <Link href="/account" onClick={onNavigate} title="Account settings">
            <button className="p-1.5 rounded hover:bg-muted-foreground/20 transition-colors">
              <Settings size={13} className="text-muted-foreground" />
            </button>
          </Link>
          <button onClick={() => logout()} title="Sign out" className="p-1.5 rounded hover:bg-muted-foreground/20 transition-colors">
            <LogOut size={13} className="text-muted-foreground" />
          </button>
        </div>
      </div>
    ) : null
  );

  // ── Sidebar content ──────────────────────────────────────────────────────

  const SidebarContent = ({ onClose }: { onClose?: () => void }) => (
    <>
      {/* Logo */}
      <div className="px-5 pt-5 pb-3">
        <Link href="/dashboard" onClick={onClose}>
          <LogoWordmark size={36} />
        </Link>
      </div>

      {/* Tab buttons */}
      <div className="px-3 pb-2">
        <div className="grid grid-cols-5 gap-0.5 rounded-lg bg-muted/40 p-1">
          {TABS.map(tab => {
            const Icon = tab.icon;
            const isOwn = tab.id === "own";
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                title={TAB_DESCRIPTIONS[tab.id]}
                className={cn(
                  "flex flex-col items-center gap-0.5 py-1.5 px-1 rounded-md text-[10px] font-semibold transition-all",
                  active
                    ? isOwn
                      ? "bg-green-500/15 text-green-400 border border-green-500/20"
                      : "bg-background text-primary shadow-sm border border-border"
                    : isOwn
                      ? "text-green-600 hover:text-green-400 hover:bg-green-500/10"
                      : "text-muted-foreground hover:text-foreground hover:bg-background/50"
                )}
              >
                <Icon size={14} />
                <span className="leading-none">{tab.label}</span>
              </button>
            );
          })}
        </div>
        <p className="text-[10px] text-muted-foreground/50 px-1 mt-1.5">{TAB_DESCRIPTIONS[activeTab]}</p>
      </div>

      {/* Nav items for active tab */}
      <nav className="flex-1 px-3 overflow-y-auto">
        <div className="space-y-0.5">
          {TAB_ITEMS[activeTab].map(item => (
            <NavLink key={item.href} {...item} onClick={onClose} />
          ))}
        </div>

        {/* Bottom links — always visible */}
        <div className="pt-3 pb-2 space-y-0.5 border-t border-border mt-3">
          <NavLink href="/pricing" label="Upgrade Plan"      icon={CreditCard}    tip="See subscription options and upgrade"                                   onClick={onClose} />
          <NavLink href="/promise" label="Sovereign Promise" icon={Shield}        tip="Our commitment to the working person — read what we stand for"         onClick={onClose} />
          <a
            href={OUR_APPS_URL}
            target="_blank"
            rel="noopener noreferrer"
            title="Visit our other apps at thepeoplestownsq.com"
            className="flex items-center gap-3 px-3 py-2 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted text-sm transition-colors"
          >
            <ExternalLink size={17} />
            Our Other Apps
          </a>
          {!isAuthenticated && (
            <Link href="/sign-in" onClick={onClose} className="flex items-center gap-3 px-3 py-2 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted text-sm transition-colors">
              <LogIn size={17} />
              Sign In
            </Link>
          )}
          {isAdmin && (
            <NavLink href="/admin" label="Admin Panel" icon={ShieldAlert} tip="Review and manage app registry submissions" onClick={onClose} />
          )}
          {isAdmin && (
            <NavLink href="/admin/payment-funnel" label="Payment Funnel" icon={CreditCard} tip="Cross-app payment funnel — see what's selling" onClick={onClose} />
          )}
        </div>
      </nav>

      {/* Bottom bar */}
      <div className="px-3 pb-1 space-y-0.5">
        <button
          onClick={() => setCmdOpen(true)}
          className="w-full flex items-center justify-between gap-2 px-3 py-2 rounded-md text-xs text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          title="Command palette — navigate and run saved prompts"
        >
          <div className="flex items-center gap-2">
            <Search size={13} />
            <span>Search & Navigate</span>
          </div>
          <kbd className="text-[9px] bg-muted/80 border border-border rounded px-1 py-0.5 font-mono">⌘K</kbd>
        </button>
        <button
          onClick={() => setSkillOpen(true)}
          className="w-full flex items-center gap-2 px-3 py-2 rounded-md text-xs text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          title="Set your skill level — Forge adjusts explanations for you"
        >
          <GraduationCap size={14} />
          <span>My Skill Level</span>
        </button>
      </div>

      <div className="px-3 pb-2">
        <UserPanel onNavigate={onClose} />
      </div>

      <div className="p-3 pt-0">
        <div className="bg-accent/30 border border-accent/50 rounded-lg p-3 relative overflow-hidden">
          <div className="absolute -right-2 -bottom-2 text-primary/20">
            <Flame size={52} />
          </div>
          <p className="text-xs font-medium text-accent-foreground relative z-10 italic mb-1">
            "Ideas are free. Building is where the work starts."
          </p>
          <p className="text-[10px] text-muted-foreground relative z-10">— Forge, Moon #3</p>
        </div>
      </div>
    </>
  );

  return (
    <div className="flex min-h-screen bg-background text-foreground">
      <OnboardingModal />
      <SkillLevelDialog open={skillOpen} onClose={() => setSkillOpen(false)} />
      <CommandPalette open={cmdOpen} onClose={() => setCmdOpen(false)} />

      {/* Desktop Sidebar */}
      <aside className="w-64 border-r border-border bg-sidebar flex-col hidden md:flex shrink-0">
        <SidebarContent />
      </aside>

      {/* Mobile header */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-40 flex items-center justify-between px-4 py-3 bg-background/95 backdrop-blur border-b border-border">
        <Link href="/dashboard">
          <LogoMark size={28} />
        </Link>
        <button onClick={() => setMobileOpen(true)} className="p-2 rounded-md hover:bg-muted transition-colors" aria-label="Open menu">
          <Menu size={20} />
        </button>
      </div>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="md:hidden fixed inset-0 z-50 bg-black/60 backdrop-blur-sm" onClick={() => setMobileOpen(false)}>
          <aside
            className="absolute left-0 top-0 bottom-0 w-72 bg-sidebar border-r border-border flex flex-col overflow-y-auto"
            onClick={e => e.stopPropagation()}
          >
            <button onClick={() => setMobileOpen(false)} className="absolute top-4 right-4 p-2 rounded-md hover:bg-muted transition-colors" aria-label="Close menu">
              <X size={18} />
            </button>
            <SidebarContent onClose={() => setMobileOpen(false)} />
          </aside>
        </div>
      )}

      {/* Main content */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <div className="flex-1 overflow-y-auto">
          <div className="p-4 md:p-8 pt-16 md:pt-8">
            <div className="max-w-6xl mx-auto">
              {children}
            </div>
          </div>
        </div>
      </main>

      <HelpChat />
    </div>
  );
}
