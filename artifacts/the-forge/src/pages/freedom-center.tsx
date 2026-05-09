import { useState } from "react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  ShieldCheck, Copy, Check, ArrowRight, Github, Terminal,
  Globe, Server, Zap, Lock, Infinity, Heart, GitBranch,
  AlertCircle, ChevronRight, Package, Code2,
} from "lucide-react";

const FORGE_GIT = "git.13moonforge.ai";

type Platform = "replit" | "github" | "heroku" | "local";

interface Step {
  num: number;
  title: string;
  desc: string;
  commands?: string[];
  note?: string;
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={() => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
      className="absolute top-2 right-2 p-1.5 rounded bg-zinc-700 hover:bg-zinc-600 text-zinc-300 hover:text-white transition-colors"
      title="Copy"
    >
      {copied ? <Check size={12} className="text-green-400" /> : <Copy size={12} />}
    </button>
  );
}

function CodeBlock({ commands }: { commands: string[] }) {
  const text = commands.join("\n");
  return (
    <div className="relative mt-3 rounded-lg bg-black border border-zinc-800 p-4 font-mono text-xs leading-relaxed">
      <CopyButton text={text} />
      {commands.map((cmd, i) => (
        <div key={i} className={cn("pr-8", cmd.startsWith("#") ? "text-zinc-500" : "text-green-300")}>
          {cmd}
        </div>
      ))}
    </div>
  );
}

