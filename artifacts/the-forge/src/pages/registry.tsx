import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Package, Plus, X, ExternalLink, Github, Container, Loader2, CheckCircle2, AlertTriangle, Search, Globe,
} from "lucide-react";
import { cn } from "@/lib/utils";

const API = import.meta.env.BASE_URL.replace(/\/$/, "");

function getUserId() {
  let id = localStorage.getItem("13moonforge_user_id");
  if (!id) { id = crypto.randomUUID(); localStorage.setItem("13moonforge_user_id", id); }
  return id;
}
function h() {
  return { "Content-Type": "application/json", "x-user-id": getUserId() };
}

const CATEGORIES = ["web-app", "api", "cms", "e-commerce", "analytics", "devtools", "media", "other"];

interface App {
  id: number;
  name: string;
  tagline: string;
  description: string;
  stack: string;
  githubUrl: string | null;
  dockerImage: string | null;
  submittedByName: string | null;
  createdAt: string;
}

const STACK_COLORS: Record<string, string> = {
  node: "bg-green-900/30 text-green-300 border-green-800/40",
  react: "bg-sky-900/30 text-sky-300 border-sky-800/40",
  python: "bg-yellow-900/30 text-yellow-300 border-yellow-800/40",
  go: "bg-cyan-900/30 text-cyan-300 border-cyan-800/40",
  rust: "bg-orange-900/30 text-orange-300 border-orange-800/40",
  postgres: "bg-blue-900/30 text-blue-300 border-blue-800/40",
  docker: "bg-blue-900/30 text-blue-300 border-blue-800/40",
};

function stackBadge(s: string) {
  const k = s.toLowerCase();
  const cls = Object.entries(STACK_COLORS).find(([key]) => k.includes(key))?.[1] ?? "bg-muted text-muted-foreground border-border";
  return cls;
}

