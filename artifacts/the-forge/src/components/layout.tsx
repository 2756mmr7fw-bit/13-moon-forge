import { Link, useLocation } from "wouter";
import {
  Flame, FolderKanban, PlusCircle, CreditCard, ExternalLink,
  Sparkles, Code2, Wrench, BookOpen, Archive, Gamepad2, Rocket, Scale,
  GraduationCap, Crosshair, ArrowRightLeft, Layers, Wand2, LogOut, Shield,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { LogoMark, LogoWordmark } from "@/components/logo";
import { ThirteenMoonsBadge } from "@/components/ThirteenMoonsBadge";

const OUR_APPS_URL = "https://thepeoplestownsq.com/our-apps";

export function Layout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();

  const builderItems = [
    { href: "/", label: "The Anvil", icon: Flame },
    { href: "/projects", label: "My Projects", icon: FolderKanban },
    { href: "/projects/new", label: "New Creation", icon: PlusCircle },
    { href: "/brainstorm", label: "Brainstorm", icon: Sparkles },
  ];

  const toolItems = [
    { href: "/sage",        label: "Learn with Sage",   icon: GraduationCap },
    { href: "/hawk",        label: "Ask Hawk",          icon: Crosshair },
    { href: "/tools",       label: "Forge Tools",       icon: Wrench },
    { href: "/code-forge",  label: "Code Forge",        icon: Code2 },
    { href: "/game-doc",    label: "Game Doc Builder",  icon: BookOpen },
    { href: "/game-tools",  label: "Game Design Tools", icon: Gamepad2 },
    { href: "/launch",      label: "Launch Kit",        icon: Rocket },
    { href: "/legal",       label: "Legal Decoder",     icon: Scale },
    { href: "/snippets",    label: "Snippet Vault",     icon: Archive },
  ];

  const selfHostItems = [
    { href: "/wizard",      label: "Migration Wizard",  icon: Wand2 },
    { href: "/migration",   label: "Migration Hub",     icon: ArrowRightLeft },
    { href: "/leaving",     label: "Escape Routes",     icon: LogOut },
    { href: "/sovereign",   label: "Sovereign Stack",   icon: Shield },
    { href: "/app-hub",     label: "App Hub",           icon: Layers },
  ];

  const isActive = (href: string) =>
    location === href || (href !== "/" && location.startsWith(href));

  const NavLink = ({ href, label, icon: Icon }: { href: string; label: string; icon: React.ComponentType<{ size: number }> }) => (
    <Link
      href={href}
      className={cn(
        "flex items-center gap-3 px-3 py-2 rounded-md transition-all duration-200",
        isActive(href)
          ? "bg-primary/10 text-primary font-medium"
          : "text-muted-foreground hover:text-foreground hover:bg-muted"
      )}
    >
      <Icon size={18} />
      {label}
    </Link>
  );

  return (
    <div className="flex min-h-screen bg-background text-foreground">
      {/* Sidebar */}
      <aside className="w-64 border-r border-border bg-sidebar flex flex-col hidden md:flex shrink-0">
        <div className="p-5 pb-4">
          <Link href="/">
            <LogoWordmark size={38} />
          </Link>
        </div>

        <nav className="flex-1 px-4 pt-2 overflow-y-auto">
          <div className="space-y-1">
            {builderItems.map(item => <NavLink key={item.href} {...item} />)}
          </div>

          <div className="mt-4 mb-2 px-3">
            <p className="text-[10px] font-bold tracking-widest text-muted-foreground/60 uppercase">Creator Tools</p>
          </div>
          <div className="space-y-1">
            {toolItems.map(item => <NavLink key={item.href} {...item} />)}
          </div>

          <div className="mt-4 mb-2 px-3">
            <p className="text-[10px] font-bold tracking-widest text-muted-foreground/60 uppercase">Self-Host</p>
          </div>
          <div className="space-y-1">
            {selfHostItems.map(item => <NavLink key={item.href} {...item} />)}
          </div>

          <div className="mt-4 space-y-1">
            <NavLink href="/pricing" label="Upgrade" icon={CreditCard} />
            <a
              href={OUR_APPS_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 px-3 py-2 rounded-md transition-all duration-200 text-muted-foreground hover:text-foreground hover:bg-muted"
            >
              <ExternalLink size={18} />
              Our Apps
            </a>
          </div>
        </nav>

        <div className="p-4 mt-auto">
          <div className="bg-accent/30 border border-accent/50 rounded-lg p-4 relative overflow-hidden">
            <div className="absolute -right-2 -bottom-2 text-primary/20">
              <Flame size={64} />
            </div>
            <p className="text-sm font-medium text-accent-foreground relative z-10 italic mb-2">
              "Ideas are free. Building is where the work starts. Let's get to work."
            </p>
            <p className="text-xs text-muted-foreground relative z-10">— Forge, Moon #3</p>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0">
        {/* Mobile Header */}
        <header className="md:hidden border-b border-border bg-sidebar p-4 flex items-center justify-between">
          <Link href="/">
            <LogoMark size={32} />
          </Link>
          <a
            href={OUR_APPS_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            Our Apps <ExternalLink size={12} />
          </a>
        </header>

        <div className="flex-1 overflow-auto flex flex-col">
          <div className="flex-1 p-4 md:p-8 lg:p-10">
            <div className="max-w-6xl mx-auto">
              {children}
            </div>
          </div>

          {/* Footer */}
          <footer className="border-t border-border px-4 md:px-8 lg:px-10">
            <div className="max-w-6xl mx-auto flex items-center gap-3 py-6 text-sm text-muted-foreground">
              <a href="https://thepeoplestownsq.com" aria-label="13 Moons — Sovereign Digital">
                <ThirteenMoonsBadge size={40} />
              </a>
              <div>
                <div className="font-semibold tracking-wide">Sealed by 13 Moons</div>
                <div className="text-xs opacity-70">Sovereign Digital LLC · Member of the 13 Moons Network</div>
              </div>
            </div>
          </footer>
        </div>
      </main>
    </div>
  );
}