const platformSteps: Record<Platform, Step[]> = {
  replit: [
    {
      num: 1,
      title: "Open your Replit project's Shell tab",
      desc: "In the Replit editor, click the Shell tab at the bottom. Every Replit project has a built-in terminal.",
    },
    {
      num: 2,
      title: "Initialize git and stage your files",
      desc: "These commands turn your project into a git repo and prepare all files for pushing.",
      commands: [
        "git init",
        "git add .",
        'git commit -m "Moving to Freedom Center — self-hosted forever"',
      ],
    },
    {
      num: 3,
      title: "Create a repo on your Forge Git server",
      desc: `Go to https://${FORGE_GIT} → sign in → click the + icon → New Repository → give it a name → Create. Then come back here.`,
      note: `Your Forge Git server lives at https://${FORGE_GIT} — it's your own GitHub, on your own machine.`,
    },
    {
      num: 4,
      title: "Connect and push your code",
      desc: `Replace YOUR-TOKEN with your Forge Git token (get one at https://${FORGE_GIT}/user/settings/applications) and REPO-NAME with the repo you just created.`,
      commands: [
        `# Replace YOUR-TOKEN and REPO-NAME below`,
        `git remote remove forge 2>/dev/null`,
        `git remote add forge https://YOUR-USERNAME:YOUR-TOKEN@${FORGE_GIT}/YOUR-USERNAME/REPO-NAME.git`,
        "git push forge HEAD:main --force",
      ],
    },
    {
      num: 5,
      title: "Deploy via Forge Hosting",
      desc: "Head to Forge Hosting, click Deploy App, pick your repo from the Forge Git source, and we'll detect the stack and go live.",
    },
  ],
  github: [
    {
      num: 1,
      title: "Connect GitHub to Forge",
      desc: "If you haven't already, go to GitHub settings in Forge and authorize your GitHub account. Takes 30 seconds.",
      note: "You only need to do this once. All your GitHub repos will be available to deploy.",
    },
    {
      num: 2,
      title: "Go to Forge Hosting → Deploy App",
      desc: "Click Deploy App, select GitHub as your source, and you'll see all your repos. Pick the one you want to deploy.",
    },
    {
      num: 3,
      title: "Pick a name and branch",
      desc: "Give your app a subdomain name (like myapp.13moonforge.ai), confirm the branch, and click Deploy. We detect Node, Python, Docker, Go, Ruby, and static sites automatically.",
    },
    {
      num: 4,
      title: "Enable auto-deploy (optional)",
      desc: "Once deployed, open the Auto-Deploy tab and grab your webhook URL. Add it to your GitHub repo → Settings → Webhooks. Every push to main triggers an automatic redeploy.",
    },
    {
      num: 5,
      title: "Point your domain",
      desc: "In the Domain tab, add your custom domain (like myapp.com). Add an A record pointing to your server IP. SSL is issued automatically within minutes.",
    },
  ],
  heroku: [
    {
      num: 1,
      title: "Open your project's terminal",
      desc: "This works from any machine — your laptop, a CI runner, anywhere with git installed.",
    },
    {
      num: 2,
      title: "Create a repo on your Forge Git server",
      desc: `Go to https://${FORGE_GIT} → sign in → New Repository → name it → Create.`,
    },
    {
      num: 3,
      title: "Add Forge as a git remote and push",
      desc: "If your project already has git history, just add the forge remote and push. No need to reinitialize.",
      commands: [
        `# Replace YOUR-TOKEN, YOUR-USERNAME, and REPO-NAME`,
        `git remote add forge https://YOUR-USERNAME:YOUR-TOKEN@${FORGE_GIT}/YOUR-USERNAME/REPO-NAME.git`,
        "git push forge main",
        "",
        "# If your default branch is master:",
        "git push forge master:main",
      ],
    },
    {
      num: 4,
      title: "Set your environment variables",
      desc: "In Forge Hosting → your app → Env Vars tab, add any secrets your app needs (DATABASE_URL, API keys, etc.). Changes take effect on the next redeploy.",
    },
    {
      num: 5,
      title: "Deploy via Forge Hosting",
      desc: "Select your repo in Forge Hosting, deploy, and point your domain. You're done — no monthly Heroku bill.",
    },
  ],
  local: [
    {
      num: 1,
      title: "Make sure git is installed",
      desc: "Open your terminal and confirm git is installed. If you're on Windows, use Git Bash.",
      commands: ["git --version"],
    },
    {
      num: 2,
      title: "Create a repo on your Forge Git server",
      desc: `Go to https://${FORGE_GIT} → New Repository → name it → Create. Keep the page open, you'll need the repo name.`,
    },
    {
      num: 3,
      title: "Initialize git in your project folder and push",
      desc: "Run these from inside your project directory. Replace the placeholders with your info.",
      commands: [
        "cd /path/to/your-project",
        "git init",
        "git add .",
        'git commit -m "Moving to Freedom Center"',
        `# Replace YOUR-TOKEN, YOUR-USERNAME, REPO-NAME`,
        `git remote add forge https://YOUR-USERNAME:YOUR-TOKEN@${FORGE_GIT}/YOUR-USERNAME/REPO-NAME.git`,
        "git push forge HEAD:main",
      ],
    },
    {
      num: 4,
      title: "Add a Dockerfile if your app needs one",
      desc: "If your app doesn't have a Dockerfile, Forge auto-detects Node.js, Python, Go, Ruby, and static HTML using Nixpacks. For anything else, add a Dockerfile to the root of your project.",
      commands: [
        "# Example minimal Dockerfile for a Node.js app:",
        "# FROM node:20-alpine",
        "# WORKDIR /app",
        "# COPY package*.json ./",
        "# RUN npm install",
        "# COPY . .",
        "# EXPOSE 3000",
        '# CMD ["node", "server.js"]',
      ],
    },
    {
      num: 5,
      title: "Deploy via Forge Hosting",
      desc: "Pick your repo in Forge Hosting, set any env vars your app needs, and deploy. Add your domain when ready.",
    },
  ],
};

const PLATFORM_LABELS: Record<Platform, { label: string; icon: React.ReactNode }> = {
  replit:  { label: "From Replit",          icon: <Code2 size={14} />        },
  github:  { label: "From GitHub",          icon: <Github size={14} />       },
  heroku:  { label: "From Heroku / Render", icon: <Package size={14} />      },
  local:   { label: "From Your Computer",   icon: <Terminal size={14} />     },
};