export default function Registry() {
  const [apps, setApps]         = useState<App[]>([]);
  const [loading, setLoading]   = useState(true);
  const [search, setSearch]     = useState("");
  const [showForm, setShowForm] = useState(false);

  const [form, setForm] = useState({
    name: "", tagline: "", description: "", stack: "", githubUrl: "", dockerImage: "", submittedByName: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [submitDone, setSubmitDone] = useState(false);
  const [submitError, setSubmitError] = useState("");

  useEffect(() => {
    fetch(`${API}/api/registry`, { headers: h() })
      .then(r => r.json())
      .then(d => setApps(Array.isArray(d) ? d : []))
      .catch(() => setApps([]))
      .finally(() => setLoading(false));
  }, []);

  const setF = (k: keyof typeof form, v: string) => setForm(f => ({ ...f, [k]: v }));

  const submit = async () => {
    setSubmitting(true); setSubmitError("");
    try {
      const r = await fetch(`${API}/api/registry`, {
        method: "POST", headers: h(), body: JSON.stringify(form),
      });
      const d = await r.json();
      if (!r.ok) { setSubmitError(d.error ?? "Submission failed"); return; }
      setSubmitDone(true);
      setShowForm(false);
      setForm({ name: "", tagline: "", description: "", stack: "", githubUrl: "", dockerImage: "", submittedByName: "" });
    } finally { setSubmitting(false); }
  };

  const filtered = apps.filter(a =>
    !search || a.name.toLowerCase().includes(search.toLowerCase()) ||
    a.tagline.toLowerCase().includes(search.toLowerCase()) ||
    a.stack.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div className="max-w-5xl mx-auto animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex items-start gap-4 mb-8">
        <div className="bg-muted/40 rounded-xl p-3 shrink-0 border border-border">
          <Package className="w-7 h-7 text-primary" />
        </div>
        <div className="flex-1">
          <h1 className="text-2xl font-black tracking-tight">Community App Registry</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Open-source and self-hostable apps built by the sovereign builder community. Submit yours and help others escape the cloud.
          </p>
        </div>
        <Button onClick={() => setShowForm(s => !s)} className="gap-2 shrink-0" variant={showForm ? "outline" : "default"}>
          {showForm ? <X size={15} /> : <Plus size={15} />}
          {showForm ? "Cancel" : "Submit App"}
        </Button>
      </div>

      {/* Submit success banner */}
      {submitDone && (
        <div className="rounded-xl border border-green-800/40 bg-green-900/10 p-4 flex items-center gap-3 mb-6 text-sm">
          <CheckCircle2 size={16} className="text-green-400 shrink-0" />
          <div>
            <p className="font-bold text-green-300">Submission received</p>
            <p className="text-muted-foreground text-xs">Your app will appear here after the team reviews it. Thanks for contributing.</p>
          </div>
        </div>
      )}

      {/* Submit Form */}
      {showForm && (
        <div className="rounded-2xl border border-border bg-card p-7 mb-8 space-y-5">
          <h2 className="font-bold text-lg">Submit an app to the registry</h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label className="text-sm font-semibold mb-1.5 block">App Name <span className="text-primary text-[10px] font-bold uppercase tracking-wide ml-1">Required</span></Label>
              <Input value={form.name} onChange={e => setF("name", e.target.value)} placeholder="e.g. SelfMail" className="bg-muted/20" />
            </div>
            <div>
              <Label className="text-sm font-semibold mb-1.5 block">Your Name / Handle</Label>
              <Input value={form.submittedByName} onChange={e => setF("submittedByName", e.target.value)} placeholder="e.g. @builder or Jane Doe" className="bg-muted/20" />
            </div>
          </div>

          <div>
            <Label className="text-sm font-semibold mb-1.5 block">Tagline <span className="text-primary text-[10px] font-bold uppercase tracking-wide ml-1">Required</span></Label>
            <Input value={form.tagline} onChange={e => setF("tagline", e.target.value)} placeholder="One sentence that nails what it does" className="bg-muted/20" maxLength={120} />
          </div>

          <div>
            <Label className="text-sm font-semibold mb-1.5 block">Description <span className="text-primary text-[10px] font-bold uppercase tracking-wide ml-1">Required</span></Label>
            <Textarea value={form.description} onChange={e => setF("description", e.target.value)} placeholder="What does it do, why is it useful, who is it for?" className="bg-muted/20 min-h-[90px] resize-y" />
          </div>

          <div>
            <Label className="text-sm font-semibold mb-1.5 block">Stack <span className="text-primary text-[10px] font-bold uppercase tracking-wide ml-1">Required</span></Label>
            <Input value={form.stack} onChange={e => setF("stack", e.target.value)} placeholder="e.g. Node.js, React, PostgreSQL, Docker" className="bg-muted/20" />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label className="text-sm font-semibold mb-1.5 block flex items-center gap-1.5"><Github size={12} /> GitHub URL</Label>
              <Input value={form.githubUrl} onChange={e => setF("githubUrl", e.target.value)} placeholder="https://github.com/you/your-app" className="bg-muted/20 font-mono text-xs" />
            </div>
            <div>
              <Label className="text-sm font-semibold mb-1.5 block flex items-center gap-1.5"><Container size={12} /> Docker Image</Label>
              <Input value={form.dockerImage} onChange={e => setF("dockerImage", e.target.value)} placeholder="docker.io/you/your-app:latest" className="bg-muted/20 font-mono text-xs" />
            </div>
          </div>

          {submitError && (
            <p className="text-sm text-red-400 flex items-center gap-2"><AlertTriangle size={13} />{submitError}</p>
          )}

          <Button
            onClick={submit}
            disabled={!form.name.trim() || !form.tagline.trim() || !form.description.trim() || !form.stack.trim() || submitting}
            className="gap-2"
          >
            {submitting ? <Loader2 size={14} className="animate-spin" /> : null}
            {submitting ? "Submitting…" : "Submit for Review"}
          </Button>
          <p className="text-xs text-muted-foreground">All submissions are reviewed before appearing publicly. Keep it clean and sovereign.</p>
        </div>
      )}

      {/* Search bar */}
      <div className="flex items-center gap-3 mb-6">
        <div className="relative flex-1 max-w-sm">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search apps, stacks…" className="pl-9" />
        </div>
        <span className="text-xs text-muted-foreground">{apps.length} app{apps.length !== 1 ? "s" : ""}</span>
      </div>

      {/* App grid */}
      {loading && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground py-8">
          <Loader2 size={14} className="animate-spin" /> Loading registry…
        </div>
      )}

      {!loading && filtered.length === 0 && (
        <div className="text-center py-16 space-y-4">
          <Package size={36} className="text-muted-foreground/20 mx-auto" />
          <div>
            <p className="font-bold text-muted-foreground">
              {apps.length === 0 ? "No apps yet" : "No matches"}
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              {apps.length === 0
                ? "Be the first to submit an open-source self-hostable app."
                : "Try a different search term."
              }
            </p>
          </div>
          {apps.length === 0 && (
            <Button onClick={() => setShowForm(true)} variant="outline" className="gap-2">
              <Plus size={14} /> Submit the first app
            </Button>
          )}
        </div>
      )}

      {!loading && filtered.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filtered.map(app => (
            <div key={app.id} className="rounded-xl border border-border bg-card p-5 flex flex-col gap-3 hover:border-primary/30 transition-colors">
              <div>
                <div className="flex items-start justify-between gap-2 mb-1">
                  <h3 className="font-bold text-base">{app.name}</h3>
                  <div className="flex gap-1.5 shrink-0">
                    {app.githubUrl && (
                      <a href={app.githubUrl} target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-foreground transition-colors">
                        <Github size={14} />
                      </a>
                    )}
                    {app.dockerImage && (
                      <span className="text-muted-foreground" title={app.dockerImage}>
                        <Container size={14} />
                      </span>
                    )}
                  </div>
                </div>
                <p className="text-sm text-primary font-medium">{app.tagline}</p>
              </div>

              <p className="text-sm text-muted-foreground leading-relaxed flex-1">{app.description}</p>

              <div className="flex items-center justify-between gap-2 pt-2 border-t border-border/50">
                <div className="flex flex-wrap gap-1.5">
                  {app.stack.split(",").slice(0, 4).map(s => s.trim()).filter(Boolean).map(s => (
                    <span key={s} className={cn("text-[10px] font-medium px-2 py-0.5 rounded border", stackBadge(s))}>{s}</span>
                  ))}
                </div>
                {app.submittedByName && (
                  <span className="text-[10px] text-muted-foreground shrink-0">by {app.submittedByName}</span>
                )}
              </div>

              {app.dockerImage && (
                <div className="rounded-lg bg-black/30 border border-border/50 px-3 py-2">
                  <p className="text-[10px] text-muted-foreground mb-0.5 font-semibold">Docker pull</p>
                  <code className="text-[10px] font-mono text-green-400 break-all">{app.dockerImage}</code>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Footer note */}
      <div className="mt-10 pt-6 border-t border-border">
        <p className="text-xs text-muted-foreground leading-relaxed">
          <strong className="text-foreground">Every app here runs on your server.</strong> No vendor, no platform tax, no lock-in. If it has a Dockerfile, it deploys anywhere. That's the standard for this registry.
        </p>
      </div>
    </div>
  );
}
