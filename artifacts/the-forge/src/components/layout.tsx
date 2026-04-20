import { useState } from "react";
import { Link, useLocation } from "wouter";
import {
  Flame, FolderKanban, PlusCircle, CreditCard, ExternalLink,
  Sparkles, Code2, Wrench, BookOpen, Archive, Gamepad2, Rocket, Scale,
  GraduationCap, Crosshair, ArrowRightLeft, Layers, Wand2, LogOut, Shield, Github, Package,
  User, LogIn, Menu, X, Settings, KeyRound, ShieldAlert, PlugZap,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { LogoMark, LogoWordmark } from "@/components/logo";
import { ThirteenMoonsBadge } from "@/components/ThirteenMoonsBadge";
import { OnboardingModal } from "@/components/onboarding-modal";
import { useUser, useClerk, useAuth, Show } from "@clerk/react";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { useQuery } from "@tanstack/react-query";

const API_BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

function useIsAdmin() {
  const { getToken, isSignedIn } = useAuth();
  const { data } = useQuery<{ isAdmin: boolean }>({
    queryKey: ["admin-check"],
    enabled: !!isSignedIn,
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      const token = await getToken();
      const r = await fetch(`${API_BASE}/api/admin/check`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      return r.json();
    },
  });
  return data?.isAdmin ?? false;
}

const OUR_APPS_URL = "https://thepeoplestownsq.com/our-apps";
const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

function UserPanel({ onNavigate }: { onNavigate?: () => void }) {
  const { user, isLoaded } = useUser();
  const { signOut } = useClerk();

  if (!isLoaded) return null;

  return (
    <Show when="signed-in">
      <div className="flex items-center gap-2 px-3 py-2 rounded-md border border-border/50 bg-muted/20">
        {user?.imageUrl ? (
          <img src={user.imageUrl} alt={user.fullName ?? ""} className="w-7 h-7 rounded-full shrink-0" />
        ) : (
          <div className="w-7 h-7 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
            <User size={13} className="text-primary" />
          </div>
        )}
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold truncate">{user?.firstName ?? user?.username ?? "Builder"}</p>
          <p className="text-[10px] text-muted-foreground truncate">{user?.primaryEmailAddress?.emailAddress}</p>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <Link
            href="/account"
            onClick={onNavigate}
            title="Account settings"
            className="text-muted-foreground hover:text-foreground transition-colors p-0.5"
          >
            <Settings size={13} />
          </Link>
          <button
            onClick={() => signOut({ redirectUrl: `${basePath}/` })}
            title="Sign out"
            className="text-muted-foreground hover:text-foreground transition-colors p-0.5"
          >
            <LogOut size={13} />
          </button>
        </div>
      </div>
    </Show>
  );
}

export function Layout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const isAdmin = useIsAdmin();

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
    { href: "/github",      label: "Code Sources",      icon: Github },
    { href: "/wizard",      label: "Migration Wizard",  icon: Wand2 },
    { href: "/migration",   label: "Migration Hub",     icon: ArrowRightLeft },
    { href: "/leaving",     label: "Escape Routes",     icon: LogOut },
    { href: "/sovereign",   label: "Sovereign Stack",   icon: Shield },
    { href: "/app-hub",     label: "App Hub",           icon: Layers },
    { href: "/registry",    label: "App Registry",      icon: Package },
    { href: "/secrets",     label: "Secrets Vault",     icon: KeyRound },
    { href: "/connections", label: "Connections",        icon: PlugZap },
  ];

  const isActive = (href: string) =>
    location === href || (href !== "/" && location.startsWith(href));

  const NavLink = ({
    href, label, icon: Icon, onClick,
  }: { href: string; label: string; icon: React.ComponentType<{ size: number }>; onClick?: () => void }) => (
    <Link
      href={href}
      onClick={onClick}
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

  const SidebarContent = ({ onClose }: { onClose?: () => void }) => (
    <>
      <div className="p-5 pb-4">
        <Link href="/" onClick={onClose}>
          <LogoWordmark size={38} />
        </Link>
      </div>

      <nav className="flex-1 px-4 pt-2 overflow-y-auto">
        <div className="space-y-1">
          {builderItems.map(item => <NavLink key={item.href} {...item} onClick={onClose} />)}
        </div>

        <div className="mt-4 mb-2 px-3">
          <p className="text-[10px] font-bold tracking-widest text-muted-foreground/60 uppercase">Creator Tools</p>
        </div>
        <div className="space-y-1">
          {toolItems.map(item => <NavLink key={item.href} {...item} onClick={onClose} />)}
        </div>

        <div className="mt-4 mb-2 px-3">
          <p className="text-[10px] font-bold tracking-widest text-muted-foreground/60 uppercase">Self-Host</p>
        </div>
        <div className="space-y-1">
          {selfHostItems.map(item => <NavLink key={item.href} {...item} onClick={onClose} />)}
        </div>

        <div className="mt-4 space-y-1">
          <NavLink href="/pricing" label="Upgrade" icon={CreditCard} onClick={onClose} />
          <a
            href={OUR_APPS_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 px-3 py-2 rounded-md transition-all duration-200 text-muted-foreground hover:text-foreground hover:bg-muted"
          >
            <ExternalLink size={18} />
            Our Apps
          </a>
          <Show when="signed-out">
            <Link
              href="/sign-in"
              onClick={onClose}
              className="flex items-center gap-3 px-3 py-2 rounded-md transition-all duration-200 text-muted-foreground hover:text-foreground hover:bg-muted"
            >
              <LogIn size={18} />
              Sign In
            </Link>
          </Show>
          {isAdmin && (
            <NavLink href="/admin" label="Admin Panel" icon={ShieldAlert} onClick={onClose} />
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
            "Ideas are free. Building is where the work starts. Let's get to work."
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

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0">
        {/* Mobile Header */}
        <header className="md:hidden border-b border-border bg-sidebar px-4 py-3 flex items-center justify-between gap-3">
          <Link href="/">
            <LogoMark size={30} />
          </Link>

          <div className="flex items-center gap-2 ml-auto">
            <Show when="signed-in">
              <UserPanelMobile />
            </Show>
            <Show when="signed-out">
              <Link
                href="/sign-in"
                className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors"
              >
                <LogIn size={14} /> Sign In
              </Link>
            </Show>

            <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
              <SheetTrigger asChild>
                <button
                  className="p-2 rounded-md hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
                  aria-label="Open menu"
                >
                  {mobileOpen ? <X size={20} /> : <Menu size={20} />}
                </button>
              </SheetTrigger>
              <SheetContent side="left" className="p-0 w-72 bg-sidebar border-border flex flex-col">
                <SidebarContent onClose={() => setMobileOpen(false)} />
              </SheetContent>
            </Sheet>
          </div>
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

function UserPanelMobile() {
  const { user } = useUser();
  return (
    <Link href="/account" className="flex items-center gap-1.5">
      {user?.imageUrl ? (
        <img src={user.imageUrl} alt="" className="w-6 h-6 rounded-full" />
      ) : (
        <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center">
          <User size={12} className="text-primary" />
        </div>
      )}
      <span className="text-xs font-medium truncate max-w-[80px]">{user?.firstName ?? "Account"}</span>
    </Link>
  );
}
