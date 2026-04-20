import { useState, useRef } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  ArrowRightLeft, FileText, Copy, Download, RotateCcw, ExternalLink,
  AlertTriangle, Code2, Container, Globe, GitBranch, SlidersHorizontal, Database,
} from "lucide-react";
import { cn } from "@/lib/utils";

const API_BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

function getUserId() {
  let id = localStorage.getItem("13moonforge_user_id");
  if (!id) { id = crypto.randomUUID(); localStorage.setItem("13moonforge_user_id", id); }
  return id;
}

interface FieldDef {
  key: string;
  label: string;
  type: "text" | "textarea";
  required?: boolean;
  placeholder?: string;
}

interface ToolDef {
  id: string;
  label: string;
  icon: React.ComponentType<{ size: number; className?: string }>;
  badge?: string;
  description: string;
  endpoint: string;
  outputLabel: string;
  fields: FieldDef[];
}

const TOOLS: ToolDef[] = [
  {
    id: "audit",
    label: "Audit",
    icon: ArrowRightLeft,
    badge: "Start Here",
    description: "Full migration report — dependencies, env vars, auth callsites, hardcoded URLs, infrastructure requirements, Dockerfile, and migration checklist. Start every migration here.",
    endpoint: "/api/migration/audit",
    outputLabel: "Audit Report",
    fields: [
      { key: "appName",     label: "App Name",                              type: "text",     required: false, placeholder: "e.g. 13 Moon Forge Builder" },
      { key: "packageJson", label: "package.json",                          type: "textarea", required: true,  placeholder: '{\n  "name": "my-app",\n  "dependencies": { ... }\n}' },
      { key: "envExample",  label: ".env / .env.example",                   type: "textarea", required: false, placeholder: "DATABASE_URL=\nREPLIT_DOMAINS=\nSESSION_SECRET=" },
      { key: "schemaFile",  label: "Database schema (drizzle/prisma/sql)",  type: "textarea", required: false, placeholder: "export const users = pgTable('users', { ... })" },
      { key: "sourceFiles", label: "Source files (paste key files)",        type: "textarea", required: false, placeholder: "// paste src/index.ts, auth.ts, storage.ts, etc.\n// separate multiple files with a comment header" },
    ],
  },
  {
    id: "rewrite",
    label: "Code Rewriter",
    icon: Code2,
    description: "Paste any Replit-specific file. Forge rewrites it end-to-end — @replit/* imports, Replit auth, object storage, REPLIT_DOMAINS — all replaced with portable equivalents ready to drop in.",
    endpoint: "/api/migration/rewrite",
    outputLabel: "Rewritten Code",
    fields: [
      { key: "code",    label: "Code to rewrite",              type: "textarea", required: true,  placeholder: "// paste the file with @replit/* imports, replitAuth(), REPLIT_DOMAINS, etc.\n// Forge will rewrite the complete file — not just diffs" },
      { key: "context", label: "What this code does (optional)", type: "textarea", required: false, placeholder: "e.g. This is our auth middleware — it checks Replit session tokens and sets req.user" },
    ],
  },
  {
    id: "docker",
    label: "Dockerfile",
    icon: Container,
    description: "Describe your stack and get a production-ready multi-stage Dockerfile, docker-compose.yml with Postgres/Redis, .dockerignore, and setup instructions.",
    endpoint: "/api/migration/docker",
    outputLabel: "Generated Files",
    fields: [
      { key: "appName",      label: "App Name",                type: "text",     required: false, placeholder: "my-app" },
      { key: "stack",        label: "Stack",                   type: "text",     required: true,  placeholder: "e.g. Express API + React (Vite) + Postgres 16 + Redis" },
      { key: "buildCommand", label: "Build command",           type: "text",     required: false, placeholder: "pnpm build" },
      { key: "startCommand", label: "Start command",           type: "text",     required: false, placeholder: "node dist/index.js" },
      { key: "packageJson",  label: "package.json (optional)", type: "textarea", required: false, placeholder: "Paste for accurate Node version and port detection" },
    ],
  },
  {
    id: "nginx",
    label: "Nginx Config",
    icon: Globe,
    description: "Enter your domain and upstream port. Get a complete nginx config: HTTP→HTTPS redirect, Let's Encrypt SSL, security headers, gzip, WebSocket support, and the certbot command.",
    endpoint: "/api/migration/nginx",
    outputLabel: "nginx.conf",
    fields: [
      { key: "domain",       label: "Domain",              type: "text",     required: true,  placeholder: "myapp.com" },
      { key: "upstreamPort", label: "App port",            type: "text",     required: true,  placeholder: "3000" },
      { key: "appType",      label: "App type",            type: "text",     required: false, placeholder: "e.g. Node.js API + React SPA, Express + static files" },
      { key: "extras",       label: "Special requirements", type: "textarea", required: false, placeholder: "WebSocket support, large file uploads (specify size), multiple upstreams, rate limiting, etc." },
    ],
  },
  {
    id: "cicd",
    label: "CI/CD Pipeline",
    icon: GitBranch,
    description: "Generate a GitHub Actions deploy workflow for Hetzner via Coolify (webhook) or direct SSH — including all required secrets and setup steps.",
    endpoint: "/api/migration/cicd",
    outputLabel: ".github/workflows/deploy.yml",
    fields: [
      { key: "stack",        label: "Stack",               type: "text",     required: true,  placeholder: "e.g. Node 20 + pnpm + Docker" },
      { key: "deployMethod", label: "Deploy method",       type: "text",     required: false, placeholder: "Coolify (default) or SSH" },
      { key: "extras",       label: "Extra steps",         type: "textarea", required: false, placeholder: "Run tests, lint, push Docker image to registry, Slack notification, etc." },
    ],
  },
  {
    id: "env",
    label: "Env Fixer",
    icon: SlidersHorizontal,
    description: "Paste your current .env. Forge renames every Replit-specific variable, removes dead ones, and produces a clean annotated .env.template with portable names and placeholder values.",
    endpoint: "/api/migration/env",
    outputLabel: ".env.template",
    fields: [
      { key: "envContent", label: "Current .env", type: "textarea", required: true, placeholder: "DATABASE_URL=postgresql://neondb.io/...\nREPLIT_DOMAINS=abc123.id.repl.co\nSESSION_SECRET=abc123\nREPL_ID=..." },
    ],
  },
  {
    id: "pgdump",
    label: "DB Migration",
    icon: Database,
    description: "Get exact pg_dump and pg_restore commands for your database, a transfer plan, post-migration verification queries, rollback strategy, and zero-downtime guidance.",
    endpoint: "/api/migration/pgdump",
    outputLabel: "Migration Plan",
    fields: [
      { key: "dbName",     label: "Database name",         type: "text",     required: true,  placeholder: "myapp_production" },
      { key: "schemaFile", label: "Schema (optional)",     type: "textarea", required: false, placeholder: "Paste drizzle/prisma schema or CREATE TABLE statements" },
      { key: "extras",     label: "Special requirements",  type: "textarea", required: false, placeholder: "Large tables (>10GB), BLOB/file data, Postgres extensions, zero-downtime required, etc." },
    ],
  },
];

