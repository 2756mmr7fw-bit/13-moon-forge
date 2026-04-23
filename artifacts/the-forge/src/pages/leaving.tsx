import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { LogOut, CheckSquare, Wand2, ExternalLink, ChevronRight, PackageOpen, Flame } from "lucide-react";
import { cn } from "@/lib/utils";

interface PlatformGuide {
  id: string;
  label: string;
  tagline: string;
  color: string;
  lockIns: { name: string; what: string; replace: string }[];
  checklist: string[];
  avgTime: string;
  difficulty: "Easy" | "Medium" | "Hard";
}

const GUIDES: PlatformGuide[] = [
  {
    id: "replit",
    label: "Leaving Replit",
    tagline: "The most common migration we see. Replit has solid lock-in hooks — here's exactly what to untangle.",
    color: "text-orange-400",
    avgTime: "2–4 hours per app",
    difficulty: "Medium",
    lockIns: [
      { name: "@replit/object-storage", what: "Proprietary file/blob storage with Replit's S3 backend", replace: "AWS S3 SDK v3 or Cloudflare R2 (S3-compatible)" },
      { name: "@replit/database",       what: "Replit's key-value store, not portable",                 replace: "Redis (ioredis) for key-value, or Postgres" },
      { name: "REPLIT_DOMAINS",         what: "Used for CORS allowed origins and cookie domains",        replace: "APP_DOMAIN env var pointing to your actual domain" },
      { name: "REPL_ID / REPL_SLUG",   what: "Internal Replit identifiers baked into some apps",        replace: "APP_NAME env var or remove if unused" },
      { name: "Replit Auth",            what: "OpenID Connect via Replit's identity provider",           replace: "Clerk, Better-Auth, or Lucia — all production-ready" },
      { name: ".replit / replit.nix",   what: "Replit-specific run config and Nix package definitions",  replace: "Dockerfile + docker-compose.yml" },
      { name: "Replit Secrets",         what: "In-browser secret management, no .env files",             replace: "Standard .env file with your hosting provider's secret management" },
    ],
    checklist: [
      "Run the audit tool on your package.json",
      "Identify all @replit/* imports and replace them",
      "Rename REPLIT_DOMAINS → APP_DOMAIN, remove REPL_ID/REPL_SLUG",
      "Swap Replit Auth for Clerk or Better-Auth",
      "Replace object storage calls with S3/R2 equivalents",
      "Replace .replit run config with Dockerfile",
      "Generate nginx config for your domain",
      "Set up GitHub Actions for deploys",
      "Run pg_dump and restore your database",
      "Verify health check endpoint on new server",
    ],
  },
  {
    id: "heroku",
    label: "Leaving Heroku",
    tagline: "Heroku's 2022 pricing changes sent thousands of apps scrambling. The exit is cleaner than most think.",
    color: "text-violet-400",
    avgTime: "1–3 hours per app",
    difficulty: "Easy",
    lockIns: [
      { name: "Procfile",                what: "Heroku's way of defining how to start your app",                  replace: "Dockerfile CMD instruction (e.g. CMD [\"node\", \"dist/index.js\"])" },
      { name: "Heroku Postgres",         what: "Managed Postgres add-on, standard pg under the hood",            replace: "Self-hosted Postgres in docker-compose or a managed provider (Neon, Supabase)" },
      { name: "Heroku Redis",            what: "Managed Redis add-on",                                           replace: "Self-hosted Redis in docker-compose or Upstash" },
      { name: "Buildpacks",              what: "Heroku auto-detects language and builds — no Dockerfile needed",  replace: "Write a Dockerfile (Forge generates one for you)" },
      { name: "Review Apps",             what: "Heroku spins up apps per PR automatically",                      replace: "GitHub Actions + Coolify webhooks per branch" },
      { name: "Heroku Scheduler",        what: "Cron job add-on",                                                replace: "Self-hosted cron in docker-compose or a simple node-cron script" },
    ],
    checklist: [
      "Convert Procfile to Dockerfile CMD",
      "Generate docker-compose.yml with Postgres and Redis",
      "Export Heroku Postgres: heroku pg:backups:capture && heroku pg:backups:download",
      "Restore dump to new Postgres instance",
      "Confirm DATABASE_URL format works with new host",
      "Replace Heroku Scheduler with node-cron or similar",
      "Generate nginx config for your domain",
      "Set up GitHub Actions deploy pipeline",
      "Update DNS to point to new server",
    ],
  },
  {
    id: "railway",
    label: "Leaving Railway",
    tagline: "Railway is nearly cloud-agnostic by design. Most apps migrate in under 2 hours.",
    color: "text-sky-400",
    avgTime: "1–2 hours per app",
    difficulty: "Easy",
    lockIns: [
      { name: "railway.json / railway.toml", what: "Railway's service config and build settings",                    replace: "Dockerfile + docker-compose.yml" },
      { name: "RAILWAY_* env vars",          what: "RAILWAY_PROJECT_NAME, RAILWAY_ENVIRONMENT, etc.",                replace: "APP_NAME, NODE_ENV — standard portable vars" },
      { name: "Private networking",          what: "Services talk via internal hostnames (app.railway.internal)",    replace: "Docker Compose service names (docker compose networking)" },
      { name: "Railway Volumes",             what: "Persistent disk volumes per service",                            replace: "Docker named volumes or S3-compatible object storage" },
      { name: "Railway CLI deploys",         what: "railway up deploys from local machine",                          replace: "GitHub Actions + Coolify webhook on push to main" },
    ],
    checklist: [
      "Replace railway.json with Dockerfile + docker-compose.yml",
      "Remove all RAILWAY_* env vars from code references",
      "Replace internal hostnames (.railway.internal) with docker-compose service names",
      "Move Railway Volumes to named Docker volumes or object storage",
      "Export your Railway Postgres database",
      "Generate nginx config",
      "Set up GitHub Actions CI/CD",
      "Update DNS",
    ],
  },
  {
    id: "render",
    label: "Leaving Render",
    tagline: "Render's render.yaml is well-documented and translates cleanly to docker-compose.",
    color: "text-emerald-400",
    avgTime: "1–3 hours per app",
    difficulty: "Easy",
    lockIns: [
      { name: "render.yaml",            what: "Render's infrastructure-as-code Blueprint file",                 replace: "docker-compose.yml (similar structure, different syntax)" },
      { name: "Render Disks",           what: "Persistent storage mounted to a service",                       replace: "Docker named volumes or Cloudflare R2 (S3-compatible)" },
      { name: "RENDER_* env vars",      what: "RENDER_SERVICE_ID, RENDER_EXTERNAL_URL, etc.",                  replace: "APP_URL, APP_NAME — standard vars" },
      { name: ".onrender.com URLs",     what: "Internal service-to-service calls via Render's hostnames",       replace: "Docker Compose service names for internal, APP_URL for external" },
      { name: "Render Cron Jobs",       what: "Scheduled jobs defined in render.yaml",                         replace: "node-cron, crontab, or a dedicated scheduler container" },
      { name: "Render Static Sites",    what: "Render serves static builds with CDN",                          replace: "Nginx serving /dist, or Cloudflare Pages for static assets" },
    ],
    checklist: [
      "Convert render.yaml services to docker-compose.yml",
      "Move Render Disks to Docker volumes or object storage",
      "Remove RENDER_* env vars from code",
      "Replace .onrender.com internal URLs with Docker Compose service names",
      "Export Render Postgres database (pg_dump)",
      "Replace Render cron jobs with node-cron or crontab",
      "Generate nginx config for static assets if applicable",
      "Set up GitHub Actions CI/CD",
    ],
  },
];

