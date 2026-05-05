import { useState, useEffect } from "react";
import {
  Rocket, Github, CheckCircle2, Circle, ArrowRight, Loader2,
  Key, Globe, GitBranch, Terminal, Lock, ExternalLink,
  ClipboardPaste, Eye, EyeOff, Server, Zap, Copy, Check,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Link } from "wouter";
import { cn } from "@/lib/utils";

const API_BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

// ── Helpers ───────────────────────────────────────────────────────────────────

function parseEnv(raw: string): Record<string, string> {
  const result: Record<string, string> = {};
  for (const line of raw.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const idx = trimmed.indexOf("=");
    if (idx < 1) continue;
    const key = trimmed.slice(0, idx).trim();
    let val = trimmed.slice(idx + 1).trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    if (key) result[key] = val;
  }
  return result;
}

function detectRuntime(gitUrl: string): { build: string; start: string; port: number } {
  // Simple heuristic — can be overridden
  if (gitUrl.includes("next") || gitUrl.includes("nextjs")) return { build: "npm run build", start: "npm start", port: 3000 };
  if (gitUrl.includes("react") || gitUrl.includes("vite"))  return { build: "npm run build", start: "npx serve dist", port: 3000 };
  return { build: "npm install", start: "npm start", port: 3000 };
}

// ── Step components ───────────────────────────────────────────────────────────

function StepHeader({ n, title, subtitle, active, done }: { n: number; title: string; subtitle: string; active: boolean; done: boolean }) {
  return (
    <div className="flex items-start gap-4">
      <div className={cn(
        "w-9 h-9 rounded-full flex items-center justify-center shrink-0 font-bold text-sm transition-colors",
        done ? "bg-green-500 text-white" : active ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
      )}>
        {done ? <CheckCircle2 className="w-4 h-4" /> : n}
      </div>
      <div>
        <h3 className={cn("font-semibold", active ? "text-foreground" : done ? "text-foreground" : "text-muted-foreground")}>{title}</h3>
        <p className="text-sm text-muted-foreground">{subtitle}</p>
      </div>
    </div>
  );
}

