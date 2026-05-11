import { useState, useEffect } from "react";
import { User, Globe, ExternalLink, Sparkles, Server, Megaphone, AlertCircle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface ShowcaseApp {
  id: number;
  name: string;
  tagline: string;
  description: string;
  websiteUrl: string | null;
  logoUrl: string | null;
  category: string;
  listingType: "hosted" | "advertise";
  isActive: boolean;
  builderName: string | null;
  submittedBy: string | null;
}

interface ProfileData {
  userId: string;
  displayName: string | null;
  imageUrl: string | null;
  apps: ShowcaseApp[];
}

export default function BuilderProfilePage({ params }: { params: { userId: string } }) {
  const userId = params?.userId ?? "";
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!userId) return;
    (async () => {
      const res = await fetch(`/api/builder/${encodeURIComponent(userId)}`);
      if (res.status === 404) { setNotFound(true); setLoading(false); return; }
      const json = await res.json() as ProfileData;
      setProfile(json);
      setLoading(false);
    })();
  }, [userId]);

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto p-6 space-y-6">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-muted animate-pulse" />
          <div className="space-y-2">
            <div className="h-6 bg-muted rounded w-40 animate-pulse" />
            <div className="h-4 bg-muted rounded w-24 animate-pulse" />
          </div>
        </div>
        <div className="grid grid-cols-1 gap-4">
          {[1, 2].map(i => <div key={i} className="h-28 bg-muted rounded-xl animate-pulse" />)}
        </div>
      </div>
    );
  }

  if (notFound || !profile) {
    return (
      <div className="max-w-2xl mx-auto p-6 text-center py-24 space-y-3">
        <AlertCircle className="w-10 h-10 text-muted-foreground/40 mx-auto" />
        <p className="font-medium">Builder not found</p>
        <p className="text-sm text-muted-foreground">This profile doesn't exist or has no public apps.</p>
      </div>
    );
  }

  const hostedApps = profile.apps.filter(a => a.listingType === "hosted");
  const advertisedApps = profile.apps.filter(a => a.listingType === "advertise");

  return (
    <div className="max-w-2xl mx-auto p-6 space-y-8">
      {/* Profile header */}
      <div className="flex items-center gap-4">
        {profile.imageUrl ? (
          <img src={profile.imageUrl} alt={profile.displayName ?? "Builder"} className="w-16 h-16 rounded-full object-cover border" />
        ) : (
          <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
            <User className="w-7 h-7 text-primary" />
          </div>
        )}
        <div>
          <h1 className="text-xl font-serif font-bold">{profile.displayName ?? "Anonymous Builder"}</h1>
          <p className="text-sm text-muted-foreground">{profile.apps.length} app{profile.apps.length !== 1 ? "s" : ""} on the Forge Showcase</p>
        </div>
      </div>

      {profile.apps.length === 0 && (
        <Card className="text-center py-12">
          <CardContent>
            <Sparkles className="w-8 h-8 text-muted-foreground/40 mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">This builder has no public apps yet.</p>
          </CardContent>
        </Card>
      )}

      {hostedApps.length > 0 && (
        <section className="space-y-3">
          <div className="flex items-center gap-2">
            <Server className="w-4 h-4 text-primary" />
            <h2 className="font-semibold text-sm">Hosted on Forge</h2>
            <Badge variant="secondary" className="text-xs">{hostedApps.length}</Badge>
          </div>
          <div className="grid grid-cols-1 gap-3">
            {hostedApps.map(app => (
              <AppCard key={app.id} app={app} />
            ))}
          </div>
        </section>
      )}

      {advertisedApps.length > 0 && (
        <section className="space-y-3">
          <div className="flex items-center gap-2">
            <Megaphone className="w-4 h-4 text-muted-foreground" />
            <h2 className="font-semibold text-sm text-muted-foreground">Also by this builder</h2>
            <Badge variant="outline" className="text-xs">{advertisedApps.length}</Badge>
          </div>
          <div className="grid grid-cols-1 gap-3">
            {advertisedApps.map(app => (
              <AppCard key={app.id} app={app} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function AppCard({ app }: { app: ShowcaseApp }) {
  return (
    <Card className="hover:border-primary/40 transition-colors">
      <CardContent className="p-4 flex items-start gap-3">
        {app.logoUrl ? (
          <img src={app.logoUrl} alt={app.name} className="w-10 h-10 rounded-xl object-cover shrink-0 border" />
        ) : (
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
            <Globe className="w-5 h-5 text-primary" />
          </div>
        )}
        <div className="flex-1 min-w-0 space-y-1">
          <div className="flex items-center gap-2">
            <span className="font-medium text-sm">{app.name}</span>
            <Badge variant="outline" className="text-xs capitalize">{app.category}</Badge>
          </div>
          <p className="text-xs text-muted-foreground line-clamp-2">{app.tagline}</p>
        </div>
        {app.websiteUrl && (
          <a href={app.websiteUrl} target="_blank" rel="noopener noreferrer">
            <Button size="sm" variant="ghost" className="h-8 w-8 p-0 shrink-0">
              <ExternalLink className="w-3.5 h-3.5" />
            </Button>
          </a>
        )}
      </CardContent>
    </Card>
  );
}
