import { useState, useEffect } from "react";
import {
  Rocket, Github, CheckCircle2, Circle, ArrowRight, Loader2,
  Key, Globe, GitBranch, Terminal, Lock, ExternalLink,
  Eye, EyeOff, Server, Zap, Copy, Check, ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Link } from "wouter";
import { cn } from "@/lib/utils";

const API_BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

// ── Platform definitions ───────────────────────────────────────────────────────

interface Platform {
  id: string;
  name: string;
  color: string;
  bg: string;
  border: string;
  logo: string; // emoji or initials
  codeOnGithub: boolean; // true = code already on GH, just copy URL
  steps: string[];
  agentPrompt: string;
  envHint: string;
  tip?: string;
}

const PLATFORMS: Platform[] = [
  {
    id: "replit",
    name: "Replit",
    color: "text-orange-400",
    bg: "bg-orange-500/10",
    border: "border-orange-500/30",
    logo: "R",
    codeOnGithub: false,
    steps: [
      "Open your Replit project",
      "Click the Git icon in the left sidebar",
      'Click "Connect to GitHub" and create or select a repo',
      'Click "Commit All & Push"',
      "Copy the GitHub repo URL — paste it below",
    ],
    agentPrompt: `I want to move my Replit app to 13 Moon Forge so it runs on my own server. Here's what I need you to do:

1. Open my current Replit project
2. Go to the Git panel (left sidebar)
3. Connect it to a new GitHub repository called [APP NAME]
4. Commit all files and push to GitHub
5. Copy the GitHub URL and tell it to me

Then I'll take it from there in The Forge.`,
    envHint: "In Replit: go to Tools → Secrets. Copy each key and value.",
    tip: "Replit stores your code on their servers. This step moves it to GitHub so The Forge can watch it.",
  },
  {
    id: "vercel",
    name: "Vercel",
    color: "text-foreground",
    bg: "bg-muted/60",
    border: "border-border",
    logo: "▲",
    codeOnGithub: true,
    steps: [
      "Go to your Vercel dashboard",
      "Click your project",
      "Go to Settings → Git",
      "Copy the GitHub repository URL",
      "Paste it below — your code is already on GitHub",
    ],
    agentPrompt: `I want to move my Vercel app to 13 Moon Forge so it runs on my own server. Here's what I need:

1. Go to my Vercel project at vercel.com/dashboard
2. Find the GitHub repository it's connected to (Settings → Git)
3. Tell me the GitHub repo URL

Once I have that, I'll connect it to The Forge and auto-deploy from the same repo.`,
    envHint: "In Vercel: go to your project → Settings → Environment Variables. Copy each one.",
    tip: "Your code is already on GitHub. You just need the URL — no migration needed.",
  },
  {
    id: "netlify",
    name: "Netlify",
    color: "text-teal-400",
    bg: "bg-teal-500/10",
    border: "border-teal-500/30",
    logo: "N",
    codeOnGithub: true,
    steps: [
      "Go to your Netlify dashboard",
      "Click your site",
      "Go to Site configuration → Build & deploy → Continuous deployment",
      "Copy the Repository URL (GitHub link)",
      "Paste it below",
    ],
    agentPrompt: `I want to move my Netlify site to 13 Moon Forge. Here's what I need:

1. Go to my Netlify dashboard at app.netlify.com
2. Find my site and go to Site configuration → Build & deploy
3. Find the GitHub repository URL it's connected to
4. Tell me that URL

Once I have it, I'll wire it up on The Forge.`,
    envHint: "In Netlify: Site configuration → Environment variables. Copy each key and value.",
    tip: "Your code is already on GitHub. Just grab the repo URL from your Netlify settings.",
  },
  {
    id: "heroku",
    name: "Heroku",
    color: "text-purple-400",
    bg: "bg-purple-500/10",
    border: "border-purple-500/30",
    logo: "H",
    codeOnGithub: false,
    steps: [
      "Go to your Heroku dashboard → your app → Deploy tab",
      "If connected to GitHub: copy the repo URL — you're done",
      "If not: open your terminal and run: heroku git:clone -a YOUR-APP-NAME",
      "Then push to a new GitHub repo: git remote add origin https://github.com/you/your-app.git && git push -u origin main",
      "Copy that GitHub URL and paste it below",
    ],
    agentPrompt: `I want to move my Heroku app to 13 Moon Forge. Please help me:

1. Check if my Heroku app is connected to GitHub (go to the Deploy tab in the Heroku dashboard)
2. If yes: get me that GitHub repo URL
3. If no: clone the Heroku git repo locally, push it to a new GitHub repo, and give me the URL

I'll take it from there in The Forge.`,
    envHint: "In Heroku: Settings → Config Vars. Copy each key and value.",
    tip: "If your Heroku app already pushes to GitHub, this is a 30-second job.",
  },
  {
    id: "railway",
    name: "Railway",
    color: "text-violet-400",
    bg: "bg-violet-500/10",
    border: "border-violet-500/30",
    logo: "Ry",
    codeOnGithub: true,
    steps: [
      "Go to your Railway dashboard at railway.app",
      "Click your project → click the service",
      "Go to Settings → Source",
      "Copy the GitHub repository URL",
      "Paste it below",
    ],
    agentPrompt: `I want to move my Railway app to 13 Moon Forge. Please:

1. Go to my Railway project at railway.app
2. Click my service → Settings → Source
3. Get me the GitHub repo URL

That's all I need — The Forge will take it from there.`,
    envHint: "In Railway: your service → Variables tab. Copy each key and value.",
    tip: "Railway connects from GitHub by default — your code is likely already there.",
  },
  {
    id: "render",
    name: "Render",
    color: "text-emerald-400",
    bg: "bg-emerald-500/10",
    border: "border-emerald-500/30",
    logo: "Re",
    codeOnGithub: true,
    steps: [
      "Go to your Render dashboard at dashboard.render.com",
      "Click your service",
      "Go to Settings → Build & Deploy",
      "Copy the Repository URL (GitHub link)",
      "Paste it below",
    ],
    agentPrompt: `I want to move my Render app to 13 Moon Forge. Please:

1. Go to my Render dashboard at dashboard.render.com
2. Click my service → Settings → Build & Deploy
3. Get me the GitHub repository URL

Once I have it, I'll connect it to The Forge.`,
    envHint: "In Render: your service → Environment tab. Copy each key and value.",
    tip: "Render deploys from GitHub — your code is already there.",
  },
  {
    id: "digitalocean",
    name: "DigitalOcean",
    color: "text-sky-400",
    bg: "bg-sky-500/10",
    border: "border-sky-500/30",
    logo: "DO",
    codeOnGithub: true,
    steps: [
      "Go to cloud.digitalocean.com → Apps",
      "Click your app",
      "Go to Settings → App Spec",
      "Find the github.repo value — that's your GitHub URL",
      "Paste it below",
    ],
    agentPrompt: `I want to move my DigitalOcean App Platform app to 13 Moon Forge. Please:

1. Go to cloud.digitalocean.com → Apps
2. Click my app → Settings → App Spec  
3. Find the GitHub repository URL (github.repo field)
4. Tell me that URL

I'll handle the rest in The Forge.`,
    envHint: "In DigitalOcean: your app → Settings → App-Level Environment Variables.",
    tip: "DigitalOcean App Platform deploys from GitHub — your code is already there.",
  },
  {
    id: "flyio",
    name: "Fly.io",
    color: "text-indigo-400",
    bg: "bg-indigo-500/10",
    border: "border-indigo-500/30",
    logo: "Fly",
    codeOnGithub: false,
    steps: [
      "Make sure your code is in a GitHub repo (most Fly apps aren't auto-connected)",
      "If not: push your code to a new GitHub repo",
      "Copy the GitHub URL",
      "Paste it below",
    ],
    agentPrompt: `I want to move my Fly.io app to 13 Moon Forge. Please:

1. Check if my Fly app code is already on GitHub
2. If not: push it to a new GitHub repo named [APP NAME]
3. Give me the GitHub repository URL

That's all I need — The Forge will auto-deploy from there.`,
    envHint: "Run: fly secrets list — note each key name, then find the values in your codebase or .env file.",
    tip: "Fly.io doesn't require GitHub, so you may need to push manually first.",
  },
  {
    id: "glitch",
    name: "Glitch",
    color: "text-pink-400",
    bg: "bg-pink-500/10",
    border: "border-pink-500/30",
    logo: "G",
    codeOnGithub: false,
    steps: [
      "Open your Glitch project",
      "Click Tools (bottom left) → Import and Export",
      "Click "Export to GitHub" and create a new repo",
      "Copy the GitHub URL",
      "Paste it below",
    ],
    agentPrompt: `I want to move my Glitch project to 13 Moon Forge. Please:

1. Go to my Glitch project
2. Click Tools → Import and Export → Export to GitHub
3. Create a new GitHub repo and push my code there
4. Give me the GitHub URL

I'll take it from there in The Forge.`,
    envHint: "In Glitch: open your .env file in the editor — copy each key and value.",
    tip: 'Glitch stores .env values hidden in the editor — they won\'t export to GitHub, so copy them before you start.',
  },
  {
    id: "github-pages",
    name: "GitHub Pages",
    color: "text-foreground",
    bg: "bg-muted/60",
    border: "border-border",
    logo: "GP",
    codeOnGithub: true,
    steps: [
      "Your code IS the GitHub repo — this is the easiest migration",
      "Go to github.com and open your repository",
      "Copy the URL from your browser (e.g. github.com/you/my-site)",
      "Paste it below",
    ],
    agentPrompt: `I want to move my GitHub Pages site to 13 Moon Forge so it runs on my own server. Please:

1. Find my GitHub Pages repository URL (it's the GitHub repo itself)
2. Tell me the URL

This one's easy — The Forge will build and host it from the same repo.`,
    envHint: "GitHub Pages is static — you likely don't have env vars.",
    tip: "This is the simplest migration possible. Your code is already on GitHub.",
  },
  {
    id: "other",
    name: "Something else",
    color: "text-muted-foreground",
    bg: "bg-muted/40",
    border: "border-border",
    logo: "?",
    codeOnGithub: false,
    steps: [
      "Push your code to a GitHub repository if it isn't already",
      "Copy that GitHub URL",
      "Paste it below",
      "If you can't get a GitHub URL, use the Vault → Upload ZIP option instead",
    ],
    agentPrompt: `I want to move my app to 13 Moon Forge. Please:

1. Push my current project code to a new GitHub repository
2. Give me the GitHub URL

If the code isn't accessible, export it as a ZIP file and I'll upload it to The Vault instead.`,
    envHint: "Copy your environment variables from wherever your platform stores them.",
    tip: "If you can't get a GitHub URL, use The Vault's ZIP upload instead.",
  },
];

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
  const u = gitUrl.toLowerCase();
  if (u.includes("next")) return { build: "npm run build", start: "npm start", port: 3000 };
  if (u.includes("react") || u.includes("vite")) return { build: "npm run build", start: "npx serve dist", port: 3000 };
  return { build: "npm install && npm run build", start: "npm start", port: 3000 };
}