// ── Main page ──────────────────────────────────────────────────────────────────
export default function MigratePage() {
  const [step, setStep] = useState(1);
  const [serverOk, setServerOk] = useState<boolean | null>(null);
  const [serverName, setServerName] = useState<string>("My Server");

  // Step 2: GitHub URL
  const [gitUrl, setGitUrl] = useState("");
  const [gitBranch, setGitBranch] = useState("main");
  const [appName, setAppName] = useState("");

  // Step 3: Env vars
  const [envRaw, setEnvRaw] = useState("");
  const [envParsed, setEnvParsed] = useState<Record<string, string>>({});
  const [showEnvValues, setShowEnvValues] = useState(false);

  // Step 4: Config
  const [port, setPort] = useState("3000");
  const [buildCmd, setBuildCmd] = useState("npm install && npm run build");
  const [startCmd, setStartCmd] = useState("npm start");

  // Step 5: Launch
  const [launching, setLaunching] = useState(false);
  const [launchErr, setLaunchErr] = useState<string | null>(null);
  const [needsKey, setNeedsKey] = useState(false);
  const [deployedId, setDeployedId] = useState<string | null>(null);

  // Checklist state
  const [checklist, setChecklist] = useState({
    repoConnected: false,
    envSet: false,
    deployed: false,
    verified: false,
  });
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    // Check server connection on mount
    fetch(`${API_BASE}/api/deploys/server-check`, { credentials: "include" })
      .then(r => r.json())
      .then(d => {
        const data = d as { connected: boolean; serverName?: string };
        setServerOk(data.connected);
        if (data.serverName) setServerName(data.serverName);
      })
      .catch(() => setServerOk(false));
  }, []);

  useEffect(() => {
    setEnvParsed(parseEnv(envRaw));
  }, [envRaw]);

  useEffect(() => {
    if (gitUrl) {
      const auto = detectRuntime(gitUrl);
      setBuildCmd(auto.build);
      setStartCmd(auto.start);
      setPort(String(auto.port));
      const parts = gitUrl.replace(/\.git$/, "").split("/");
      const autoName = parts[parts.length - 1] ?? "";
      if (!appName && autoName) setAppName(autoName.replace(/[^a-zA-Z0-9-_]/g, "-"));
    }
  }, [gitUrl]);

  const handleLaunch = async () => {
    setLaunching(true);
    setLaunchErr(null);
    setNeedsKey(false);
    try {
      const r = await fetch(`${API_BASE}/api/deploys/connect`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: appName || "my-app",
          gitUrl,
          gitBranch,
          buildCommand: buildCmd,
          startCommand: startCmd,
          port: parseInt(port) || 3000,
          envVars: Object.keys(envParsed).length > 0 ? envParsed : undefined,
        }),
      });
      const d = await r.json() as { ok?: boolean; error?: string; needsWriteKey?: boolean; appId?: string };
      if (!r.ok) {
        setLaunchErr(d.error ?? "Launch failed");
        if (d.needsWriteKey) setNeedsKey(true);
        return;
      }
      setDeployedId(d.appId ?? null);
      setChecklist(prev => ({ ...prev, repoConnected: true, envSet: Object.keys(envParsed).length > 0, deployed: true }));
      setStep(6);
    } finally {
      setLaunching(false);
    }
  };

  const copyGitHint = () => {
    navigator.clipboard.writeText(`git remote add forge ${gitUrl}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const envCount = Object.keys(envParsed).length;

  const STEPS = [
    { n: 1, title: "Check your server",         subtitle: "Make sure Coolify is connected"           },
    { n: 2, title: "Your GitHub repo",           subtitle: "Paste the URL Replit pushes to"           },
    { n: 3, title: "Environment variables",       subtitle: "Paste your .env file — optional"         },
    { n: 4, title: "Configure the app",          subtitle: "Build command, start command, port"       },
    { n: 5, title: "Launch",                     subtitle: "Wire Coolify to auto-deploy on every push" },
  ];

  return (
    <div className="max-w-2xl space-y-8">
      {/* Header */}
      <div>
        <div className="flex items-center gap-3 mb-1">
          <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
            <Rocket className="w-5 h-5 text-primary" />
          </div>
          <h1 className="text-2xl font-bold">Connect & Deploy</h1>
        </div>
        <p className="text-muted-foreground text-sm">
          Build in Replit. Push to GitHub. Auto-deploy on your own server — every time, automatically.
        </p>
      </div>

      {/* Progress bar */}
      <div className="flex gap-1.5">
        {STEPS.map(s => (
          <div key={s.n} className={cn(
            "h-1.5 rounded-full flex-1 transition-colors",
            step > s.n ? "bg-green-500" : step === s.n ? "bg-primary" : "bg-muted"
          )} />
        ))}
        <div className={cn("h-1.5 rounded-full flex-1 transition-colors", step === 6 ? "bg-green-500" : "bg-muted")} />
      </div>

      {/* ── Step 1: Server check ──────────────────────────────────────────── */}
      {step >= 1 && (
        <div className="bg-card border border-border rounded-xl p-5 space-y-4">
          <StepHeader n={1} title="Check your server" subtitle="Make sure Coolify is connected" active={step === 1} done={step > 1} />
          {step === 1 && (
            <div className="ml-13 pl-0 space-y-3" style={{ marginLeft: "3.25rem" }}>
              {serverOk === null && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="w-4 h-4 animate-spin" /> Checking server…
                </div>
              )}
              {serverOk === true && (
                <div className="flex items-center gap-2 text-sm text-green-400">
                  <CheckCircle2 className="w-4 h-4" /> {serverName} is connected and online.
                </div>
              )}
              {serverOk === false && (
                <div className="space-y-3">
                  <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-3 text-sm text-amber-400">
                    No server connected. Set up your Coolify connection first.
                  </div>
                  <Link href="/connections">
                    <Button size="sm" variant="outline"><Server className="w-4 h-4 mr-1.5" /> Connect Server</Button>
                  </Link>
                </div>
              )}
              {serverOk === true && (
                <Button onClick={() => setStep(2)}>
                  Continue <ArrowRight className="w-4 h-4 ml-1.5" />
                </Button>
              )}
            </div>
          )}
        </div>
      )}

      {/* ── Step 2: GitHub URL ─────────────────────────────────────────────── */}
      {step >= 2 && (
        <div className="bg-card border border-border rounded-xl p-5 space-y-4">
          <StepHeader n={2} title="Your GitHub repo" subtitle="Paste the URL Replit pushes to" active={step === 2} done={step > 2} />
          {step === 2 && (
            <div style={{ marginLeft: "3.25rem" }} className="space-y-4">
              <div className="bg-sky-500/10 border border-sky-500/20 rounded-lg p-3 text-sm text-sky-400">
                In Replit: open the <strong>Git panel</strong> → connect to GitHub → push. Copy the repo URL and paste it below.
              </div>
              <div>
                <label className="text-sm font-medium mb-1.5 block">GitHub repo URL</label>
                <Input
                  value={gitUrl}
                  onChange={e => setGitUrl(e.target.value)}
                  placeholder="https://github.com/you/my-app"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-medium mb-1.5 block">Branch</label>
                  <Input value={gitBranch} onChange={e => setGitBranch(e.target.value)} placeholder="main" />
                </div>
                <div>
                  <label className="text-sm font-medium mb-1.5 block">App name</label>
                  <Input value={appName} onChange={e => setAppName(e.target.value)} placeholder="my-app" className="font-mono" />
                </div>
              </div>
              <Button onClick={() => setStep(3)} disabled={!gitUrl.trim()}>
                Continue <ArrowRight className="w-4 h-4 ml-1.5" />
              </Button>
            </div>
          )}
          {step > 2 && gitUrl && (
            <div style={{ marginLeft: "3.25rem" }} className="flex items-center gap-2 text-sm text-muted-foreground">
              <Github className="w-3.5 h-3.5" /> {gitUrl.replace("https://github.com/", "")} <span className="text-muted-foreground/50">@ {gitBranch}</span>
            </div>
          )}
        </div>
      )}

      {/* ── Step 3: Env vars ──────────────────────────────────────────────── */}
      {step >= 3 && (
        <div className="bg-card border border-border rounded-xl p-5 space-y-4">
          <StepHeader n={3} title="Environment variables" subtitle="Paste your .env file — optional but recommended" active={step === 3} done={step > 3} />
          {step === 3 && (
            <div style={{ marginLeft: "3.25rem" }} className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Copy everything from Replit's "Secrets" panel and paste it here as <code>KEY=VALUE</code> pairs. Or paste your <code>.env</code> file directly.
              </p>
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-sm font-medium">Paste your .env</label>
                  <button
                    onClick={() => setShowEnvValues(!showEnvValues)}
                    className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
                  >
                    {showEnvValues ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                    {showEnvValues ? "Hide values" : "Show values"}
                  </button>
                </div>
                <textarea
                  value={envRaw}
                  onChange={e => setEnvRaw(e.target.value)}
                  placeholder={"DATABASE_URL=postgres://...\nANTHROPIC_API_KEY=sk-ant-...\nSESSION_SECRET=..."}
                  className="w-full h-36 bg-muted rounded-lg border border-border p-3 text-sm font-mono resize-none focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
              </div>
              {envCount > 0 && (
                <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-3">
                  <p className="text-xs font-medium text-green-400 mb-2">{envCount} variable{envCount !== 1 ? "s" : ""} detected:</p>
                  <div className="space-y-1 max-h-32 overflow-y-auto">
                    {Object.entries(envParsed).map(([k, v]) => (
                      <div key={k} className="flex items-center gap-2 text-xs font-mono">
                        <span className="text-green-300 shrink-0">{k}</span>
                        <span className="text-muted-foreground">=</span>
                        <span className="text-muted-foreground truncate">
                          {showEnvValues ? v : "•".repeat(Math.min(v.length, 20))}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              <div className="flex gap-2">
                <Button onClick={() => setStep(4)}>
                  {envCount > 0 ? `Continue with ${envCount} vars` : "Skip — add later"} <ArrowRight className="w-4 h-4 ml-1.5" />
                </Button>
              </div>
            </div>
          )}
          {step > 3 && (
            <div style={{ marginLeft: "3.25rem" }} className="text-sm text-muted-foreground">
              {envCount > 0 ? `${envCount} environment variable${envCount !== 1 ? "s" : ""} ready` : "No env vars — skipped"}
            </div>
          )}
        </div>
      )}

      {/* ── Step 4: Config ────────────────────────────────────────────────── */}
      {step >= 4 && (
        <div className="bg-card border border-border rounded-xl p-5 space-y-4">
          <StepHeader n={4} title="Configure the app" subtitle="Build command, start command, port" active={step === 4} done={step > 4} />
          {step === 4 && (
            <div style={{ marginLeft: "3.25rem" }} className="space-y-4">
              <div className="bg-primary/5 border border-primary/20 rounded-lg p-3 text-sm text-muted-foreground">
                Auto-detected from your repo URL. Adjust if needed.
              </div>
              <div>
                <label className="text-sm font-medium mb-1.5 block flex items-center gap-1.5">
                  <Terminal className="w-3.5 h-3.5" /> Build command
                </label>
                <Input value={buildCmd} onChange={e => setBuildCmd(e.target.value)} placeholder="npm install && npm run build" className="font-mono text-sm" />
              </div>
              <div>
                <label className="text-sm font-medium mb-1.5 block flex items-center gap-1.5">
                  <Zap className="w-3.5 h-3.5" /> Start command
                </label>
                <Input value={startCmd} onChange={e => setStartCmd(e.target.value)} placeholder="npm start" className="font-mono text-sm" />
              </div>
              <div>
                <label className="text-sm font-medium mb-1.5 block flex items-center gap-1.5">
                  <Globe className="w-3.5 h-3.5" /> Port
                </label>
                <Input value={port} onChange={e => setPort(e.target.value)} placeholder="3000" className="font-mono text-sm w-32" />
              </div>
              <Button onClick={() => setStep(5)}>
                Continue <ArrowRight className="w-4 h-4 ml-1.5" />
              </Button>
            </div>
          )}
          {step > 4 && (
            <div style={{ marginLeft: "3.25rem" }} className="flex flex-wrap gap-4 text-xs text-muted-foreground">
              <span><span className="text-foreground font-medium">Build:</span> {buildCmd}</span>
              <span><span className="text-foreground font-medium">Start:</span> {startCmd}</span>
              <span><span className="text-foreground font-medium">Port:</span> {port}</span>
            </div>
          )}
        </div>
      )}

      {/* ── Step 5: Launch ────────────────────────────────────────────────── */}
      {step >= 5 && step < 6 && (
        <div className="bg-card border border-border rounded-xl p-5 space-y-4">
          <StepHeader n={5} title="Launch" subtitle="Wire Coolify to auto-deploy on every push" active={step === 5} done={false} />
          <div style={{ marginLeft: "3.25rem" }} className="space-y-4">
            {/* Summary */}
            <div className="bg-muted rounded-lg p-4 space-y-2 text-sm">
              <p className="font-medium mb-2">Ready to connect:</p>
              <div className="flex items-center gap-2 text-muted-foreground"><Github className="w-3.5 h-3.5 shrink-0" /> <span className="truncate">{gitUrl}</span></div>
              <div className="flex items-center gap-2 text-muted-foreground"><GitBranch className="w-3.5 h-3.5 shrink-0" /> Branch: {gitBranch}</div>
              <div className="flex items-center gap-2 text-muted-foreground"><Key className="w-3.5 h-3.5 shrink-0" /> {envCount} env var{envCount !== 1 ? "s" : ""}</div>
              <div className="flex items-center gap-2 text-muted-foreground"><Globe className="w-3.5 h-3.5 shrink-0" /> Port {port}</div>
            </div>

            {launchErr && (
              <div className={cn("rounded-lg p-4 text-sm", needsKey ? "bg-amber-500/10 border border-amber-500/20" : "bg-red-500/10 border border-red-500/20")}>
                {needsKey ? (
                  <div className="space-y-2">
                    <p className="text-amber-400 font-medium flex items-center gap-1.5"><Lock className="w-4 h-4" /> Your Coolify API key needs deploy permissions</p>
                    <p className="text-muted-foreground text-xs">Your current key is read-only. To unlock auto-deploy:</p>
                    <ol className="text-xs text-muted-foreground space-y-1 list-decimal list-inside">
                      <li>Go to <strong className="text-foreground">Coolify → Settings → API Keys</strong></li>
                      <li>Create a new key — check <strong className="text-foreground">"Deploy"</strong> permission</li>
                      <li>Copy it, then <Link href="/connections" className="text-primary underline">update your server connection</Link></li>
                      <li>Come back here and click Launch again</li>
                    </ol>
                    <a href="http://5.78.154.21:8000/settings/api-keys" target="_blank" rel="noopener noreferrer">
                      <Button size="sm" variant="outline" className="mt-2">
                        <ExternalLink className="w-3.5 h-3.5 mr-1.5" /> Open Coolify API Keys
                      </Button>
                    </a>
                  </div>
                ) : (
                  <p className="text-red-400">{launchErr}</p>
                )}
              </div>
            )}

            <Button onClick={handleLaunch} disabled={launching} size="lg" className="w-full">
              {launching
                ? <><Loader2 className="w-4 h-4 animate-spin mr-2" /> Connecting…</>
                : <><Rocket className="w-4 h-4 mr-2" /> Launch on My Server</>}
            </Button>
          </div>
        </div>
      )}

      {/* ── Step 6: Done ──────────────────────────────────────────────────── */}
      {step === 6 && (
        <div className="bg-card border border-border rounded-xl p-6 space-y-6">
          <div className="text-center">
            <div className="w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 className="w-8 h-8 text-green-400" />
            </div>
            <h2 className="text-xl font-bold mb-1">You're connected.</h2>
            <p className="text-muted-foreground text-sm">
              Every time you push from Replit to GitHub, your server redeploys automatically. You don't have to touch anything.
            </p>
          </div>

          {/* Checklist */}
          <div className="bg-muted rounded-xl p-4 space-y-3">
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Migration checklist</p>
            {[
              { key: "repoConnected", label: "Repo connected to Coolify",         done: checklist.repoConnected },
              { key: "envSet",        label: "Environment variables configured",   done: checklist.envSet || envCount === 0 },
              { key: "deployed",      label: "First deploy triggered",             done: checklist.deployed },
              { key: "verified",      label: "App verified and responding",        done: checklist.verified },
            ].map(item => (
              <div key={item.key} className="flex items-center gap-3">
                {item.done
                  ? <CheckCircle2 className="w-4 h-4 text-green-400 shrink-0" />
                  : <Circle className="w-4 h-4 text-muted-foreground shrink-0" />}
                <span className={cn("text-sm", item.done ? "text-foreground" : "text-muted-foreground")}>{item.label}</span>
              </div>
            ))}
          </div>

          {/* What happens next */}
          <div className="bg-sky-500/5 border border-sky-500/20 rounded-xl p-4 space-y-2">
            <p className="text-sm font-medium text-sky-400">Your workflow from now on:</p>
            <ol className="space-y-1.5 text-sm text-muted-foreground list-decimal list-inside">
              <li>Write code in Replit</li>
              <li>Push to GitHub (Git panel → Commit → Push)</li>
              <li>Your server auto-deploys — done.</li>
            </ol>
          </div>

          <div className="flex gap-3">
            <Link href="/deploys" className="flex-1">
              <Button className="w-full"><Zap className="w-4 h-4 mr-1.5" /> Watch Deploy Status</Button>
            </Link>
            <Button variant="outline" onClick={() => { setStep(1); setGitUrl(""); setAppName(""); setEnvRaw(""); setDeployedId(null); setLaunchErr(null); setChecklist({ repoConnected: false, envSet: false, deployed: false, verified: false }); }}>
              Connect Another App
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
