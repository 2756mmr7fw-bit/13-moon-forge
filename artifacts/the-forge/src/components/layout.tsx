import { Link, useLocation } from "wouter";
import {
  Flame, FolderKanban, PlusCircle, CreditCard, ExternalLink,
  Sparkles, Code2, Wrench, BookOpen, Archive, Gamepad2, Rocket, Scale,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { LogoMark, LogoWordmark } from "@/components/logo";

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
    { href: "/tools",       label: "Forge Tools",       icon: Wrench },
    { href: "/code-forge",  label: "Code Forge",        icon: Code2 },
    { href: "/game-doc",    label: "Game Doc Builder",  icon: BookOpen },
    { href: "/game-tools",  label: "Game Design Tools", icon: Gamepad2 },
    { href: "/launch",      label: "Launch Kit",        icon: Rocket },
    { href: "/legal",       label: "Legal Decoder",     icon: Scale },
    { href: "/snippets",    label: "Snippet Vault",     icon: Archive },
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
            <p className="text-xs text-muted-foreground relative z-10">— Forge, Moon #5</p>
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
          <footer className="border-t border-border px-4 md:px-8 lg:px-10 py-4">
            <div className="max-w-6xl mx-auto">
              <p className="text-xs text-muted-foreground text-center">
                Part of the{" "}
                <a
                  href={OUR_APPS_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:text-primary/80 underline underline-offset-2 transition-colors"
                >
                  Sovereign Digital ecosystem
                </a>
                {" "}— 9 apps built for the people.
              </p>
            </div>
          </footer>
        </div>
      </main>
    </div>
  );
}
