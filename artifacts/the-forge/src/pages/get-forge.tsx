import { useState, useEffect } from "react";
import {
  Terminal, Download, Copy, Check, Rocket, GitBranch,
  Key, Zap, MessageCircle, ChevronRight, Globe, FileCode,
  Shield, Cpu, ExternalLink, Loader2, CheckCircle2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const API_BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

function useCopy(text: string) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };
  return { copied, copy };
}

function CodeBlock({ code, label }: { code: string; label?: string }) {
  const { copied, copy } = useCopy(code);
  return (
    <div className="bg-[#0d1117] border border-border rounded-xl overflow-hidden">
      {label && (
        <div className="flex items-center justify-between px-4 py-2 border-b border-border/60 bg-muted/30">
          <span className="text-xs text-muted-foreground font-mono">{label}</span>
          <button onClick={copy} className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors">
            {copied ? <><Check className="w-3 h-3 text-green-400" /><span className="text-green-400">Copied!</span></> : <><Copy className="w-3 h-3" />Copy</>}
          </button>
        </div>
      )}
      <pre className="p-4 text-sm font-mono text-green-400 overflow-x-auto leading-relaxed whitespace-pre-wrap">{code}</pre>
    </div>
  );
}

const WHAT_IT_CAN_DO = [
  { icon: <MessageCircle className="w-4 h-4" />, title: "Talk in plain English", desc: "Describe what you need — no technical jargon required" },
  { icon: <GitBranch className="w-4 h-4" />, title: "Push your code to GitHub", desc: "Forge handles git init, commit, and push for you" },
  { icon: <FileCode className="w-4 h-4" />, title: "Read your local project", desc: "Sees your files, detects your stack, knows your setup" },
  { icon: <Key className="w-4 h-4" />, title: "Find your env vars", desc: "Reads your .env file so you don't miss any secrets" },
  { icon: <Rocket className="w-4 h-4" />, title: "Connect to The Forge", desc: "Hands off to your server once your code is ready" },
  { icon: <Globe className="w-4 h-4" />, title: "Create GitHub repos", desc: "Makes the repo and pushes with your GitHub token" },
];