function useCopy(text: string) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return { copied, copy };
}

// ── Sub-components ────────────────────────────────────────────────────────────

function StepDot({ n, active, done }: { n: number; active: boolean; done: boolean }) {
  return (
    <div className={cn(
      "w-8 h-8 rounded-full flex items-center justify-center shrink-0 font-bold text-sm transition-all",
      done ? "bg-green-500 text-white" : active ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
    )}>
      {done ? <CheckCircle2 className="w-4 h-4" /> : n}
    </div>
  );
}

function PlatformCard({ p, selected, onClick }: { p: Platform; selected: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex items-center gap-3 p-3 rounded-xl border text-left transition-all",
        selected ? `${p.bg} ${p.border} ring-1 ring-current` : "border-border hover:border-border/80 hover:bg-muted/40"
      )}
    >
      <div className={cn(
        "w-9 h-9 rounded-lg flex items-center justify-center font-bold text-sm shrink-0",
        selected ? `${p.bg} ${p.color}` : "bg-muted text-muted-foreground"
      )}>
        {p.logo}
      </div>
      <div className="min-w-0">
        <p className={cn("text-sm font-medium leading-tight", selected ? p.color : "text-foreground")}>{p.name}</p>
        {p.codeOnGithub && (
          <p className="text-[10px] text-muted-foreground leading-tight mt-0.5">Code already on GitHub</p>
        )}
      </div>
      {selected && <CheckCircle2 className={cn("w-4 h-4 ml-auto shrink-0", p.color)} />}
    </button>
  );
}

