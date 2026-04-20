import { useState, useEffect, useRef } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Link } from "wouter";
import {
  Wand2, ChevronRight, ChevronLeft, CheckCircle2, Circle,
  Loader2, Server, ExternalLink, ClipboardList, AlertTriangle, Zap,
} from "lucide-react";
import { cn } from "@/lib/utils";

const API_BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

function getUserId() {
  let id = localStorage.getItem("13moonforge_user_id");
  if (!id) { id = crypto.randomUUID(); localStorage.setItem("13moonforge_user_id", id); }
  return id;
}

const PLATFORMS = [
  { id: "replit",  label: "Replit",       color: "text-orange-400" },
  { id: "heroku",  label: "Heroku",       color: "text-violet-400" },
  { id: "railway", label: "Railway",      color: "text-sky-400" },
  { id: "render",  label: "Render",       color: "text-emerald-400" },
  { id: "other",   label: "Other",        color: "text-muted-foreground" },
];

const PLATFORM_WARNINGS: Record<string, string[]> = {
  replit:  ["@replit/object-storage calls", "REPLIT_DOMAINS / REPL_ID / REPL_SLUG env vars", "Replit Auth (OpenID Connect)", "@replit/database calls", ".replit config and replit.nix packages"],
  heroku:  ["Procfile → replace with Dockerfile CMD", "Heroku Postgres connection string format", "Buildpack dependencies", "Heroku add-on env vars (DATABASE_URL is fine)"],
  railway: ["railway.json / railway.toml config files", "RAILWAY_* env vars", "Railway private networking hostnames (.railway.internal)", "Railway's internal DNS references"],
  render:  ["render.yaml Blueprint config", "Render Disks (replace with S3-compatible storage)", "RENDER_SERVICE_ID / RENDER_EXTERNAL_URL env vars", ".onrender.com internal hostnames"],
  other:   ["Platform-specific config files", "Internal hostnames or private networking", "Platform-managed secrets or env vars", "Proprietary storage or database add-ons"],
};

const MIGRATION_STEPS = [
  { id: 1, label: "Your App" },
  { id: 2, label: "Audit" },
  { id: 3, label: "Migration Plan" },
  { id: 4, label: "Your Server" },
  { id: 5, label: "Done" },
];

const TOOL_LINKS = [
  { label: "Rewrite platform-specific code",     tool: "rewrite",  tab: "Code Rewriter" },
  { label: "Fix and rename env vars",             tool: "env",      tab: "Env Fixer" },
  { label: "Generate Dockerfile + docker-compose",tool: "docker",   tab: "Dockerfile" },
  { label: "Configure Nginx with SSL",            tool: "nginx",    tab: "Nginx Config" },
  { label: "Set up GitHub Actions CI/CD",         tool: "cicd",     tab: "CI/CD Pipeline" },
  { label: "Plan your database migration",         tool: "pgdump",   tab: "DB Migration" },
];

interface WizardState {
  platform: string;
  appName: string;
  packageJson: string;
  envContent: string;
  schemaFile: string;
  sourceFiles: string;
  auditOutput: string;
  auditStatus: "idle" | "running" | "done" | "error";
  checkedTools: Set<string>;
  serverConnected: boolean;
  serverName: string;
}