export default function Leaving() {
  const [active, setActive] = useState("replit");
  const guide = GUIDES.find(g => g.id === active) ?? GUIDES[0];

  const diffColor = {
    Easy:   "bg-green-900/30 text-green-400 border-green-800/40",
    Medium: "bg-amber-900/30 text-amber-400 border-amber-800/40",
    Hard:   "bg-red-900/30 text-red-400 border-red-800/40",
  }[guide.difficulty];

  return (
    <div className="max-w-4xl mx-auto animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex items-start gap-4 mb-6">
        <div className="bg-destructive/10 rounded-xl p-3 shrink-0 border border-destructive/20">
          <LogOut className="w-7 h-7 text-destructive" />
        </div>
        <div>
          <h1 className="text-2xl font-black tracking-tight">Platform Escape Routes</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Platform-specific migration guides. Find yours, understand what's got you hooked, and walk out clean.
          </p>
        </div>
      </div>

      {/* Forge Data Banner */}
      <div className="rounded-2xl border border-primary/25 bg-primary/5 p-5 mb-8 flex flex-col sm:flex-row items-start sm:items-center gap-5">
        <div className="w-12 h-12 rounded-xl bg-primary/15 flex items-center justify-center shrink-0">
          <PackageOpen size={22} className="text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-bold text-sm mb-1">Take everything Forge built with you</p>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Every document, plan, blueprint, goal sheet, and code file you created lives in your Workspace.
            Download it all as a ZIP — organized folders, markdown files, fully portable. Nothing is locked here.
          </p>
        </div>
        <div className="flex gap-2 shrink-0 flex-wrap">
          <Link href="/workspace">
            <Button className="gap-2 bg-primary text-white text-sm">
              <Flame size={14} /> Open Workspace
            </Button>
          </Link>
        </div>
      </div>

      {/* Platform tabs */}
      <div className="flex gap-0.5 overflow-x-auto pb-px border-b border-border mb-8">
        {GUIDES.map(g => (
          <button
            key={g.id}
            onClick={() => setActive(g.id)}
            className={cn(
              "px-4 py-2.5 text-sm font-medium whitespace-nowrap transition-all border-b-2 -mb-px",
              active === g.id
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground hover:border-muted-foreground/30",
            )}
          >
            {g.label.replace("Leaving ", "")}
          </button>
        ))}
      </div>

      {/* Guide content */}
      <div className="space-y-8">
        {/* Summary */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
          <div className="flex-1">
            <h2 className={cn("text-xl font-black mb-1", guide.color)}>{guide.label}</h2>
            <p className="text-sm text-muted-foreground">{guide.tagline}</p>
          </div>
          <div className="flex gap-3 shrink-0">
            <div className={cn("text-xs font-bold px-3 py-1.5 rounded-lg border", diffColor)}>
              {guide.difficulty}
            </div>
            <div className="text-xs font-medium px-3 py-1.5 rounded-lg border border-border bg-card text-muted-foreground">
              {guide.avgTime}
            </div>
          </div>
        </div>

        {/* Lock-in table */}
        <div>
          <h3 className="font-bold text-sm mb-3 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-red-500 inline-block" />
            What's got you hooked
          </h3>
          <div className="space-y-2">
            {guide.lockIns.map(item => (
              <div key={item.name} className="rounded-lg border border-border bg-card p-4">
                <div className="flex flex-col sm:flex-row sm:items-start gap-2 mb-2">
                  <code className="text-xs font-bold text-primary bg-primary/10 px-2 py-0.5 rounded shrink-0">
                    {item.name}
                  </code>
                  <p className="text-xs text-muted-foreground">{item.what}</p>
                </div>
                <div className="flex items-start gap-2">
                  <ChevronRight size={12} className="text-green-400 mt-0.5 shrink-0" />
                  <p className="text-xs text-green-300/80">{item.replace}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Checklist */}
        <div>
          <h3 className="font-bold text-sm mb-3 flex items-center gap-2">
            <CheckSquare size={14} className="text-primary" />
            Your escape checklist
          </h3>
          <div className="rounded-xl border border-border bg-card divide-y divide-border/50">
            {guide.checklist.map((item, i) => (
              <div key={item} className="flex items-start gap-3 px-4 py-3 text-sm">
                <span className="shrink-0 w-5 h-5 rounded-full bg-muted flex items-center justify-center text-[10px] font-black text-muted-foreground mt-0.5">
                  {i + 1}
                </span>
                {item}
              </div>
            ))}
          </div>
        </div>

        {/* CTA */}
        <div className="rounded-xl border border-primary/20 bg-primary/5 p-6 flex flex-col sm:flex-row items-start sm:items-center gap-4">
          <div className="flex-1">
            <p className="font-bold mb-1">Ready to start?</p>
            <p className="text-sm text-muted-foreground">
              The Migration Wizard walks you through this entire checklist step by step — audit first, then rewrites, then infrastructure, then deploy.
            </p>
          </div>
          <div className="flex gap-3 shrink-0 flex-wrap">
            <Link href="/wizard">
              <Button className="gap-2">
                <Wand2 size={15} /> Start Wizard
              </Button>
            </Link>
            <Link href="/migration">
              <Button variant="outline" className="gap-2">
                Migration Hub <ExternalLink size={12} />
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
