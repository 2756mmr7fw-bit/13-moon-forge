import { useEffect } from "react";
import { useRoute, useSearch } from "wouter";
import { MoonChat, MOON_CONFIGS } from "@/components/moon-chat";
import { Link } from "wouter";
import { ArrowLeft } from "lucide-react";

export default function MoonPage() {
  const [, params] = useRoute("/moons/:moonId");
  const search = useSearch();
  const moonId = params?.moonId ?? "";
  const config = MOON_CONFIGS[moonId];

  const projectId = new URLSearchParams(search).get("project") ?? undefined;

  useEffect(() => {
    if (config) document.title = `${config.name} — The Thirteen Moons`;
    return () => { document.title = "13 Moon Forge"; };
  }, [config]);

  if (!config) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 text-center">
        <p className="text-4xl">🌑</p>
        <h1 className="text-xl font-bold">Moon not found</h1>
        <p className="text-muted-foreground text-sm">"{moonId}" isn't one of the thirteen moons.</p>
        <Link href="/project-room" className="text-primary text-sm hover:underline flex items-center gap-1">
          <ArrowLeft size={14} /> Back to Project Room
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-4">
        <Link href="/project-room" className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft size={12} /> Project Room
        </Link>
      </div>
      <MoonChat moonId={moonId} initialProjectId={projectId} />
    </div>
  );
}