export default function GetForgePage() {
  const [token, setToken] = useState<string | null>(null);
  const [loadingToken, setLoadingToken] = useState(false);
  const [tokenErr, setTokenErr] = useState<string | null>(null);
  const { copied: tokenCopied, copy: copyToken } = useCopy(token ?? "");

  const fetchToken = async () => {
    setLoadingToken(true);
    setTokenErr(null);
    try {
      const r = await fetch(`${API_BASE}/api/help/cli-token`, { credentials: "include" });
      const d = await r.json() as { token?: string; error?: string };
      if (!r.ok) { setTokenErr(d.error ?? "Failed"); return; }
      setToken(d.token ?? null);
    } catch {
      setTokenErr("Network error — try again");
    } finally {
      setLoadingToken(false);
    }
  };

  const downloadUrl = `${API_BASE}/api/help/forge-agent.js`;

  const installCmd = `# Step 1 — download Forge Agent
curl -o forge.js ${window.location.origin}/api/help/forge-agent.js

# Step 2 — run it
node forge.js`;

  const tokenCmd = token
    ? `# Paste your token when Forge Agent asks for it:
${token}`
    : `# Get your CLI token from this page, then paste it when asked`;

  return (
    <div className="max-w-2xl space-y-10">

      {/* Hero */}
      <div className="space-y-4">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-primary/10 text-primary rounded-full text-xs font-medium">
          <Cpu className="w-3.5 h-3.5" />
          Forge on your machine
        </div>
        <h1 className="text-3xl font-bold leading-tight">
          Can't figure it out?<br />
          <span className="text-primary">Let Forge do it for you.</span>
        </h1>
        <p className="text-muted-foreground text-lg leading-relaxed">
          Install Forge Agent on your computer. Open your terminal, tell Forge what you need in plain English — 
          and it does the work. Pushes your code to GitHub, finds your secrets, hands it off to your server. 
          No technical knowledge required.
        </p>
      </div>

      {/* What it does */}
      <div className="space-y-3">
        <h2 className="font-semibold text-sm uppercase tracking-widest text-muted-foreground/60">What it can do</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {WHAT_IT_CAN_DO.map((item, i) => (
            <div key={i} className="flex items-start gap-3 p-4 bg-card border border-border rounded-xl">
              <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0 mt-0.5">
                {item.icon}
              </div>
              <div>
                <p className="text-sm font-medium leading-tight">{item.title}</p>
                <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{item.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Install steps */}
      <div className="space-y-6">
        <h2 className="font-semibold text-lg">Get it running in 3 steps</h2>

        {/* Step 1 */}
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 rounded-full bg-primary/15 text-primary font-bold text-sm flex items-center justify-center shrink-0">1</div>
            <div>
              <p className="font-medium text-sm">Get your CLI token</p>
              <p className="text-xs text-muted-foreground">This links Forge Agent to your account</p>
            </div>
          </div>
          <div className="ml-10 space-y-3">
            {!token ? (
              <div className="space-y-2">
                <Button onClick={fetchToken} disabled={loadingToken} size="sm">
                  {loadingToken ? <><Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" /> Generating…</> : <><Key className="w-3.5 h-3.5 mr-1.5" /> Generate My CLI Token</>}
                </Button>
                {tokenErr && <p className="text-xs text-red-400">{tokenErr}</p>}
              </div>
            ) : (
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-xs text-green-400">
                  <CheckCircle2 className="w-4 h-4" /> Token generated — copy it and keep it safe
                </div>
                <div className="bg-[#0d1117] border border-border rounded-xl overflow-hidden">
                  <div className="flex items-center justify-between px-4 py-2 border-b border-border/60 bg-muted/30">
                    <span className="text-xs text-muted-foreground font-mono">Your CLI token</span>
                    <button onClick={copyToken} className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors">
                      {tokenCopied ? <><Check className="w-3 h-3 text-green-400" /><span className="text-green-400">Copied!</span></> : <><Copy className="w-3 h-3" />Copy</>}
                    </button>
                  </div>
                  <pre className="p-4 text-xs font-mono text-yellow-300 overflow-x-auto break-all whitespace-pre-wrap">{token}</pre>
                </div>
                <p className="text-[11px] text-muted-foreground/60">This token never expires unless you regenerate it.</p>
              </div>
            )}
          </div>
        </div>

        {/* Step 2 */}
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 rounded-full bg-primary/15 text-primary font-bold text-sm flex items-center justify-center shrink-0">2</div>
            <div>
              <p className="font-medium text-sm">Download and run Forge Agent</p>
              <p className="text-xs text-muted-foreground">Requires Node.js — <a href="https://nodejs.org" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline inline-flex items-center gap-0.5">get it free <ExternalLink className="w-2.5 h-2.5" /></a></p>
            </div>
          </div>
          <div className="ml-10 space-y-3">
            <CodeBlock code={installCmd} label="Terminal" />
            <div className="flex gap-2">
              <a href={downloadUrl} download="forge.js">
                <Button size="sm" variant="outline">
                  <Download className="w-3.5 h-3.5 mr-1.5" /> Download forge.js directly
                </Button>
              </a>
            </div>
          </div>
        </div>

        {/* Step 3 */}
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 rounded-full bg-primary/15 text-primary font-bold text-sm flex items-center justify-center shrink-0">3</div>
            <div>
              <p className="font-medium text-sm">Paste your token and tell Forge what you need</p>
              <p className="text-xs text-muted-foreground">Type anything in plain English — Forge will figure it out</p>
            </div>
          </div>
          <div className="ml-10 space-y-3">
            <CodeBlock code={tokenCmd} label="forge.js — when it asks for your token" />

            <div className="bg-muted/40 border border-border rounded-xl p-4 space-y-2">
              <p className="text-xs font-medium text-muted-foreground">Examples of what to say:</p>
              {[
                "I want to move my Replit project to The Forge",
                "Push my code to GitHub — the folder is at /Users/me/my-app",
                "Find all my environment variables and tell me what I have",
                "My deploy is stuck, what do I do?",
                "Create a GitHub repo called my-app and push my current folder",
              ].map((ex, i) => (
                <div key={i} className="flex items-start gap-2 text-xs text-muted-foreground">
                  <ChevronRight className="w-3 h-3 text-primary shrink-0 mt-0.5" />
                  <span className="font-mono">{ex}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Requirements */}
      <div className="bg-muted/30 border border-border rounded-xl p-5 space-y-3">
        <div className="flex items-center gap-2">
          <Shield className="w-4 h-4 text-muted-foreground" />
          <p className="text-sm font-medium">Requirements</p>
        </div>
        <ul className="space-y-1.5 text-sm text-muted-foreground">
          {[
            ["Node.js 18+", "Already installed on most developer machines. Download at nodejs.org."],
            ["A Forge account", "You're logged in — you already have one."],
            ["Your CLI token", "Generated on this page above."],
            ["Git (optional)", "For pushing code. Already installed on Mac, install git-scm.com on Windows."],
          ].map(([title, desc]) => (
            <li key={title} className="flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-green-400 shrink-0 mt-0.5" />
              <span><strong className="text-foreground">{title}</strong> — {desc}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* What happens */}
      <div className="space-y-3">
        <h2 className="font-semibold">What happens when you run it</h2>
        <div className="bg-[#0d1117] border border-border rounded-xl p-5 font-mono text-sm space-y-1 leading-relaxed">
          <p><span className="text-muted-foreground">$</span> <span className="text-white">node forge.js</span></p>
          <p className="text-green-400 mt-2">  ╔══════════════════════════════╗</p>
          <p className="text-green-400">  ║   🔥 Forge Agent  v1.0.0    ║</p>
          <p className="text-green-400">  ╚══════════════════════════════╝</p>
          <p className="text-muted-foreground mt-2">  Connected to 13 Moon Forge</p>
          <p className="text-muted-foreground">  Forge is ready. What do you need?</p>
          <p className="mt-2"><span className="text-primary">You:</span> <span className="text-white">I want to move my Replit app to The Forge</span></p>
          <p className="mt-1 text-yellow-300">Forge: Got it. Let me check what you're working with...</p>
          <p className="text-yellow-300">       What's the path to your project folder?</p>
          <p><span className="text-primary">You:</span> <span className="text-white">/Users/me/my-app</span></p>
          <p className="mt-1 text-yellow-300">Forge: Found it. I see a React + Vite project.</p>
          <p className="text-yellow-300">       I also found a .env file — 4 secrets.</p>
          <p className="text-yellow-300">       Ready to push this to GitHub. Do you have</p>
          <p className="text-yellow-300">       a GitHub token? (or press Enter to skip)</p>
          <p><span className="text-primary">You:</span> <span className="text-white">ghp_abc123...</span></p>
          <p className="mt-1 text-yellow-300">Forge: Creating repo my-app on GitHub...</p>
          <p className="text-green-400">       ✓ Repo created: github.com/you/my-app</p>
          <p className="text-green-400">       ✓ Code pushed to main</p>
          <p className="text-yellow-300">       Now open The Forge → Connect & Deploy</p>
          <p className="text-yellow-300">       and paste: github.com/you/my-app</p>
        </div>
      </div>

    </div>
  );
}