export default function MigrationWizard() {
  const [step, setStep] = useState(1);
  const [state, setState] = useState<WizardState>({
    platform: "replit",
    appName: "",
    packageJson: "",
    envContent: "",
    schemaFile: "",
    sourceFiles: "",
    auditOutput: "",
    auditStatus: "idle",
    checkedTools: new Set(),
    serverConnected: false,
    serverName: "",
  });
  const abortRef = useRef<AbortController | null>(null);

  const set = <K extends keyof WizardState>(key: K, val: WizardState[K]) =>
    setState(s => ({ ...s, [key]: val }));

  // ── Step 2: run audit on enter ──────────────────────────────────────────
  useEffect(() => {
    if (step === 2 && state.auditStatus === "idle") runAudit();
  }, [step]);

  // ── Step 4: check server connection ────────────────────────────────────
  useEffect(() => {
    if (step === 4) checkServer();
  }, [step]);

  const runAudit = async () => {
    set("auditStatus", "running");
    set("auditOutput", "");
    abortRef.current = new AbortController();
    let terminal = false;

    try {
      const res = await fetch(`${API_BASE}/api/migration/audit`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-user-id": getUserId() },
        body: JSON.stringify({
          appName: state.appName || "My App",
          packageJson: state.packageJson,
          envExample: state.envContent,
          schemaFile: state.schemaFile,
          sourceFiles: state.sourceFiles,
        }),
        signal: abortRef.current.signal,
      });

      if (!res.body) throw new Error("No body");
      const reader  = res.body.getReader();
      const decoder = new TextDecoder();
      let buf = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });
        const lines = buf.split("\n");
        buf = lines.pop() ?? "";
        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          try {
            const ev = JSON.parse(line.slice(6));
            if (ev.type === "chunk") setState(s => ({ ...s, auditOutput: s.auditOutput + ev.content }));
            else if (ev.type === "done") { terminal = true; set("auditStatus", "done"); }
          } catch { /* ignore */ }
        }
      }
      if (!terminal) set("auditStatus", "done");
    } catch (err: unknown) {
      if ((err as Error).name !== "AbortError") set("auditStatus", "error");
    }
  };

  const checkServer = async () => {
    try {
      const res  = await fetch(`${API_BASE}/api/deploy/server`, {
        headers: { "Content-Type": "application/json", "x-user-id": getUserId() },
      });
      const data = await res.json();
      set("serverConnected", !!data.connected);
      set("serverName", data.name ?? "");
    } catch { /* ignore */ }
  };

  const toggleTool = (tool: string) => {
    const next = new Set(state.checkedTools);
    next.has(tool) ? next.delete(tool) : next.add(tool);
    set("checkedTools", next);
  };

  const canProceed = (() => {
    if (step === 1) return !!state.packageJson.trim();
    if (step === 2) return state.auditStatus === "done";
    if (step === 3) return true;
    return true;
  })();

  const goNext = () => { if (canProceed && step < 5) setStep(s => s + 1 as typeof step); };
  const goBack = () => { if (step > 1) setStep(s => s - 1 as typeof step); };

  return (
    <div className="max-w-3xl mx-auto animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex items-start gap-4 mb-8">
        <div className="bg-primary/10 rounded-xl p-3 shrink-0 border border-primary/20">
          <Wand2 className="w-7 h-7 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-black tracking-tight">Migration Wizard</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Guided step-by-step migration from any platform to your own server. Forge carries you through it.
          </p>
        </div>
      </div>

      {/* Step indicators */}
      <div className="flex items-center mb-8">
        {MIGRATION_STEPS.map((s, i) => (
          <div key={s.id} className="flex items-center flex-1 last:flex-none">
            <button
              onClick={() => s.id < step ? setStep(s.id as typeof step) : undefined}
              className={cn(
                "flex items-center gap-2 shrink-0",
                s.id < step && "cursor-pointer",
              )}
            >
              <div className={cn(
                "w-8 h-8 rounded-full flex items-center justify-center text-sm font-black border-2 transition-all",
                step === s.id && "bg-primary border-primary text-primary-foreground",
                step > s.id  && "bg-green-600/20 border-green-600 text-green-400",
                step < s.id  && "bg-muted/30 border-border text-muted-foreground",
              )}>
                {step > s.id ? <CheckCircle2 size={16} /> : s.id}
              </div>
              <span className={cn(
                "text-xs font-medium hidden sm:block",
                step === s.id && "text-primary",
                step !== s.id && "text-muted-foreground",
              )}>
                {s.label}
              </span>
            </button>
            {i < MIGRATION_STEPS.length - 1 && (
              <div className={cn(
                "flex-1 h-px mx-2 transition-all",
                step > s.id ? "bg-green-600/40" : "bg-border",
              )} />
            )}
          </div>
        ))}
      </div>

      {/* Step content */}
      <div className="min-h-[400px]">

        {/* ─── Step 1: Your App ─── */}
        {step === 1 && (
          <div className="space-y-5">
            <div>
              <p className="text-sm font-semibold mb-3">Where is your app currently hosted?</p>
              <div className="flex flex-wrap gap-2">
                {PLATFORMS.map(p => (
                  <button
                    key={p.id}
                    onClick={() => set("platform", p.id)}
                    className={cn(
                      "px-4 py-2 rounded-lg border text-sm font-medium transition-all",
                      state.platform === p.id
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border text-muted-foreground hover:text-foreground hover:border-muted-foreground/50",
                    )}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <Label className="text-sm font-semibold mb-1.5 block">App Name</Label>
              <Input
                value={state.appName}
                onChange={e => set("appName", e.target.value)}
                placeholder="e.g. My Replit App"
                className="bg-card"
              />
            </div>

            <div>
              <Label className="text-sm font-semibold mb-1.5 flex items-center gap-2">
                package.json <span className="text-[10px] font-bold text-primary uppercase tracking-wider">Required</span>
              </Label>
              <Textarea
                value={state.packageJson}
                onChange={e => set("packageJson", e.target.value)}
                placeholder={'{\n  "name": "my-app",\n  "dependencies": { ... }\n}'}
                className="bg-card font-mono text-xs min-h-[130px] resize-y"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label className="text-sm font-semibold mb-1.5 flex items-center gap-2">
                  .env / .env.example <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Optional</span>
                </Label>
                <Textarea
                  value={state.envContent}
                  onChange={e => set("envContent", e.target.value)}
                  placeholder={"DATABASE_URL=\nREPLIT_DOMAINS=\nSESSION_SECRET="}
                  className="bg-card font-mono text-xs min-h-[90px] resize-y"
                />
              </div>
              <div>
                <Label className="text-sm font-semibold mb-1.5 flex items-center gap-2">
                  Database schema <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Optional</span>
                </Label>
                <Textarea
                  value={state.schemaFile}
                  onChange={e => set("schemaFile", e.target.value)}
                  placeholder={"export const users = pgTable('users', { ... })"}
                  className="bg-card font-mono text-xs min-h-[90px] resize-y"
                />
              </div>
            </div>

            <div>
              <Label className="text-sm font-semibold mb-1.5 flex items-center gap-2">
                Source files <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Optional</span>
              </Label>
              <Textarea
                value={state.sourceFiles}
                onChange={e => set("sourceFiles", e.target.value)}
                placeholder={"// paste auth.ts, storage.ts, index.ts, or any files with platform-specific code"}
                className="bg-card font-mono text-xs min-h-[90px] resize-y"
              />
            </div>

            {!state.packageJson.trim() && (
              <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                <AlertTriangle size={11} className="text-amber-500" />
                package.json is required to run the audit.
              </p>
            )}
          </div>
        )}

        {/* ─── Step 2: Audit ─── */}
        {step === 2 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold">
                  {state.auditStatus === "running" ? "Forge is reading your app…" : "Audit Complete"}
                </h2>
                <p className="text-sm text-muted-foreground mt-0.5">
                  {state.auditStatus === "running"
                    ? "Full dependency, env, and auth analysis in progress."
                    : "Review the report below, then move to your migration plan."
                  }
                </p>
              </div>
              {state.auditStatus === "running" && <Loader2 size={20} className="animate-spin text-primary shrink-0" />}
              {state.auditStatus === "done"    && <CheckCircle2 size={20} className="text-green-400 shrink-0" />}
            </div>

            <div className={cn(
              "rounded-xl border bg-card p-5 font-mono text-xs overflow-auto max-h-[420px]",
              state.auditStatus === "running" && "border-primary/30",
              state.auditStatus === "done"    && "border-green-800/30",
            )}>
              {!state.auditOutput && state.auditStatus === "running" && (
                <span className="text-violet-400 flex items-center gap-2">
                  <span className="animate-pulse">●</span> Starting audit…
                </span>
              )}
              {state.auditOutput && (
                <pre className="whitespace-pre-wrap leading-relaxed text-foreground/90">{state.auditOutput}</pre>
              )}
              {state.auditStatus === "running" && state.auditOutput && (
                <span className="inline-block w-2 h-3 bg-primary animate-pulse ml-0.5 align-middle" />
              )}
            </div>

            {state.auditStatus === "error" && (
              <div className="rounded-lg border border-red-800/50 bg-red-900/10 p-3 text-sm text-red-400 flex items-center gap-2">
                <AlertTriangle size={14} />
                Audit failed — check your package.json and try again.
                <Button variant="ghost" size="sm" onClick={runAudit} className="ml-auto gap-1">
                  Retry
                </Button>
              </div>
            )}
          </div>
        )}

        {/* ─── Step 3: Migration Plan ─── */}
        {step === 3 && (
          <div className="space-y-6">
            <div>
              <h2 className="text-lg font-bold mb-1">Your migration plan</h2>
              <p className="text-sm text-muted-foreground">
                Work through these steps in the <Link href="/migration" className="text-primary underline underline-offset-2">Migration Hub</Link>. Check each one off as you complete it.
              </p>
            </div>

            {/* Platform-specific warnings */}
            {PLATFORM_WARNINGS[state.platform] && (
              <div className="rounded-xl border border-amber-800/40 bg-amber-900/10 p-4">
                <p className="text-sm font-semibold text-amber-300 mb-2 flex items-center gap-2">
                  <AlertTriangle size={14} />
                  {PLATFORMS.find(p => p.id === state.platform)?.label}-specific things to watch
                </p>
                <ul className="space-y-1">
                  {PLATFORM_WARNINGS[state.platform].map(w => (
                    <li key={w} className="text-xs text-amber-200/80 flex items-start gap-2">
                      <span className="mt-1 shrink-0">•</span> {w}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Tool checklist */}
            <div className="space-y-2">
              {TOOL_LINKS.map(t => (
                <div
                  key={t.tool}
                  className={cn(
                    "flex items-center gap-3 rounded-lg border p-3.5 transition-all",
                    state.checkedTools.has(t.tool)
                      ? "border-green-800/40 bg-green-900/10"
                      : "border-border bg-card hover:border-muted-foreground/30",
                  )}
                >
                  <button onClick={() => toggleTool(t.tool)} className="shrink-0 transition-colors">
                    {state.checkedTools.has(t.tool)
                      ? <CheckCircle2 size={20} className="text-green-400" />
                      : <Circle size={20} className="text-muted-foreground/50" />
                    }
                  </button>
                  <span className={cn(
                    "text-sm flex-1",
                    state.checkedTools.has(t.tool) && "line-through text-muted-foreground",
                  )}>
                    {t.label}
                  </span>
                  <Link href="/migration">
                    <Button variant="outline" size="sm" className="gap-1.5 h-7 text-xs shrink-0">
                      {t.tab} <ExternalLink size={10} />
                    </Button>
                  </Link>
                </div>
              ))}
            </div>

            <div className="rounded-lg border border-border bg-card/50 p-4 text-sm text-muted-foreground">
              <p className="flex items-center gap-2 font-medium text-foreground mb-1">
                <ClipboardList size={14} className="text-primary" />
                Tip: open the Migration Hub in a separate tab
              </p>
              Work through each tool, then come back here and check it off. You can come back to this wizard any time — your progress is saved in this browser.
            </div>
          </div>
        )}

        {/* ─── Step 4: Your Server ─── */}
        {step === 4 && (
          <div className="space-y-6">
            <div>
              <h2 className="text-lg font-bold mb-1">Connect your server</h2>
              <p className="text-sm text-muted-foreground">
                Your migrated app needs somewhere to live. This is where it runs — on your server, under your control.
              </p>
            </div>

            {state.serverConnected ? (
              <div className="rounded-xl border border-green-800/50 bg-green-900/10 p-5 space-y-2">
                <div className="flex items-center gap-2 text-green-400 font-bold">
                  <CheckCircle2 size={18} /> Server Connected
                </div>
                <p className="text-sm text-muted-foreground">
                  <strong className="text-foreground">{state.serverName}</strong> is connected and ready.
                  Your app can be deployed there via Coolify.
                </p>
                <p className="text-xs text-muted-foreground">
                  Use the App Hub to manage deployments and monitor your running apps.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="rounded-xl border border-amber-800/40 bg-amber-900/10 p-4 text-sm">
                  <p className="font-semibold text-amber-300 mb-1">No server connected yet</p>
                  <p className="text-amber-200/70 text-xs">
                    Connect a Coolify server to the App Hub, then come back here. Your server can be on any VPS provider — Hetzner, DigitalOcean, Vultr, or anything running Ubuntu 22.04+.
                  </p>
                </div>
                <div className="flex gap-3">
                  <Link href="/app-hub">
                    <Button className="gap-2">
                      <Server size={15} /> Go to App Hub
                    </Button>
                  </Link>
                  <Button variant="outline" onClick={checkServer} className="gap-2">
                    <Loader2 size={14} /> Check Again
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Don't have a server yet? The App Hub has a full setup guide — pick a provider, install Coolify (one command), and connect.
                </p>
              </div>
            )}
          </div>
        )}

        {/* ─── Step 5: Done ─── */}
        {step === 5 && (
          <div className="space-y-6 text-center py-4">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-600/20 border-2 border-green-600/40 mx-auto">
              <CheckCircle2 size={32} className="text-green-400" />
            </div>

            <div>
              <h2 className="text-2xl font-black mb-2">
                {state.appName ? `${state.appName} is migration-ready` : "Your app is migration-ready"}
              </h2>
              <p className="text-muted-foreground">
                You've completed the audit, worked through the migration tools, and connected your server.
                Your app belongs to you now.
              </p>
            </div>

            {/* Checklist summary */}
            <div className="rounded-xl border border-border bg-card p-5 text-left space-y-2 max-w-sm mx-auto">
              <p className="text-sm font-bold mb-3">What you've done</p>
              {[
                { label: "Audited the app",       done: state.auditStatus === "done" },
                { label: "Got the migration plan",done: true },
                { label: "Completed rewrites",    done: state.checkedTools.size >= 2 },
                { label: "Server connected",      done: state.serverConnected },
              ].map(item => (
                <div key={item.label} className="flex items-center gap-2 text-sm">
                  {item.done
                    ? <CheckCircle2 size={16} className="text-green-400 shrink-0" />
                    : <Circle size={16} className="text-muted-foreground/40 shrink-0" />
                  }
                  <span className={item.done ? "" : "text-muted-foreground"}>{item.label}</span>
                </div>
              ))}
            </div>

            <div className="flex flex-wrap gap-3 justify-center">
              <Link href="/app-hub">
                <Button className="gap-2">
                  <Server size={15} /> Open App Hub
                </Button>
              </Link>
              <Button
                variant="outline"
                onClick={() => {
                  setStep(1);
                  setState(s => ({ ...s, packageJson: "", appName: "", auditOutput: "", auditStatus: "idle", checkedTools: new Set() }));
                }}
                className="gap-2"
              >
                <Wand2 size={15} /> Migrate Another App
              </Button>
            </div>

            {/* Guarantee */}
            <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 max-w-md mx-auto">
              <p className="text-sm font-bold flex items-center gap-2 justify-center mb-1">
                <Zap size={14} className="text-primary" />
                The Sovereign Migration Guarantee
              </p>
              <p className="text-xs text-muted-foreground">
                If Forge's tools can't get your app migrated, active TPTS subscribers get hands-on help from the Sovereign Digital team — no extra charge.
              </p>
              <a href="https://thepeoplestownsq.com" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs text-primary mt-2 hover:underline">
                Subscribe on the Town Square <ExternalLink size={10} />
              </a>
            </div>
          </div>
        )}
      </div>

      {/* Navigation */}
      {step < 5 && (
        <div className="flex items-center justify-between mt-8 pt-6 border-t border-border">
          <span className="text-xs text-muted-foreground">Step {step} of {MIGRATION_STEPS.length}</span>
          <div className="flex gap-3">
            {step > 1 && (
              <Button variant="outline" onClick={goBack} className="gap-2">
                <ChevronLeft size={15} /> Back
              </Button>
            )}
            <Button onClick={goNext} disabled={!canProceed} className="gap-2">
              {step === 4 ? "Finish" : "Next"}
              {step < 4 && <ChevronRight size={15} />}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
