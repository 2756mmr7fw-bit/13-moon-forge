import { useState, useRef } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowRightLeft, FileText, Copy, Download, RotateCcw, ExternalLink, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";

const API_BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

const SECTIONS = [
  { key: "packageJson",  label: "package.json",           required: true,  placeholder: '{\n  "name": "my-app",\n  "dependencies": { ... }\n}' },
  { key: "envExample",   label: ".env / .env.example",     required: false, placeholder: "DATABASE_URL=\nREPLIT_DOMAINS=\nSESSION_SECRET=" },
  { key: "schemaFile",   label: "Database schema (drizzle/prisma/sql)", required: false, placeholder: "export const usersTable = pgTable('users', { ... })" },
  { key: "sourceFiles",  label: "Source files (paste key files)", required: false, placeholder: "// paste src/index.ts, app.ts, or any files with auth/storage code\n// multiple files OK — separate with a comment line" },
];

function getUserId() {
  let id = localStorage.getItem("13moonforge_user_id");
  if (!id) { id = crypto.randomUUID(); localStorage.setItem("13moonforge_user_id", id); }
  return id;
}

export default function MigrationAudit() {
  const [appName, setAppName]     = useState("");
  const [fields, setFields]       = useState<Record<string, string>>({});
  const [output, setOutput]       = useState("");
  const [status, setStatus]       = useState<"idle" | "running" | "done" | "error">("idle");
  const [subscribeUrl, setSubscribeUrl] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const set = (key: string, val: string) => setFields(f => ({ ...f, [key]: val }));

  const run = async () => {
    if (!fields.packageJson?.trim()) return;
    setOutput(""); setStatus("running"); setSubscribeUrl(null);
    abortRef.current = new AbortController();

    try {
      const res = await fetch(`${API_BASE}/api/migration/audit`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-user-id": getUserId() },
        body: JSON.stringify({
          appName: appName.trim() || "Unknown App",
          packageJson: fields.packageJson ?? "",
          envExample:  fields.envExample  ?? "",
          schemaFile:  fields.schemaFile  ?? "",
          sourceFiles: fields.sourceFiles ?? "",
        }),
        signal: abortRef.current.signal,
      });

      if (!res.body) throw new Error("No response body");
      const reader = res.body.getReader();
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
            if (ev.type === "chunk")                setOutput(p => p + ev.content);
            else if (ev.type === "done")            setStatus("done");
            else if (ev.type === "subscription_required") {
              setSubscribeUrl(ev.subscribeUrl ?? "https://thepeoplestownsq.com/moons/forge?ref=forge");
              setStatus("error");
              setOutput("🔒 " + (ev.error ?? "Subscription required."));
            }
          } catch { /* ignore parse errors */ }
        }
      }
      if (status !== "error") setStatus("done");
    } catch (err: unknown) {
      if ((err as Error).name !== "AbortError") {
        setStatus("error");
        setOutput(p => p + "\n\n[Connection error — try again]");
      }
    }
  };

  const reset = () => {
    abortRef.current?.abort();
    setOutput(""); setStatus("idle"); setSubscribeUrl(null);
  };

  const copyReport = () => navigator.clipboard.writeText(output);

  const downloadReport = () => {
    const blob = new Blob([output], { type: "text/markdown" });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement("a");
    a.href = url;
    a.download = `${(appName || "app").toLowerCase().replace(/\s+/g, "-")}-migration-audit.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const canRun = !!fields.packageJson?.trim() && status !== "running";

  return (
    <div className="max-w-5xl mx-auto animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex items-start gap-4 mb-8">
        <div className="bg-violet-900/40 rounded-xl p-3 shrink-0 border border-violet-800/40">
          <ArrowRightLeft className="w-7 h-7 text-violet-400" />
        </div>
        <div>
          <h1 className="text-2xl font-black tracking-tight flex items-center gap-3">
            Migration Audit
            <Badge className="text-[10px] font-bold tracking-wider bg-violet-900 text-violet-200 border-violet-700">
              REPLIT → SELF-HOSTED
            </Badge>
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Paste your app's files. Forge audits every Replit dependency, env var, auth callsite, and hardcoded URL — then gives you a clean migration report.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left — Inputs */}
        <div className="space-y-5">
          <div>
            <Label htmlFor="appName" className="text-sm font-semibold mb-1.5 block">
              App Name
            </Label>
            <Input
              id="appName"
              value={appName}
              onChange={e => setAppName(e.target.value)}
              placeholder="e.g. 13 Moon Forge Builder"
              className="bg-card border-border"
            />
          </div>

          {SECTIONS.map(s => (
            <div key={s.key}>
              <Label className="text-sm font-semibold mb-1.5 flex items-center gap-2">
                {s.label}
                {s.required
                  ? <span className="text-[10px] font-bold text-primary uppercase tracking-wider">Required</span>
                  : <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Optional</span>
                }
              </Label>
              <Textarea
                value={fields[s.key] ?? ""}
                onChange={e => set(s.key, e.target.value)}
                placeholder={s.placeholder}
                className="bg-card border-border font-mono text-xs min-h-[100px] resize-y"
              />
            </div>
          ))}

          <div className="flex gap-2 pt-1">
            <Button
              onClick={run}
              disabled={!canRun}
              className="flex-1 gap-2"
            >
              <FileText size={16} />
              {status === "running" ? "Auditing…" : "Run Audit"}
            </Button>
            {status !== "idle" && (
              <Button variant="outline" onClick={reset} size="icon">
                <RotateCcw size={15} />
              </Button>
            )}
          </div>

          {!fields.packageJson?.trim() && (
            <p className="text-xs text-muted-foreground flex items-center gap-1.5">
              <AlertTriangle size={12} className="text-amber-500" />
              package.json is required — it's the foundation of the dependency audit.
            </p>
          )}
        </div>

        {/* Right — Output */}
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-muted-foreground">Audit Report</p>
            {output && status !== "running" && (
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={copyReport} className="gap-1.5 h-7 text-xs">
                  <Copy size={11} /> Copy
                </Button>
                <Button variant="outline" size="sm" onClick={downloadReport} className="gap-1.5 h-7 text-xs">
                  <Download size={11} /> .md
                </Button>
              </div>
            )}
          </div>

          <div className={cn(
            "flex-1 rounded-xl border bg-card min-h-[520px] p-5 font-mono text-xs overflow-auto relative",
            status === "running" && "border-violet-800/50",
            status === "done"    && "border-green-800/40",
            status === "error"   && "border-red-800/40",
          )}>
            {!output && status === "idle" && (
              <div className="absolute inset-0 flex flex-col items-center justify-center text-muted-foreground gap-3 text-center px-6">
                <ArrowRightLeft size={32} className="opacity-20" />
                <div>
                  <p className="font-semibold text-sm mb-1">Paste your files and run the audit</p>
                  <p className="text-xs opacity-70">Forge will produce a full markdown report — dependencies, env vars, auth callsites, hardcoded URLs, migration checklist, and a portable .env template.</p>
                </div>
              </div>
            )}

            {status === "running" && !output && (
              <div className="flex items-center gap-2 text-violet-400">
                <span className="animate-pulse">●</span>
                <span>Forge is reading your app…</span>
              </div>
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
              Subscribe on the Town Square <ExternalLink size={11} />
            </a>
          )}

          {status === "done" && (
            <p className="text-xs text-green-500 font-medium">
              ✓ Audit complete — copy or download the report above.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