const PROMISES = [
  { icon: <Lock size={18} className="text-green-400" />,    title: "Never shut down",     desc: "We don't pull the rug. Your app runs as long as you're paying." },
  { icon: <Infinity size={18} className="text-green-400" />, title: "Yours forever",       desc: "Your code, your server, your domain. We're just the crew." },
  { icon: <Heart size={18} className="text-green-400" />,   title: "Affordable monthly",  desc: "Priced for builders, not for enterprise. No surprise bills." },
  { icon: <Globe size={18} className="text-green-400" />,   title: "Your own domain",     desc: "Bring your domain. SSL auto-provisioned. Done in minutes." },
  { icon: <Zap size={18} className="text-green-400" />,     title: "Auto-deploy on push", desc: "Every git push triggers a redeploy. Ship without thinking about it." },
  { icon: <Server size={18} className="text-green-400" />,  title: "Your own server",     desc: "We run on your VPS — Hetzner, Vultr, DigitalOcean, anywhere." },
];

export default function FreedomCenter() {
  const [platform, setPlatform] = useState<Platform>("replit");
  const steps = platformSteps[platform];

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 px-4 py-8 max-w-4xl mx-auto">

      {/* Hero */}
      <div className="mb-10 text-center">
        <div className="inline-flex items-center gap-2 mb-4 px-4 py-1.5 rounded-full border border-green-500/30 bg-green-500/10">
          <ShieldCheck size={14} className="text-green-400" />
          <span className="text-xs font-semibold text-green-400 tracking-wide uppercase">Freedom Center</span>
        </div>
        <h1 className="text-4xl font-black text-white mb-3">
          Move Your App Here.{" "}
          <span className="text-green-400">We'll Never Shut You Down.</span>
        </h1>
        <p className="text-base text-zinc-400 max-w-2xl mx-auto">
          Affordable monthly hosting on your own server. Your code, your domain, your data.
          No platform can pull the plug — because it runs on your machine.
        </p>
        <div className="flex items-center justify-center gap-3 mt-5">
          <Link href="/forge-hosting">
            <Button className="bg-green-600 hover:bg-green-500 text-white">
              <Server size={14} className="mr-2" /> Go to Forge Hosting
            </Button>
          </Link>
          <Link href="/pricing">
            <Button variant="outline" className="border-zinc-700 text-zinc-300 hover:bg-zinc-800">
              See Pricing
            </Button>
          </Link>
        </div>
      </div>

      {/* The Promise */}
      <div className="mb-10">
        <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
          <ShieldCheck size={16} className="text-green-400" />
          What You Get
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {PROMISES.map(p => (
            <div key={p.title} className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-4">
              <div className="mb-2">{p.icon}</div>
              <p className="text-sm font-semibold text-white mb-1">{p.title}</p>
              <p className="text-xs text-zinc-500 leading-relaxed">{p.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Migration Guide */}
      <div className="mb-10">
        <h2 className="text-lg font-bold text-white mb-1 flex items-center gap-2">
          <GitBranch size={16} className="text-green-400" />
          Move Your App — Step by Step
        </h2>
        <p className="text-sm text-zinc-500 mb-4">Pick where your code lives today.</p>

        {/* Platform tabs */}
        <div className="flex flex-wrap gap-2 mb-6">
          {(Object.keys(PLATFORM_LABELS) as Platform[]).map(p => (
            <button
              key={p}
              onClick={() => setPlatform(p)}
              className={cn(
                "flex items-center gap-1.5 px-3 py-2 rounded-lg border text-xs font-medium transition-colors",
                platform === p
                  ? "border-green-500/50 bg-green-500/10 text-green-300"
                  : "border-zinc-700 text-zinc-400 hover:border-zinc-600 hover:text-zinc-200"
              )}
            >
              {PLATFORM_LABELS[p].icon}
              {PLATFORM_LABELS[p].label}
            </button>
          ))}
        </div>

        {/* Steps */}
        <div className="space-y-4">
          {steps.map(step => (
            <div key={step.num} className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-5">
              <div className="flex items-start gap-4">
                <div className="w-7 h-7 rounded-full bg-green-500/20 border border-green-500/40 flex items-center justify-center shrink-0 mt-0.5">
                  <span className="text-xs font-bold text-green-400">{step.num}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-white mb-1">{step.title}</p>
                  <p className="text-xs text-zinc-400 leading-relaxed">{step.desc}</p>
                  {step.note && (
                    <div className="mt-2 flex items-start gap-2 rounded-lg border border-green-500/20 bg-green-500/5 p-2.5">
                      <AlertCircle size={12} className="text-green-400 mt-0.5 shrink-0" />
                      <p className="text-[11px] text-green-300/80">{step.note}</p>
                    </div>
                  )}
                  {step.commands && <CodeBlock commands={step.commands} />}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* After pushing CTA */}
        <div className="mt-6 rounded-xl border border-green-500/30 bg-green-500/5 p-5 flex items-center gap-4">
          <div className="w-10 h-10 rounded-full bg-green-500/20 flex items-center justify-center shrink-0">
            <Server size={18} className="text-green-400" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-semibold text-green-300 mb-0.5">Code pushed? You're halfway there.</p>
            <p className="text-xs text-zinc-400">Head to Forge Hosting, click Deploy App, pick your repo — we detect the stack and have you live in under 2 minutes.</p>
          </div>
          <Link href="/forge-hosting">
            <Button size="sm" className="bg-green-600 hover:bg-green-500 text-white shrink-0">
              <ArrowRight size={13} className="mr-1.5" /> Deploy Now
            </Button>
          </Link>
        </div>
      </div>

      {/* Pricing Answer */}
      <div className="mb-10">
        <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
          <Heart size={16} className="text-green-400" />
          Pricing — Simple and Honest
        </h2>
        <div className="rounded-xl border border-green-500/30 bg-zinc-900/60 p-6">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <p className="text-2xl font-black text-white mb-1">
                Included with Forge <span className="text-green-400">Hosting</span>
              </p>
              <p className="text-sm text-zinc-400 max-w-lg">
                Freedom Center is built into your Forge Hosting plan. One monthly price covers your apps,
                your domains, auto-deploy, logs, env vars, and databases. No surprise charges.
                We'll never raise your price without warning, and we'll never shut you down without 90 days' notice.
              </p>
            </div>
          </div>

          <div className="mt-5 grid grid-cols-1 md:grid-cols-3 gap-3">
            {[
              { what: "Apps deployed",    val: "Unlimited" },
              { what: "Custom domains",   val: "Unlimited" },
              { what: "Auto-deploy",      val: "Included"  },
              { what: "Env var manager",  val: "Included"  },
              { what: "Log viewer",       val: "Included"  },
              { what: "Postgres DBs",     val: "Included"  },
            ].map(row => (
              <div key={row.what} className="flex items-center justify-between rounded-lg border border-zinc-800 bg-zinc-800/30 px-3 py-2.5">
                <span className="text-xs text-zinc-400">{row.what}</span>
                <span className="text-xs font-semibold text-green-400">{row.val}</span>
              </div>
            ))}
          </div>

          <div className="mt-4 flex gap-3">
            <Link href="/pricing">
              <Button size="sm" className="bg-green-600 hover:bg-green-500 text-white">
                See Full Pricing <ChevronRight size={13} className="ml-1" />
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* Quick links */}
      <div>
        <p className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider mb-3">Quick Links</p>
        <div className="grid grid-cols-2 gap-3">
          {[
            { href: "/forge-hosting", label: "Forge Hosting",    desc: "Manage your deployed apps",         icon: <Server size={14} /> },
            { href: "/github",        label: "Connect GitHub",   desc: "Link your GitHub account",          icon: <Github size={14} /> },
            { href: "/secrets",       label: "API Keys",         desc: "Store env vars securely",           icon: <Lock size={14} />   },
            { href: "/sovereign",     label: "Self-Host Guide",  desc: "The 13-point sovereignty standard", icon: <ShieldCheck size={14} /> },
          ].map(link => (
            <Link key={link.href} href={link.href}>
              <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-4 hover:border-green-500/30 hover:bg-green-500/5 transition-colors cursor-pointer flex items-center gap-3">
                <span className="text-green-400">{link.icon}</span>
                <div>
                  <p className="text-xs font-semibold text-zinc-200">{link.label}</p>
                  <p className="text-[11px] text-zinc-500">{link.desc}</p>
                </div>
                <ChevronRight size={13} className="text-zinc-600 ml-auto" />
              </div>
            </Link>
          ))}
        </div>
      </div>

    </div>
  );
}
