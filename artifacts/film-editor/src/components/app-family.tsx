import { ExternalLink, Sparkles, Users, Film, Feather, Smartphone, Flame } from "lucide-react";
import { cn } from "@/lib/utils";

const APPS = [
  { id: "forge",        name: "13 Moon Forge",           tagline: "AI dev platform — build apps and self-host them.",        url: "https://13moonforge.ai",                      icon: Flame,      accent: "from-orange-500/20 to-amber-500/20 border-orange-500/40" },
  { id: "tpts",         name: "The People's Town Square", tagline: "Delete-proof social network. No algorithm. Real humans only.", url: "https://thepeoplestownsquare.ai",             icon: Users,      accent: "from-emerald-500/20 to-teal-500/20 border-emerald-500/40" },
  { id: "film-editor",  name: "13 Moon Film Editor",      tagline: "Browser-based film editor. No install. AI-assisted.",        url: "https://13moonforge.ai/film-editor",          icon: Film,       accent: "from-purple-500/20 to-fuchsia-500/20 border-purple-500/40" },
  { id: "ezquill",      name: "EzQuill",                  tagline: "Clean writing tool. AI-assisted. No lock-in.",               url: "https://13moonforge.ai/ezquill",              icon: Feather,    accent: "from-blue-500/20 to-cyan-500/20 border-blue-500/40" },
  { id: "forge-mobile", name: "13 Moon on the go",        tagline: "Mobile companion — check your apps from anywhere.",          url: "https://13moonforge.ai/mobile",               icon: Smartphone, accent: "from-rose-500/20 to-pink-500/20 border-rose-500/40" },
];

export function AppFamily({ currentAppId, className }: { currentAppId?: string; className?: string }) {
  return (
    <div className={cn("rounded-xl border border-white/10 bg-white/[0.02] p-6 mt-12", className)}>
      <div className="flex items-center gap-2 mb-1">
        <Sparkles className="w-4 h-4 text-primary" />
        <h3 className="font-semibold text-white/90">The 13 Moon Network</h3>
      </div>
      <p className="text-xs text-white/50 mb-4">
        Every app in the family. Built by one person. Owned by you. No middlemen.
      </p>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {APPS.map((app) => {
          const isCurrent = app.id === currentAppId;
          return (
            <a
              key={app.id}
              href={app.url}
              target={isCurrent ? undefined : "_blank"}
              rel="noreferrer"
              className={cn(
                "group rounded-lg border bg-gradient-to-br p-3 transition-all hover:scale-[1.02]",
                app.accent,
                isCurrent && "ring-2 ring-primary"
              )}
            >
              <div className="flex items-start gap-2">
                <div className="shrink-0 w-8 h-8 rounded-md bg-black/40 border border-white/10 flex items-center justify-center">
                  <app.icon className="w-4 h-4 text-white/90" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <div className="font-semibold text-sm truncate text-white/90">{app.name}</div>
                    {isCurrent ? (
                      <span className="text-[10px] uppercase tracking-wider font-bold text-primary">You are here</span>
                    ) : (
                      <ExternalLink className="w-3 h-3 text-white/40 opacity-0 group-hover:opacity-100 transition-opacity" />
                    )}
                  </div>
                  <div className="text-xs text-white/50 line-clamp-2 mt-0.5">{app.tagline}</div>
                </div>
              </div>
            </a>
          );
        })}
      </div>
    </div>
  );
}