function AgentPromptBox({ prompt }: { prompt: string }) {
  const { copied, copy } = useCopy(prompt);
  return (
    <div className="bg-muted/60 border border-border rounded-xl overflow-hidden">
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-border">
        <span className="text-xs font-medium text-muted-foreground">Copy this into your AI agent / Replit chat</span>
        <Button size="sm" variant="ghost" className="h-6 text-xs gap-1 px-2" onClick={copy}>
          {copied ? <><Check className="w-3 h-3" /> Copied!</> : <><Copy className="w-3 h-3" /> Copy</>}
        </Button>
      </div>
      <pre className="p-4 text-xs text-foreground whitespace-pre-wrap font-mono leading-relaxed">{prompt}</pre>
    </div>
  );
}

// ── Main page ──────────────────────────────────────────────────────────────────
export default function MigratePage() {
  const [step, setStep] = useState(0); // 0=platform, 1=server, 2=github, 3=env, 4=config, 5=launch, 6=done
  const [platform, setPlatform] = useState<Platform | null>(null);
  const [serverOk, setServerOk] = useState<boolean | null>(null);
  const [serverName, setServerName] = useState("My Server");

  const [gitUrl, setGitUrl] = useState("");
  const [gitBranch, setGitBranch] = useState("main");
  const [appName, setAppName] = useState("");

  const [envRaw, setEnvRaw] = useState("");
  const [envParsed, setEnvParsed] = useState<Record<string, string>>({});
  const [showEnvValues, setShowEnvValues] = useState(false);

  const [port, setPort] = useState("3000");
  const [buildCmd, setBuildCmd] = useState("npm install && npm run build");
  const [startCmd, setStartCmd] = useState("npm start");

  const [launching, setLaunching] = useState(false);
  const [launchErr, setLaunchErr] = useState<string | null>(null);
  const [needsKey, setNeedsKey] = useState(false);
  const [checklist, setChecklist] = useState({ repoConnected: false, envSet: false, deployed: false });

  useEffect(() => {
    fetch(`${API_BASE}/api/deploys/server-check`, { credentials: "include" })
      .then(r => r.json())
      .then(d => {
        const data = d as { connected: boolean; serverName?: string };
        setServerOk(data.connected);
        if (data.serverName) setServerName(data.serverName);
      })
      .catch(() => setServerOk(false));
  }, []);

  useEffect(() => { setEnvParsed(parseEnv(envRaw)); }, [envRaw]);

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
      setChecklist({ repoConnected: true, envSet: Object.keys(envParsed).length > 0, deployed: true });
      setStep(6);
    } finally {
      setLaunching(false);
    }
  };

  const envCount = Object.keys(envParsed).length;
  const TOTAL_STEPS = 6;
  const progress = step / TOTAL_STEPS;

  return (
    <div className="max-w-2xl space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-3 mb-1">
          <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
            <Rocket className="w-5 h-5 text-primary" />
          </div>
          <h1 className="text-2xl font-bold">Move Your App to The Forge</h1>
        </div>
        <p className="text-muted-foreground text-sm">
          From any platform. Your app ends up running on your own server — updating automatically every time you push code.
        </p>
      </div>

      {/* Progress bar */}
      {step > 0 && (
        <div className="h-1.5 bg-muted rounded-full overflow-hidden">
          <div className="h-full bg-primary rounded-full transition-all duration-500" style={{ width: `${progress * 100}%` }} />
        </div>
      )}

      {/* ── Step 0: Platform selector ──────────────────────────────────────── */}
      {step === 0 && (
        <div className="space-y-5">
          <div>
            <h2 className="font-semibold text-lg mb-1">Where is your app right now?</h2>
            <p className="text-sm text-muted-foreground">Pick your current platform and we'll show you the exact steps.</p>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {PLATFORMS.map(p => (
              <PlatformCard key={p.id} p={p} selected={platform?.id === p.id} onClick={() => setPlatform(p)} />
            ))}
          </div>
          {platform && (
            <div className={cn("rounded-xl border p-4 space-y-3", platform.bg, platform.border)}>
              <p className={cn("text-sm font-semibold", platform.color)}>Moving from {platform.name}</p>
              {platform.tip && (
                <p className="text-xs text-muted-foreground">{platform.tip}</p>
              )}
              <ol className="space-y-2">
                {platform.steps.map((s, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                    <span className={cn("font-bold shrink-0 mt-0.5", platform.color)}>{i + 1}.</span>
                    <span>{s}</span>
                  </li>
                ))}
              </ol>
              {platform.agentPrompt && (
                <div className="pt-1">
                  <p className="text-xs font-medium text-muted-foreground mb-2">Or have your AI agent do the GitHub part:</p>
                  <AgentPromptBox prompt={platform.agentPrompt} />
                </div>
              )}
            </div>
          )}
          <Button onClick={() => setStep(1)} disabled={!platform} size="lg">
            {platform ? `Continue from ${platform.name}` : "Pick a platform first"}
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </div>
      )}

      {/* ── Step 1: Server check ──────────────────────────────────────────── */}
      {step === 1 && (
        <div className="bg-card border border-border rounded-xl p-5 space-y-4">
          <div className="flex items-start gap-4">
            <StepDot n={1} active done={false} />
            <div>
              <h3 className="font-semibold">Check your server</h3>
              <p className="text-sm text-muted-foreground">Make sure your Forge server is connected</p>
            </div>
          </div>
          <div className="ml-12 space-y-3">
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
                  No server connected yet. Set up your Coolify connection first.
                </div>
                <Link href="/connections">
                  <Button size="sm" variant="outline"><Server className="w-4 h-4 mr-1.5" /> Connect Server</Button>
                </Link>
              </div>
            )}
            {serverOk === true && (
              <Button onClick={() => setStep(2)}>Continue <ArrowRight className="w-4 h-4 ml-1.5" /></Button>
            )}
          </div>
        </div>
      )}

      {/* ── Step 2: GitHub URL ─────────────────────────────────────────────── */}
      {step === 2 && (
        <div className="bg-card border border-border rounded-xl p-5 space-y-4">
          <div className="flex items-start gap-4">
            <StepDot n={2} active done={false} />
            <div>
              <h3 className="font-semibold">Your GitHub repo URL</h3>
              <p className="text-sm text-muted-foreground">
                {platform?.codeOnGithub
                  ? `Your code is already on GitHub — find the URL in your ${platform.name} settings.`
                  : "Paste the GitHub URL after following the steps above."}
              </p>
            </div>
          </div>
          <div className="ml-12 space-y-4">
            {platform && !platform.codeOnGithub && (
              <div className="bg-sky-500/10 border border-sky-500/20 rounded-lg p-3 text-sm text-sky-400 space-y-1">
                <p className="font-medium">Quick reminder for {platform.name}:</p>
                <p>{platform.steps[0]}</p>
              </div>
            )}
            <div>
              <label className="text-sm font-medium mb-1.5 block">GitHub repo URL</label>
              <Input value={gitUrl} onChange={e => setGitUrl(e.target.value)} placeholder="https://github.com/you/my-app" />
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
        </div>
      )}

      {/* ── Step 3: Env vars ──────────────────────────────────────────────── */}
      {step === 3 && (
        <div className="bg-card border border-border rounded-xl p-5 space-y-4">
          <div className="flex items-start gap-4">
            <StepDot n={3} active done={false} />
            <div>
              <h3 className="font-semibold">Environment variables</h3>
              <p className="text-sm text-muted-foreground">Paste your secrets — these stay on your server</p>
            </div>
          </div>
          <div className="ml-12 space-y-4">
            {platform?.envHint && (
              <div className="bg-muted rounded-lg p-3 text-sm text-muted-foreground">
                <span className="font-medium text-foreground">Where to find them: </span>{platform.envHint}
              </div>
            )}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-sm font-medium">Paste as KEY=VALUE</label>
                <button onClick={() => setShowEnvValues(!showEnvValues)} className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
                  {showEnvValues ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                  {showEnvValues ? "Hide" : "Show"} values
                </button>
              </div>
              <textarea
                value={envRaw}
                onChange={e => setEnvRaw(e.target.value)}
                placeholder={"DATABASE_URL=postgres://...\nAPI_KEY=sk-...\nSESSION_SECRET=..."}
                className="w-full h-32 bg-muted rounded-lg border border-border p-3 text-sm font-mono resize-none focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>
            {envCount > 0 && (
              <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-3">
                <p className="text-xs font-medium text-green-400 mb-2">{envCount} variable{envCount !== 1 ? "s" : ""} detected</p>
                <div className="space-y-1 max-h-28 overflow-y-auto">
                  {Object.entries(envParsed).map(([k, v]) => (
                    <div key={k} className="flex items-center gap-2 text-xs font-mono">
                      <span className="text-green-300 shrink-0">{k}</span>
                      <span className="text-muted-foreground/60">=</span>
                      <span className="text-muted-foreground truncate">{showEnvValues ? v : "•".repeat(Math.min(v.length, 16))}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            <div className="flex gap-2">
              <Button onClick={() => setStep(4)}>
                {envCount > 0 ? `Continue with ${envCount} vars` : "Skip for now"} <ArrowRight className="w-4 h-4 ml-1.5" />
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ── Step 4: Config ────────────────────────────────────────────────── */}
      {step === 4 && (
        <div className="bg-card border border-border rounded-xl p-5 space-y-4">
          <div className="flex items-start gap-4">
            <StepDot n={4} active done={false} />
            <div>
              <h3 className="font-semibold">App configuration</h3>
              <p className="text-sm text-muted-foreground">Auto-detected from your repo — adjust if needed</p>
            </div>
          </div>
          <div className="ml-12 space-y-4">
            <div className="grid gap-3">
              <div>
                <label className="text-sm font-medium mb-1.5 block flex items-center gap-1.5"><Terminal className="w-3.5 h-3.5" /> Build command</label>
                <Input value={buildCmd} onChange={e => setBuildCmd(e.target.value)} className="font-mono text-sm" />
              </div>
              <div>
                <label className="text-sm font-medium mb-1.5 block flex items-center gap-1.5"><Zap className="w-3.5 h-3.5" /> Start command</label>
                <Input value={startCmd} onChange={e => setStartCmd(e.target.value)} className="font-mono text-sm" />
              </div>
              <div>
                <label className="text-sm font-medium mb-1.5 block flex items-center gap-1.5"><Globe className="w-3.5 h-3.5" /> Port</label>
                <Input value={port} onChange={e => setPort(e.target.value)} className="font-mono text-sm w-28" />
              </div>
            </div>
            <Button onClick={() => setStep(5)}>Continue <ArrowRight className="w-4 h-4 ml-1.5" /></Button>
          </div>
        </div>
      )}

      {/* ── Step 5: Launch ────────────────────────────────────────────────── */}
      {step === 5 && (
        <div className="bg-card border border-border rounded-xl p-5 space-y-4">
          <div className="flex items-start gap-4">
            <StepDot n={5} active done={false} />
            <div>
              <h3 className="font-semibold">Launch</h3>
              <p className="text-sm text-muted-foreground">Wire your server to auto-deploy on every push</p>
            </div>
          </div>
          <div className="ml-12 space-y-4">
            <div className="bg-muted rounded-xl p-4 space-y-2 text-sm">
              {[
                { icon: <Github className="w-3.5 h-3.5 shrink-0" />, label: gitUrl },
                { icon: <GitBranch className="w-3.5 h-3.5 shrink-0" />, label: `Branch: ${gitBranch}` },
                { icon: <Key className="w-3.5 h-3.5 shrink-0" />, label: `${envCount} env var${envCount !== 1 ? "s" : ""}` },
                { icon: <Globe className="w-3.5 h-3.5 shrink-0" />, label: `Port ${port}` },
              ].map((row, i) => (
                <div key={i} className="flex items-center gap-2 text-muted-foreground">
                  {row.icon}<span className="truncate">{row.label}</span>
                </div>
              ))}
            </div>

            {launchErr && (
              <div className={cn("rounded-xl p-4 text-sm", needsKey ? "bg-amber-500/10 border border-amber-500/20" : "bg-red-500/10 border border-red-500/20")}>
                {needsKey ? (
                  <div className="space-y-2">
                    <p className="text-amber-400 font-medium flex items-center gap-1.5"><Lock className="w-4 h-4" /> Coolify API key needs deploy permissions</p>
                    <ol className="text-xs text-muted-foreground space-y-1 list-decimal list-inside">
                      <li>Go to <strong className="text-foreground">Coolify → Settings → API Keys</strong></li>
                      <li>Create a new key with <strong className="text-foreground">Deploy</strong> permission checked</li>
                      <li>Come to <Link href="/connections" className="text-primary underline">Integrations</Link> and update your server key</li>
                      <li>Come back here and click Launch again</li>
                    </ol>
                    <a href="http://5.78.154.21:8000/settings/api-keys" target="_blank" rel="noopener noreferrer">
                      <Button size="sm" variant="outline" className="mt-1">
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
            <h2 className="text-xl font-bold mb-1">You're live on your own server.</h2>
            <p className="text-muted-foreground text-sm">
              {platform?.name ?? "Your platform"} → GitHub → your server. Automatic from here on out.
            </p>
          </div>

          <div className="bg-muted rounded-xl p-4 space-y-3">
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Checklist</p>
            {[
              { label: "Repo connected to Coolify",       done: checklist.repoConnected },
              { label: "Environment variables configured", done: checklist.envSet || envCount === 0 },
              { label: "First deploy triggered",           done: checklist.deployed },
            ].map((item, i) => (
              <div key={i} className="flex items-center gap-3">
                {item.done
                  ? <CheckCircle2 className="w-4 h-4 text-green-400 shrink-0" />
                  : <Circle className="w-4 h-4 text-muted-foreground shrink-0" />}
                <span className={cn("text-sm", item.done ? "text-foreground" : "text-muted-foreground")}>{item.label}</span>
              </div>
            ))}
          </div>

          <div className="bg-sky-500/5 border border-sky-500/20 rounded-xl p-4">
            <p className="text-sm font-medium text-sky-400 mb-2">Your workflow from now on:</p>
            <ol className="space-y-1 text-sm text-muted-foreground list-decimal list-inside">
              <li>Make changes {platform ? `in ${platform.name}` : "in your editor"}</li>
              <li>Push to GitHub</li>
              <li>Your server auto-deploys — done.</li>
            </ol>
          </div>

          <div className="flex gap-3">
            <Link href="/deploys" className="flex-1">
              <Button className="w-full"><Zap className="w-4 h-4 mr-1.5" /> Watch Deploy Status</Button>
            </Link>
            <Button variant="outline" onClick={() => { setStep(0); setPlatform(null); setGitUrl(""); setAppName(""); setEnvRaw(""); setLaunchErr(null); setChecklist({ repoConnected: false, envSet: false, deployed: false }); }}>
              Move Another App
            </Button>
          </div>
        </div>
      )}

      {/* Back button */}
      {step > 0 && step < 6 && (
        <button onClick={() => setStep(s => s - 1)} className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1">
          ← Back
        </button>
      )}
    </div>
  );
}
