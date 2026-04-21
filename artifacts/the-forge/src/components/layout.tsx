import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import {
  Flame, FolderKanban, PlusCircle, CreditCard, ExternalLink,
  Sparkles, Code2, Wand2, Layers, Scale, Crosshair, Activity,
  GraduationCap, ArrowRightLeft, Wrench, BookOpen, Archive, Gamepad2, Rocket, LogOut,
  Shield, Github, Package, User, LogIn, Menu, X, Settings, KeyRound, ShieldAlert, PlugZap, Swords, Monitor,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { LogoMark, LogoWordmark } from "@/components/logo";
import { OnboardingModal } from "@/components/onboarding-modal";
import { useUser, useClerk, useAuth, Show } from "@clerk/react";

const OUR_APPS_URL = "https://thepeoplestownsq.com";

interface NavItem {
  href: string;
  label: string;
  icon: React.ComponentType<{ size: number }>;
  tip: string;
}

const API_BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

export function Layout({ children }: { children: React.ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const { user } = useUser();
  const { signOut } = useClerk();
  const { getToken } = useAuth();
  const location = useLocation()[0];

  useEffect(() => {
    (async () => {
      try {
        const token = await getToken();
        const r = await fetch(`${API_BASE}/api/admin/check`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        if (r.ok) { const d = await r.json() as { isAdmin: boolean }; setIsAdmin(d.isAdmin); }
      } catch { /* not admin or not logged in */ }
    })();
  }, [getToken]);

  // ── Navigation items ──────────────────────────────────────────────────────

  const builderItems: NavItem[] = [
    { href: "/",             label: "Home",             icon: Flame,        tip: "Your dashboard — projects, stats, quick actions" },
    { href: "/projects",     label: "My Projects",      icon: FolderKanban, tip: "View and manage all your projects"              },
    { href: "/projects/new", label: "New Project",      icon: PlusCircle,   tip: "Start a brand-new project from scratch"         },
    { href: "/brainstorm",   label: "Brainstorm",        icon: Sparkles,     tip: "AI helps you flesh out and plan your idea"      },
  ];

  const toolItems: NavItem[] = [
    { href: "/sage",       label: "Learn with Sage",     icon: GraduationCap, tip: "Step-by-step AI tutor — learn anything at your pace" },
    { href: "/hawk",       label: "Ask Hawk",            icon: Crosshair,     tip: "Get quick answers about your project or code"         },
    { href: "/tools",      label: "AI Tools",            icon: Wrench,        tip: "A collection of AI-powered builder utilities"         },
    { href: "/code-forge", label: "Write Code",          icon: Code2,         tip: "Generate, explain, and improve code with AI"          },
    { href: "/game-doc",    label: "Game Docs",           icon: BookOpen,      tip: "Build design documents for your game"                 },
    { href: "/game-tools",  label: "Game Design",        icon: Gamepad2,      tip: "AI tools for game mechanics, lore, and balance"       },
    { href: "/game-studio",       label: "Game Studio",        icon: Swords,   tip: "Build a real game in Godot — right in your browser, AI-assisted" },
    { href: "/computer-advisor",  label: "Computer Advisor",   icon: Monitor,  tip: "Get personalized tips for your PC — gaming, speed, and free software" },
    { href: "/launch",     label: "Launch Checklist",    icon: Rocket,        tip: "Make sure your app is ready to ship"                  },
    { href: "/legal",      label: "Legal Explainer",     icon: Scale,         tip: "Translate legal terms into plain English"             },
    { href: "/snippets",   label: "Saved Snippets",      icon: Archive,       tip: "Your personal library of reusable code pieces"        },
  ];

  const selfHostItems: NavItem[] = [
    { href: "/github",     label: "GitHub",              icon: Github,          tip: "Connect your GitHub repositories"                                  },
    { href: "/wizard",     label: "Move My App",         icon: Wand2,           tip: "Step-by-step wizard to move your app off Replit, Heroku, or Render" },
    { href: "/migration",  label: "Migration Status",    icon: ArrowRightLeft,  tip: "Check the progress of an ongoing migration"                        },
    { href: "/leaving",    label: "Leaving Replit/Heroku",icon: LogOut,         tip: "Guides for escaping cloud platforms to your own server"            },
    { href: "/sovereign",  label: "Self-Hosting Guide",  icon: Shield,          tip: "The 13-point standard for truly owning your stack"                 },
    { href: "/app-hub",    label: "Deploy Apps",         icon: Layers,          tip: "Deploy apps to your Coolify server with one click"                 },
    { href: "/registry",   label: "App Directory",       icon: Package,         tip: "Browse and submit self-hostable open-source apps"                  },
    { href: "/secrets",    label: "API Keys",            icon: KeyRound,        tip: "Securely store passwords, API keys, and tokens"                    },
    { href: "/monitor",    label: "App Health",          icon: Activity,        tip: "Live status of your running apps and infrastructure"               },
    { href: "/connections",label: "Integrations",        icon: PlugZap,         tip: "Connect third-party services to the Forge"                        },
  ];

  const isActive = (href: string) =>
    location === href || (href !== "/" && location.startsWith(href));

  const NavLink = ({ href, label, icon: Icon, tip, onClick }: NavItem & { onClick?: () => void }) => (
    <Link
      href={href}
      onClick={onClick}
      title={tip}
      className={cn(
        "flex items-center gap-3 px-3 py-2 rounded-md transition-all duration-200 group",
        isActive(href)
          ? "bg-primary/10 text-primary font-medium"
          : "text-muted-foreground hover:text-foreground hover:bg-muted"
      )}
    >
      <Icon size={18} />
      <span className="flex-1 text-sm leading-tight">{label}</span>
    </Link>
  );

  // ── User panel ─────────────────────────────────────────────────────────────

  const UserPanel = ({ onNavigate }: { onNavigate?: () => void }) => (
    <Show when="signed-in">
      <div className="flex items-center gap-2 p-2 rounded-lg hover:bg-muted transition-colors">
        {user?.imageUrl
          ? <img src={user.imageUrl} alt="" className="w-8 h-8 rounded-full" />
          : <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center"><User size={14} className="text-primary" /></div>
        }
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold truncate">{user?.firstName ?? user?.username ?? "My Account"}</p>
          <p className="text-[10px] text-muted-foreground truncate">{user?.emailAddresses?.[0]?.emailAddress}</p>
        </div>
        <div className="flex items-center gap-1">
          <Link href="/account" onClick={onNavigate} title="Account settings">
            <button className="p-1.5 rounded hover:bg-muted-foreground/20 transition-colors">
              <Settings size={13} className="text-muted-foreground" />
            </button>
          </Link>
          <button
            onClick={() => signOut()}
            title="Sign out"
            className="p-1.5 rounded hover:bg-muted-foreground/20 transition-colors"
          >
            <LogOut size={13} className="text-muted-foreground" />
          </button>
        </div>
      </div>
    </Show>
  );

  // ── Sidebar content ────────────────────────────────────────────────────────

  const SidebarContent = ({ onClose }: { onClose?: () => void }) => (
    <>
      <div className="p-5 pb-4">
        <Link href="/" onClick={onClose}>
          <LogoWordmark size={38} />
        </Link>
      </div>

      <nav className="flex-1 px-4 pt-2 overflow-y-auto space-y-1">

        {/* Builder */}
        <div className="space-y-0.5">
          {builderItems.map(item => <NavLink key={item.href} {...item} onClick={onClose} />)}
        </div>

        {/* AI Tools */}
        <div className="pt-4 pb-1 px-3">
          <p className="text-[10px] font-bold tracking-widest text-muted-foreground/50 uppercase">AI Tools</p>
        </div>
        <div className="space-y-0.5">
          {toolItems.map(item => <NavLink key={item.href} {...item} onClick={onClose} />)}
        </div>

        {/* Own Your Apps */}
        <div className="pt-4 pb-1 px-3">
          <p className="text-[10px] font-bold tracking-widest text-muted-foreground/50 uppercase">Own Your Apps</p>
        </div>
        <div className="space-y-0.5">
          {selfHostItems.map(item => <NavLink key={item.href} {...item} onClick={onClose} />)}
        </div>

        {/* Bottom links */}
        <div className="pt-4 space-y-0.5">
          <NavLink href="/pricing" label="Upgrade Plan" icon={CreditCard} tip="See subscription options and upgrade" onClick={onClose} />
          <a
            href={OUR_APPS_URL}
            target="_blank"
            rel="noopener noreferrer"
            title="Visit our other apps at thepeoplestownsq.com"
            className="flex items-center gap-3 px-3 py-2 rounded-md transition-all duration-200 text-muted-foreground hover:text-foreground hover:bg-muted text-sm"
          >
            <ExternalLink size={18} />
            Our Other Apps
          </a>
          <Show>
            <Link
              href="/sign-in"
              onClick={onClose}
              className="flex items-center gap-3 px-3 py-2 rounded-md transition-all duration-200 text-muted-foreground hover:text-foreground hover:bg-muted text-sm"
            >
              <LogIn size={18} />
              Sign In
            </Link>
          </Show>
          {isAdmin && (
            <NavLink href="/admin" label="Admin Panel" icon={ShieldAlert} tip="Review and manage app registry submissions" onClick={onClose} />
          )}
        </div>
      </nav>

      <div className="px-4 pb-2">
        <UserPanel onNavigate={onClose} />
      </div>

      <div className="p-4">
        <div className="bg-accent/30 border border-accent/50 rounded-lg p-4 relative overflow-hidden">
          <div className="absolute -right-2 -bottom-2 text-primary/20">
            <Flame size={64} />
          </div>
          <p className="text-sm font-medium text-accent-foreground relative z-10 italic mb-2">
            "Ideas are free. Building is where the work starts."
          </p>
          <p className="text-xs text-muted-foreground relative z-10">— Forge, Moon #3</p>
        </div>
      </div>
    </>
  );

  return (
    <div className="flex min-h-screen bg-background text-foreground">
      <OnboardingModal />

      {/* Desktop Sidebar */}
      <aside className="w-64 border-r border-border bg-sidebar flex-col hidden md:flex shrink-0">
        <SidebarContent />
      </aside>

      {/* Mobile header */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-40 flex items-center justify-between px-4 py-3 bg-background/95 backdrop-blur border-b border-border">
        <Link href="/">
          <LogoMark size={28} />
        </Link>
        <button
          onClick={() => setMobileOpen(true)}
          className="p-2 rounded-md hover:bg-muted transition-colors"
          aria-label="Open menu"
        >
          <Menu size={20} />
        </button>
      </div>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div
          className="md:hidden fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
          onClick={() => setMobileOpen(false)}
        >
          <aside
            className="absolute left-0 top-0 bottom-0 w-72 bg-sidebar border-r border-border flex flex-col overflow-y-auto"
            onClick={e => e.stopPropagation()}
          >
            <button
              onClick={() => setMobileOpen(false)}
              className="absolute top-4 right-4 p-2 rounded-md hover:bg-muted transition-colors"
              aria-label="Close menu"
            >
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
    </div>
  );
}
