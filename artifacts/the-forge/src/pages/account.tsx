import { useState, useEffect } from "react";
import { UserProfile, useUser } from "@clerk/react";
import { Show } from "@clerk/react";
import { Link } from "wouter";
import { ExternalLink, Shield, CreditCard, LogIn, Link2, CheckCircle2, Loader2, X, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");
const API = basePath;

const clerkAppearance = {
  variables: {
    colorPrimary: "hsl(20, 90%, 55%)",
    colorBackground: "hsl(0, 0%, 10%)",
    colorInputBackground: "hsl(0, 0%, 14%)",
    colorText: "hsl(0, 0%, 96%)",
    colorTextSecondary: "hsl(0, 0%, 60%)",
    colorInputText: "hsl(0, 0%, 96%)",
    colorNeutral: "hsl(0, 0%, 40%)",
    borderRadius: "0.625rem",
  },
  elements: {
    rootBox: "w-full",
    cardBox: "w-full shadow-none border border-border bg-transparent",
    card: "!shadow-none !border-0 !bg-transparent",
    navbar: "!border-r !border-border",
    navbarButton: "!rounded-md",
    pageScrollBox: "!pt-0",
  },
};

function TptsEmailLinker() {
  const [linked, setLinked]     = useState<string | null>(null);
  const [input, setInput]       = useState("");
  const [loading, setLoading]   = useState(true);
  const [saving, setSaving]     = useState(false);
  const [removing, setRemoving] = useState(false);
  const [error, setError]       = useState<string | null>(null);
  const [success, setSuccess]   = useState(false);

  useEffect(() => {
    fetch(`${API}/api/account/tpts-email`)
      .then(r => r.json())
      .then(d => { setLinked(d.tptsEmail ?? null); setInput(d.tptsEmail ?? ""); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  async function save() {
    if (!input.trim()) return;
    setSaving(true); setError(null); setSuccess(false);
    try {
      const res = await fetch(`${API}/api/account/tpts-email`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tptsEmail: input.trim() }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "Failed to save"); return; }
      setLinked(data.tptsEmail);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch {
      setError("Something went wrong. Try again.");
    } finally {
      setSaving(false);
    }
  }

  async function remove() {
    setRemoving(true); setError(null);
    try {
      await fetch(`${API}/api/account/tpts-email`, { method: "DELETE" });
      setLinked(null); setInput("");
    } catch {
      setError("Failed to remove.");
    } finally {
      setRemoving(false);
    }
  }

  return (
    <div className="rounded-xl border border-border bg-card p-5 space-y-4">
      <div className="flex items-start gap-3">
        <div className="p-1.5 rounded-lg bg-primary/10 shrink-0 mt-0.5">
          <Link2 size={14} className="text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <h2 className="font-semibold text-sm">Link Your Town Square Account</h2>
          <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
            Already have the Moons on{" "}
            <a href="https://thepeoplestownsq.com" target="_blank" rel="noreferrer" className="text-primary hover:underline inline-flex items-center gap-0.5">
              thepeoplestownsq.com <ExternalLink size={10} />
            </a>
            {" "}but signed up here with a different email? Enter your TPTS email below and we'll look you up and turn your Moons on.
          </p>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Loader2 size={13} className="animate-spin" /> Checking…
        </div>
      ) : linked ? (
        <div className="space-y-3">
          <div className="flex items-center gap-2 rounded-lg bg-green-500/10 border border-green-500/20 px-3 py-2">
            <CheckCircle2 size={14} className="text-green-500 shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-green-400">Moons linked</p>
              <p className="text-xs text-muted-foreground truncate">{linked}</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Input
              value={input}
              onChange={e => setInput(e.target.value)}
              placeholder="Update TPTS email"
              className="text-xs h-8 flex-1"
            />
            <Button size="sm" className="h-8 text-xs" onClick={save} disabled={saving || input === linked}>
              {saving ? <Loader2 size={12} className="animate-spin" /> : "Update"}
            </Button>
            <Button size="sm" variant="ghost" className="h-8 text-xs text-muted-foreground hover:text-destructive" onClick={remove} disabled={removing}>
              {removing ? <Loader2 size={12} className="animate-spin" /> : <X size={12} />}
            </Button>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="flex gap-2">
            <Input
              type="email"
              value={input}
              onChange={e => { setInput(e.target.value); setError(null); }}
              onKeyDown={e => e.key === "Enter" && save()}
              placeholder="Your TPTS email address"
              className="text-xs h-9 flex-1"
            />
            <Button size="sm" className="h-9 text-xs gap-1.5" onClick={save} disabled={saving || !input.trim()}>
              {saving ? <Loader2 size={12} className="animate-spin" /> : <Link2 size={12} />}
              {saving ? "Linking…" : "Link Moons"}
            </Button>
          </div>
          <p className="text-[10px] text-muted-foreground/60 leading-relaxed">
            This links your subscription to your Forge account. We don't store your TPTS password — just the email we use to look you up.
          </p>
        </div>
      )}

      {error && (
        <div className="flex items-center gap-2 text-xs text-destructive bg-destructive/10 rounded-lg px-3 py-2">
          <AlertCircle size={13} className="shrink-0" />
          {error}
        </div>
      )}
      {success && (
        <div className="flex items-center gap-2 text-xs text-green-400 bg-green-500/10 rounded-lg px-3 py-2">
          <CheckCircle2 size={13} className="shrink-0" />
          Moons activated — you're all set.
        </div>
      )}
    </div>
  );
}

export default function AccountPage() {
  const { user, isLoaded } = useUser();

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Account</h1>
        <p className="text-muted-foreground mt-1">
          Manage your profile, security, and subscription.
        </p>
      </div>

      <Show when="signed-in">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left column */}
          <div className="lg:col-span-1 space-y-4">

            {/* TPTS email linker — most prominent if they have moons */}
            <TptsEmailLinker />

            {/* Subscription card */}
            <div className="rounded-xl border border-border bg-card p-5 space-y-4">
              <div className="flex items-center gap-2">
                <Shield size={16} className="text-primary" />
                <h2 className="font-semibold text-sm">Subscription</h2>
              </div>
              <div className="space-y-2">
                <div className="text-xs text-muted-foreground">
                  Manage your Moon subscriptions and billing through the Town Square.
                </div>
                <a
                  href="https://thepeoplestownsq.com/account"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-xs font-medium text-primary hover:underline"
                >
                  Open Town Square Account <ExternalLink size={11} />
                </a>
              </div>

              <hr className="border-border" />

              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <CreditCard size={16} className="text-primary" />
                  <h3 className="font-semibold text-sm">Upgrade Plan</h3>
                </div>
                <p className="text-xs text-muted-foreground">
                  Subscribe to individual Moons or get all-access for the full Forge suite.
                </p>
                <Link href="/pricing">
                  <Button size="sm" variant="outline" className="w-full text-xs mt-1">
                    View Plans
                  </Button>
                </Link>
              </div>
            </div>

            {isLoaded && user && (
              <div className="rounded-xl border border-border bg-card p-5 space-y-3">
                <h2 className="font-semibold text-sm">Quick Info</h2>
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Name</span>
                    <span className="font-medium">{user.fullName ?? "—"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Forge email</span>
                    <span className="font-medium truncate max-w-[160px]">
                      {user.primaryEmailAddress?.emailAddress ?? "—"}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Member since</span>
                    <span className="font-medium">
                      {user.createdAt
                        ? new Date(user.createdAt).toLocaleDateString("en-US", { month: "short", year: "numeric" })
                        : "—"}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Clerk UserProfile — takes the remaining 2/3 */}
          <div className="lg:col-span-2">
            <UserProfile
              routing="hash"
              appearance={clerkAppearance}
            />
          </div>
        </div>
      </Show>

      <Show when="signed-out">
        <div className="flex flex-col items-center justify-center py-24 gap-4">
          <div className="text-center space-y-2">
            <h2 className="text-xl font-bold">Sign in to view your account</h2>
            <p className="text-muted-foreground text-sm">Your profile, settings, and subscription live here.</p>
          </div>
          <Link href="/sign-in">
            <Button className="gap-2">
              <LogIn size={16} /> Sign In
            </Button>
          </Link>
        </div>
      </Show>
    </div>
  );
}