type Status = "idle" | "running" | "done" | "error";

function ToolPanel({ tool }: { tool: ToolDef }) {
  const [fields, setFields] = useState<Record<string, string>>({});
  const [output, setOutput]   = useState("");
  const [status, setStatus]   = useState<Status>("idle");
  const [subscribeUrl, setSubscribeUrl] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const set = (key: string, val: string) => setFields(f => ({ ...f, [key]: val }));

  const requiredField = tool.fields.find(f => f.required);
  const canRun = !!fields[requiredField?.key ?? ""]?.trim() && status !== "running";

  const run = async () => {
    setOutput(""); setStatus("running"); setSubscribeUrl(null);
    abortRef.current = new AbortController();
    let terminal = false;

    try {
      const res = await fetch(`${API_BASE}${tool.endpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-user-id": getUserId() },
        body: JSON.stringify(fields),
        signal: abortRef.current.signal,
      });

      if (!res.body) throw new Error("No response body");
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
            if (ev.type === "chunk") {
              setOutput(p => p + ev.content);
            } else if (ev.type === "done") {
              terminal = true;
              setStatus("done");
            } else if (ev.type === "subscription_required") {
              terminal = true;
              setSubscribeUrl(ev.subscribeUrl ?? "https://thepeoplestownsq.com/moons/forge?ref=forge");
              setStatus("error");
              setOutput("🔒 " + (ev.error ?? "Forge subscription required."));
            }
          } catch { /* ignore parse errors */ }
        }
      }
      if (!terminal) setStatus("done");
    } catch (err: unknown) {
      if ((err as Error).name === "AbortError") {
        setStatus("idle");
      } else {
        setStatus("error");
        setOutput(p => p + "\n\n[Connection error — try again]");
      }
    }
  };

  const reset = () => {
    abortRef.current?.abort();
    setOutput(""); setStatus("idle"); setSubscribeUrl(null);
  };

  const ext = ["rewrite", "docker", "nginx", "cicd"].includes(tool.id) ? "txt" : "md";

  const download = () => {
    const blob = new Blob([output], { type: "text/plain" });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement("a");
    a.href = url;
    a.download = `forge-${tool.id}.${ext}`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Inputs */}
      <div className="space-y-4">
        {tool.fields.map(f => (
          <div key={f.key}>
            <Label className="text-sm font-semibold mb-1.5 flex items-center gap-2">
              {f.label}
              {f.required
                ? <span className="text-[10px] font-bold text-primary uppercase tracking-wider">Required</span>
                : <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Optional</span>
              }
            </Label>
            {f.type === "text" ? (
              <Input
                value={fields[f.key] ?? ""}
                onChange={e => set(f.key, e.target.value)}
                placeholder={f.placeholder}
                className="bg-card border-border"
              />
            ) : (
              <Textarea
                value={fields[f.key] ?? ""}
                onChange={e => set(f.key, e.target.value)}
                placeholder={f.placeholder}
                className="bg-card border-border font-mono text-xs min-h-[110px] resize-y"
              />
            )}
          </div>
        ))}

        <div className="flex gap-2 pt-1">
          <Button onClick={run} disabled={!canRun} className="flex-1 gap-2">
            <FileText size={15} />
            {status === "running" ? "Forge is working…" : "Run"}
          </Button>
          {status !== "idle" && (
            <Button variant="outline" onClick={reset} size="icon">
              <RotateCcw size={14} />
            </Button>
          )}
        </div>

        {requiredField && !fields[requiredField.key]?.trim() && (
          <p className="text-xs text-muted-foreground flex items-center gap-1.5">
            <AlertTriangle size={11} className="text-amber-500" />
            {requiredField.label} is required to run.
          </p>
        )}
      </div>

      {/* Output */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold text-muted-foreground">{tool.outputLabel}</p>
          {output && status !== "running" && (
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => navigator.clipboard.writeText(output)} className="gap-1.5 h-7 text-xs">
                <Copy size={10} /> Copy
              </Button>
              <Button variant="outline" size="sm" onClick={download} className="gap-1.5 h-7 text-xs">
                <Download size={10} /> Save
              </Button>
            </div>
          )}
        </div>

        <div className={cn(
          "flex-1 rounded-xl border bg-card min-h-[460px] p-5 font-mono text-xs overflow-auto relative",
          status === "running" && "border-violet-800/50",
          status === "done"    && "border-green-800/40",
          status === "error"   && "border-red-800/40",
        )}>
          {!output && status === "idle" && (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-muted-foreground gap-3 text-center px-8">
              <tool.icon size={28} className="opacity-15" />
              <div>
                <p className="font-semibold text-sm mb-1">{tool.description.split(".")[0]}.</p>
                <p className="text-xs opacity-60">Fill in the fields and click Run.</p>
              </div>
            </div>
          )}

          {status === "running" && !output && (
            <span className="text-violet-400 flex items-center gap-2">
              <span className="animate-pulse">●</span> Forge is working…
            </span>
          )}

          {output && (
            <pre className="whitespace-pre-wrap leading-relaxed text-foreground/90">{output}</pre>
          )}

          {status === "running" && output && (
            <span className="inline-block w-2 h-3 bg-violet-400 animate-pulse ml-0.5 align-middle" />
          )}
        </div>

        {subscribeUrl && (
          <a
            href={subscribeUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-400 text-black text-xs font-bold hover:bg-amber-300 transition-colors self-start"
          >
            Subscribe on the Town Square <ExternalLink size={10} />
          </a>
        )}

        {status === "done" && (
          <p className="text-xs text-green-500 font-medium">
            ✓ Done — copy or save the output above.
          </p>
        )}
      </div>
    </div>
  );
}

export default function MigrationHub() {
  const [activeTab, setActiveTab] = useState("audit");
  const tool = TOOLS.find(t => t.id === activeTab) ?? TOOLS[0];

  return (
    <div className="max-w-5xl mx-auto animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex items-start gap-4 mb-6">
        <div className="bg-violet-900/40 rounded-xl p-3 shrink-0 border border-violet-800/40">
          <ArrowRightLeft className="w-7 h-7 text-violet-400" />
        </div>
        <div>
          <h1 className="text-2xl font-black tracking-tight flex items-center gap-3">
            Migration Hub
            <Badge className="text-[10px] font-bold tracking-wider bg-violet-900 text-violet-200 border-violet-700">
              REPLIT → SELF-HOSTED
            </Badge>
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Everything you need to move your apps off Replit — audit, rewrite code, generate Docker files, configure Nginx, set up CI/CD, fix env vars, and plan your database migration.
          </p>
        </div>
      </div>

      {/* Tab Bar */}
      <div className="flex gap-0.5 overflow-x-auto pb-px border-b border-border mb-6">
        {TOOLS.map(t => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id)}
            className={cn(
              "flex items-center gap-1.5 px-3 py-2.5 text-sm font-medium whitespace-nowrap transition-all border-b-2 -mb-px",
              activeTab === t.id
                ? "border-violet-400 text-violet-300"
                : "border-transparent text-muted-foreground hover:text-foreground hover:border-muted-foreground/30"
            )}
          >
            <t.icon size={14} />
            {t.label}
            {t.badge && (
              <span className="text-[9px] font-bold bg-primary text-primary-foreground px-1.5 py-0.5 rounded-full uppercase tracking-wide leading-none">
                {t.badge}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Tool description */}
      <p className="text-sm text-muted-foreground mb-5">{tool.description}</p>

      {/* Active tool — key forces remount on tab switch so state resets cleanly */}
      <ToolPanel key={activeTab} tool={tool} />
    </div>
  );
}
