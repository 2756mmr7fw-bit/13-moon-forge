import { useState, useEffect } from "react";
import { UserProfile, useUser } from "@clerk/react";
import { Show } from "@clerk/react";
import { Link } from "wouter";
import { ExternalLink, Shield, CreditCard, LogIn, Link2, CheckCircle2, Loader2, X, AlertCircle, Mail, Send, Brain, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@clerk/react";

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

function ForgeReportCard({ email, firstName }: { email: string; firstName?: string }) {
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [err, setErr] = useState("");

  async function send() {
    setSending(true); setErr("");
    try {
      const res = await fetch(`${API}/api/forge-report`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, firstName }),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? "Failed");
      setSent(true);
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "Something went wrong");
    } finally { setSending(false); }
  }

  return (
    <div className="rounded-xl border border-border bg-card p-5 space-y-3">
      <div className="flex items-center gap-2">
        <Mail size={16} className="text-primary" />
        <h2 className="font-semibold text-sm">Forge Report</h2>
      </div>
      <p className="text-xs text-muted-foreground leading-relaxed">
        Get a weekly activity digest — your sessions, files, and saved prompts — sent to your email.
      </p>
      {sent ? (
        <div className="flex items-center gap-1.5 text-green-400 text-xs font-medium">
          <CheckCircle2 size={13} /> Sent to {email}
        </div>
      ) : (
        <Button size="sm" className="w-full gap-2 text-xs h-8" onClick={send} disabled={sending}>
          {sending ? <Loader2 size={12} className="animate-spin" /> : <Send size={12} />}
          {sending ? "Sending…" : "Send My Forge Report"}
        </Button>
      )}
      {err && <p className="text-xs text-destructive">{err}</p>}
    </div>
  );
}

// ─── Memory Card ─────────────────────────────────────────────────────────────
function MemoryCard() {
  const { getToken } = useAuth();
  const [name, setName] = useState("");
  const [building, setBuilding] = useState("");
  const [role, setRole] = useState("");
  const [preferences, setPreferences] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const token = await getToken();
        const res = await fetch(`${API}/api/user/memory`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        if (res.ok) {
          const data = await res.json() as { name?: string; building?: string; role?: string; preferences?: string };
          setName(data.name ?? "");
          setBuilding(data.building ?? "");
          setRole(data.role ?? "");
          setPreferences(data.preferences ?? "");
        }
      } catch { /* silent */ } finally {
        setLoaded(true);
      }
    })();
  }, [getToken]);

  const save = async () => {
    setSaving(true);
    try {
      const token = await getToken();
      await fetch(`${API}/api/user/memory`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ name, building, role, preferences }),
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch { /* silent */ } finally {
      setSaving(false);
    }
  };

  if (!loaded) return null;

  return (
    <div className="rounded-xl border border-border bg-card p-5 space-y-4">
      <div className="flex items-center gap-2">
        <Brain size={15} className="text-primary" />
        <h2 className="font-semibold text-sm">Tell Forge About You</h2>
      </div>
      <p className="text-xs text-muted-foreground leading-relaxed">
        The Moons remember this in every response — making them personal to you.
      </p>
      <div className="space-y-3">
        <div>
          <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block mb-1">Your Name</label>
          <Input
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="What should Forge call you?"
            className="h-8 text-xs"
          />
        </div>
        <div>
          <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block mb-1">What You're Building</label>
          <Input
            value={building}
            onChange={e => setBuilding(e.target.value)}
            placeholder="e.g. a zombie game in Godot, a SaaS for freelancers"
            className="h-8 text-xs"
          />
        </div>
        <div>
          <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block mb-1">Your Background</label>
          <Input
            value={role}
            onChange={e => setRole(e.target.value)}
            placeholder="e.g. beginner, indie dev, non-technical founder"
            className="h-8 text-xs"
          />
        </div>
        <div>
          <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block mb-1">Preferences</label>
          <Textarea
            value={preferences}
            onChange={e => setPreferences(e.target.value)}
            placeholder="e.g. skip the preamble, give me code examples, explain like I'm 12"
            className="text-xs min-h-[60px] resize-none"
          />
        </div>
        <Button
          size="sm"
          className="w-full gap-2 text-xs h-8"
          onClick={save}
          disabled={saving}
        >
          {saving ? <Loader2 size={12} className="animate-spin" /> : saved ? <CheckCircle2 size={12} className="text-green-400" /> : <Save size={12} />}
          {saving ? "Saving…" : saved ? "Saved!" : "Save to Forge Memory"}
        </Button>
      </div>
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

            {/* Memory — Tell Forge About You */}
            <MemoryCard />

            {/* TPTS email linker — most prominent if they have moons */}
            <TptsEmailLinker />

            {/* Forge Report */}
            {isLoaded && user?.primaryEmailAddress?.emailAddress && (
              <ForgeReportCard
                email={user.primaryEmailAddress.emailAddress}
                firstName={user.firstName ?? undefined}
              />
            )}

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
