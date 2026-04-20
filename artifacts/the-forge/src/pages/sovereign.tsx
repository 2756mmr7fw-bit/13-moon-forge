import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import {
  Shield, CheckCircle2, Circle, XCircle, Wand2, ExternalLink,
  Container, Key, Database, Activity, Settings, Clock, Globe,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface Criterion {
  id: string;
  icon: React.ComponentType<{ size: number; className?: string }>;
  title: string;
  description: string;
  howTo: string;
  checkQuestion: string;
}

const CRITERIA: Criterion[] = [
  {
    id: "docker",
    icon: Container,
    title: "Docker-native",
    description: "The app runs in a standard Docker container or a docker-compose stack. No platform-specific runtimes, buildpacks, or proprietary infrastructure required.",
    howTo: "Write a multi-stage Dockerfile. Use the Forge Dockerfile Generator to get one tailored to your stack.",
    checkQuestion: "Does your app have a Dockerfile (or docker-compose.yml) that builds and runs without any platform-specific setup?",
  },
  {
    id: "env",
    icon: Key,
    title: "Portable environment variables",
    description: "No platform-specific env vars anywhere in the code. All configuration is injected through standard environment variables with portable names.",
    howTo: "Run the Forge Env Fixer to rename all REPLIT_*, HEROKU_*, RAILWAY_*, RENDER_* vars to portable equivalents.",
    checkQuestion: "Does your app's code reference zero platform-specific env vars (REPLIT_DOMAINS, HEROKU_DYNO, RAILWAY_PROJECT_NAME, etc.)?",
  },
  {
    id: "auth",
    icon: Shield,
    title: "Standard authentication",
    description: "Auth uses a portable standard — OpenID Connect, OAuth 2.0, JWT, or a library like Clerk, Better-Auth, or Lucia. No platform-specific auth providers.",
    howTo: "Replace Replit Auth, Heroku SSO, or any other platform-tied auth with Clerk (recommended) or Better-Auth.",
    checkQuestion: "Can your auth system run on any server without requiring a specific platform's identity provider?",
  },
  {
    id: "data",
    icon: Database,
    title: "Portable data",
    description: "Data lives in standard, portable systems. Postgres (dump/restore portable). Object storage is S3-compatible. No proprietary key-value stores or managed databases that lock your data.",
    howTo: "Use standard Postgres. Replace @replit/database with Redis or Postgres. Replace proprietary blob stores with Cloudflare R2 or any S3-compatible provider.",
    checkQuestion: "Can you move your database and file storage to a new provider using standard tools (pg_dump, s3 sync)?",
  },
  {
    id: "health",
    icon: Activity,
    title: "Health check endpoint",
    description: "The app exposes a GET /health endpoint that returns HTTP 200 when the app is running correctly. Used by load balancers, Coolify, and monitoring tools.",
    howTo: "Add a simple route: app.get('/health', (req, res) => res.json({ ok: true })).",
    checkQuestion: "Does GET /health return 200 when the app is running?",
  },
  {
    id: "config",
    icon: Settings,
    title: "Config-driven",
    description: "All configuration — database URL, app domain, secret keys, feature flags — comes from environment variables. Nothing is hardcoded. No platform-specific config files.",
    howTo: "Remove all hardcoded values. Replace .replit, Procfile, render.yaml, railway.json with standard Dockerfile/docker-compose.",
    checkQuestion: "Can you move the app to a new server by only changing environment variables?",
  },
  {
    id: "portable",
    icon: Clock,
    title: "Migratable in under 1 hour",
    description: "A technically literate person can move this app to a new server in under 60 minutes using documented tools. No tribal knowledge required.",
    howTo: "Document your deployment in a DEPLOY.md. Use the Migration Hub tools so the process is repeatable. Test it by migrating to staging.",
    checkQuestion: "Could a new engineer on your team migrate this app to a new server in under an hour using your documentation?",
  },
];

const SEAL_BADGE = `<!-- Sovereign Stack Certified -->
<a href="https://13moonforge.ai/sovereign" title="Sovereign Stack Certified">
  <img src="https://13moonforge.ai/badges/sovereign-seal.svg" alt="Sovereign Stack Certified" height="40" />
</a>`;

export default function SovereignStack() {
  const [answers, setAnswers] = useState<Record<string, boolean | null>>({});
  const [copied, setCopied] = useState(false);

  const toggle = (id: string, val: boolean) => {
    setAnswers(a => ({ ...a, [id]: a[id] === val ? null : val }));
  };

  const score = CRITERIA.filter(c => answers[c.id] === true).length;
  const answered = CRITERIA.filter(c => answers[c.id] !== undefined && answers[c.id] !== null).length;
  const allPassed = score === CRITERIA.length;
  const noneAnswered = answered === 0;

  const copyBadge = () => {
    navigator.clipboard.writeText(SEAL_BADGE);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="max-w-4xl mx-auto animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex items-start gap-4 mb-8">
        <div className="bg-amber-900/30 rounded-xl p-3 shrink-0 border border-amber-800/40">
          <Shield className="w-7 h-7 text-amber-400" />
        </div>
        <div>
          <h1 className="text-2xl font-black tracking-tight flex items-center gap-3">
            The Sovereign Stack
            <Badge className="text-[10px] font-bold tracking-wider bg-amber-900/40 text-amber-300 border-amber-700">
              STANDARD
            </Badge>
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Seven criteria for apps that are truly portable, self-hostable, and owned by the people who built them.
          </p>
        </div>
      </div>

      {/* Intro */}
      <div className="rounded-xl border border-border bg-card p-6 mb-8 max-w-2xl">
        <p className="text-sm leading-relaxed text-muted-foreground">
          "Sovereign" doesn't mean complicated. It means your app runs on <em>your</em> server, your data belongs to <em>you</em>, and you can move it anywhere without asking permission. The Sovereign Stack is a simple seven-point checklist. Apps that pass all seven earn the Sovereign Seal — a badge of real portability.
        </p>
        <p className="text-sm leading-relaxed text-muted-foreground mt-3">
          Sovereign Digital builds all of its apps to this standard. The Migration Hub tools are designed to bring your apps here too.
        </p>
      </div>

      {/* Criteria */}
      <div className="space-y-4 mb-10">
        <h2 className="font-black text-lg">The 7 Criteria</h2>
        {CRITERIA.map((c, i) => (
          <div key={c.id} className={cn(
            "rounded-xl border p-5 transition-all",
            answers[c.id] === true  && "border-green-800/50 bg-green-900/10",
            answers[c.id] === false && "border-red-800/40 bg-red-900/5",
            answers[c.id] == null   && "border-border bg-card",
          )}>
            <div className="flex items-start gap-4">
              <div className={cn(
                "shrink-0 w-9 h-9 rounded-lg flex items-center justify-center border",
                answers[c.id] === true  && "bg-green-600/20 border-green-600/40 text-green-400",
                answers[c.id] === false && "bg-red-600/20 border-red-600/40 text-red-400",
                answers[c.id] == null   && "bg-muted/30 border-border text-muted-foreground",
              )}>
                <c.icon size={18} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-[10px] font-black text-muted-foreground/50">{i + 1}</span>
                  <h3 className="font-bold">{c.title}</h3>
                </div>
                <p className="text-sm text-muted-foreground mb-3">{c.description}</p>

                <div className="rounded-lg bg-muted/20 border border-border/50 px-3 py-2 text-xs text-muted-foreground mb-3">
                  <span className="font-semibold text-foreground">How to get there: </span>
                  {c.howTo}
                </div>

                {/* Self-assessment */}
                <div>
                  <p className="text-xs font-medium mb-2">{c.checkQuestion}</p>
                  <div className="flex gap-2">
                    <button
                      onClick={() => toggle(c.id, true)}
                      className={cn(
                        "flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium transition-all",
                        answers[c.id] === true
                          ? "border-green-600 bg-green-600/20 text-green-300"
                          : "border-border text-muted-foreground hover:border-green-600/50 hover:text-green-400",
                      )}
                    >
                      <CheckCircle2 size={12} /> Yes
                    </button>
                    <button
                      onClick={() => toggle(c.id, false)}
                      className={cn(
                        "flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium transition-all",
                        answers[c.id] === false
                          ? "border-red-600 bg-red-600/20 text-red-300"
                          : "border-border text-muted-foreground hover:border-red-600/50 hover:text-red-400",
                      )}
                    >
                      <XCircle size={12} /> Not yet
                    </button>
                    {answers[c.id] === null && (
                      <button
                        onClick={() => toggle(c.id, null as unknown as boolean)}
                        className="text-xs text-muted-foreground hover:text-foreground transition-colors px-1"
                      >
                        Clear
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Score */}
      {!noneAnswered && (
        <div className={cn(
          "rounded-xl border p-6 mb-8 transition-all",
          allPassed ? "border-amber-700/50 bg-amber-900/10" : "border-border bg-card",
        )}>
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="font-black text-2xl">{score} / {CRITERIA.length}</p>
              <p className="text-sm text-muted-foreground">criteria passed</p>
            </div>
            {allPassed && (
              <div className="text-right">
                <Shield size={40} className="text-amber-400 ml-auto mb-1" />
                <Badge className="bg-amber-900/40 text-amber-300 border-amber-700 text-xs font-bold">
                  SOVEREIGN CERTIFIED
                </Badge>
              </div>
            )}
          </div>

          {/* Progress bar */}
          <div className="w-full bg-muted/30 rounded-full h-2 mb-4">
            <div
              className={cn("h-2 rounded-full transition-all", allPassed ? "bg-amber-500" : "bg-primary")}
              style={{ width: `${(score / CRITERIA.length) * 100}%` }}
            />
          </div>

          {allPassed ? (
            <div className="space-y-3">
              <p className="text-sm font-semibold text-amber-300">Your app meets the Sovereign Stack standard.</p>
              <p className="text-sm text-muted-foreground">Add the Sovereign Seal badge to your repo's README to show it's truly portable and self-hostable.</p>
              <div className="rounded-lg bg-black/40 border border-border p-3 font-mono text-xs text-muted-foreground">
                <pre className="whitespace-pre-wrap">{SEAL_BADGE}</pre>
              </div>
              <Button onClick={copyBadge} variant="outline" size="sm" className="gap-2">
                <Globe size={13} />
                {copied ? "Copied!" : "Copy Badge HTML"}
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                {CRITERIA.filter(c => answers[c.id] === false).length > 0 && (
                  <>
                    You have{" "}
                    <strong className="text-foreground">
                      {CRITERIA.filter(c => answers[c.id] === false).length} item{CRITERIA.filter(c => answers[c.id] === false).length > 1 ? "s" : ""} to fix.
                    </strong>{" "}
                    The Migration Hub has a tool for every one of them.
                  </>
                )}
              </p>
              <div className="flex gap-3">
                <Link href="/wizard">
                  <Button size="sm" className="gap-2"><Wand2 size={13} /> Start Migration Wizard</Button>
                </Link>
                <Link href="/migration">
                  <Button size="sm" variant="outline" className="gap-2">Migration Hub <ExternalLink size={11} /></Button>
                </Link>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Sovereign Digital commitment */}
      <div className="rounded-xl border border-border bg-card p-6 max-w-2xl">
        <h3 className="font-bold mb-2 flex items-center gap-2">
          <Shield size={16} className="text-amber-400" />
          Sovereign Digital's commitment
        </h3>
        <p className="text-sm text-muted-foreground leading-relaxed">
          Every app in the Sovereign Digital catalog is built to this standard. Forge Builder itself is sovereign — you can run it on your own Hetzner server, pointed at your own domain, with your own Postgres database. We eat our own cooking.
        </p>
        <p className="text-sm text-muted-foreground leading-relaxed mt-2">
          The goal of the Sovereign Stack isn't to make life harder for developers — it's to make switching costs zero. If you want to leave any platform (including us), you should be able to. That's what trust looks like.
        </p>
        <a
          href="https://thepeoplestownsq.com"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 text-sm text-primary mt-4 hover:underline font-medium"
        >
          Learn more at the Town Square <ExternalLink size={12} />
        </a>
      </div>
    </div>
  );
}
