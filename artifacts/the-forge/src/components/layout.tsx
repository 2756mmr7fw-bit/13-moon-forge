import { Link, useLocation } from "wouter";
import { Flame, FolderKanban, PlusCircle, CreditCard } from "lucide-react";
import { cn } from "@/lib/utils";
import { LogoMark, LogoWordmark } from "@/components/logo";

export function Layout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();

  const navItems = [
    { href: "/", label: "The Anvil", icon: Flame },
    { href: "/projects", label: "My Projects", icon: FolderKanban },
    { href: "/projects/new", label: "New Creation", icon: PlusCircle },
    { href: "/pricing", label: "Upgrade", icon: CreditCard },
  ];

  return (
    <div className="flex min-h-screen bg-background text-foreground">
      {/* Sidebar */}
      <aside className="w-64 border-r border-border bg-sidebar flex flex-col hidden md:flex shrink-0">
        <div className="p-5 pb-4">
          <Link href="/">
            <LogoWordmark size={38} />
          </Link>
        </div>

        <nav className="flex-1 px-4 space-y-1 pt-2">
          {navItems.map((item) => {
            const isActive = location === item.href || (item.href !== "/" && location.startsWith(item.href));
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 px-3 py-2 rounded-md transition-all duration-200",
                  isActive
                    ? "bg-primary/10 text-primary font-medium"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted"
                )}
              >
                <item.icon size={18} />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="p-4 mt-auto">
          <div className="bg-accent/30 border border-accent/50 rounded-lg p-4 relative overflow-hidden">
            <div className="absolute -right-2 -bottom-2 text-primary/20">
              <Flame size={64} />
            </div>
            <p className="text-sm font-medium text-accent-foreground relative z-10 italic mb-2">
              "Every great site begins with a single strike of the hammer."
            </p>
            <p className="text-xs text-muted-foreground relative z-10">— Forge</p>
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
          <span
            className="font-black uppercase tracking-widest text-sm"
            style={{
              background: "linear-gradient(90deg, #fb923c, #fbbf24)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
            }}
          >
            13 Moon Forge
          </span>
        </header>

        <div className="flex-1 overflow-auto p-4 md:p-8 lg:p-10">
          <div className="max-w-6xl mx-auto">
            {children}
          </div>
        </div>
      </main>
    </div>
  );
}
