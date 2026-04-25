import { useState, useEffect } from "react";
import { getAuthToken } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Shield, ExternalLink, Copy, CheckCircle2, Zap, FileCode2,
  ArrowRight, Info, Wifi, WifiOff, Mail,
} from "lucide-react";
import { cn } from "@/lib/utils";

const API_BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

interface AntivirusStatus {
  connected: boolean;
  ingestUrl: string;
  antivirusUrl: string;
  antivirusReplit: string;
  instructions: string[];
}

async function authHeaders(): Promise<Record<string, string>> {
  const token = await getAuthToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

function CopyButton({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    await navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <button
      onClick={copy}
      title="Copy to clipboard"
      className="p-1.5 rounded hover:bg-muted transition-colors flex-shrink-0"
    >
      {copied
        ? <CheckCircle2 size={15} className="text-green-400" />
        : <Copy size={15} className="text-muted-foreground" />}
    </button>
  );
}

export default function AntivirusPage() {
  const [status, setStatus] = useState<AntivirusStatus | null>(null);
  const [pingStatus, setPingStatus] = useState<"idle" | "pinging" | "ok" | "fail">("idle");

  useEffect(() => {
    (async () => {
      try {
        const hdrs = await authHeaders();
        const r = await fetch(`${API_BASE}/api/antivirus/status`, { headers: hdrs });
        if (r.ok) setStatus(await r.json());
      } catch { /* ignore */ }
    })();
  }, []);

  const testConnection = async () => {
    setPingStatus("pinging");
    try {
      const r = await fetch(`${API_BASE}/api/antivirus/status`);
      setPingStatus(r.ok ? "ok" : "fail");
    } catch {
      setPingStatus("fail");
    }
    setTimeout(() => setPingStatus("idle"), 3000);
  };

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 space-y-8">

      {/* Header */}
      <div className="flex items-start gap-4">
        <div className="w-14 h-14 rounded-2xl bg-green-500/10 flex items-center justify-center flex-shrink-0">
          <span className="text-3xl">🦠</span>
        </div>
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-2xl font-bold">13 Moon Antivirus</h1>
            <Badge variant="outline" className="text-green-400 border-green-400/30 text-xs">Free</Badge>
          </div>
          <p className="text-muted-foreground text-sm leading-relaxed">
            Link the 13 Moon Antivirus to Forge so any code or documents extracted from your email
            land directly in your Workspace — ready for Forge to build from.
          </p>
          <div className="flex gap-3 mt-3">
            <a
              href="https://13moonantivirus.ai"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-xs text-primary hover:underline"
            >
              <ExternalLink size={12} /> 13moonantivirus.ai
            </a>
            <a
              href="https://13-moon-ai-antivirus.replit.app"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:underline"
            >
              <ExternalLink size={12} /> Web App
            </a>
          </div>
        </div>
      </div>

      {/* What this does */}
      <div className="rounded-xl border border-border bg-card p-5 space-y-4">
        <h2 className="font-semibold flex items-center gap-2"><Zap size={16} className="text-primary" /> What This Connection Does</h2>
        <div className="grid sm:grid-cols-3 gap-4">
          {[
            {
              icon: Mail,
              title: "Email Arrives",
              desc: "Someone emails you code, a PDF, or a document containing files.",
            },
            {
              icon: Shield,
              title: "Antivirus Extracts",
              desc: "13 Moon Antivirus scans the email and extracts the content — free feature.",
            },
            {
              icon: FileCode2,
              title: "Forge Receives It",
              desc: "The content appears in your Workspace automatically. Forge AI can build from it.",
            },
          ].map(({ icon: Icon, title, desc }) => (
            <div key={title} className="flex flex-col gap-1.5">
              <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
                <Icon size={16} className="text-primary" />
              </div>
              <p className="text-sm font-medium">{title}</p>
              <p className="text-xs text-muted-foreground leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Forge Ingest URL */}
      <div className="rounded-xl border border-border bg-card p-5 space-y-3">
        <h2 className="font-semibold flex items-center gap-2"><Wifi size={16} className="text-primary" /> Forge Ingest URL</h2>
        <p className="text-xs text-muted-foreground">
          Copy this URL and paste it into your 13 Moon Antivirus settings under{" "}
          <strong>Forge Integration</strong>. The antivirus will POST extracted content here automatically.
        </p>
        {status?.ingestUrl ? (
          <div className="flex items-center gap-2 bg-muted rounded-lg px-3 py-2">
            <code className="text-xs text-green-400 flex-1 break-all">{status.ingestUrl}</code>
            <CopyButton value={status.ingestUrl} />
          </div>
        ) : (
          <div className="h-9 bg-muted animate-pulse rounded-lg" />
        )}

        <div className="flex items-center gap-3 pt-1">
          <Button
            size="sm"
            variant="outline"
            onClick={testConnection}
            disabled={pingStatus === "pinging"}
            className="gap-2"
          >
            {pingStatus === "pinging" ? (
              <><Wifi size={13} className="animate-pulse" /> Testing…</>
            ) : pingStatus === "ok" ? (
              <><CheckCircle2 size={13} className="text-green-400" /> Connected</>
            ) : pingStatus === "fail" ? (
              <><WifiOff size={13} className="text-red-400" /> Not Reachable</>
            ) : (
              <><Wifi size={13} /> Test Connection</>
            )}
          </Button>
          <span className="text-xs text-muted-foreground">Verify Forge is reachable before configuring the antivirus.</span>
        </div>
      </div>

      {/* Setup steps */}
      <div className="rounded-xl border border-border bg-card p-5 space-y-4">
        <h2 className="font-semibold flex items-center gap-2"><Info size={16} className="text-primary" /> Setup Steps</h2>
        <ol className="space-y-3">
          {(status?.instructions ?? [
            "Copy the Forge Ingest URL above",
            "Open 13 Moon Antivirus → Settings → Forge Integration",
            "Paste the URL and enter your Inbound Key",
            "Enable email PDF extraction",
            "Any code PDFs extracted from email will land in your Forge Workspace automatically",
          ]).map((step, i) => (
            <li key={i} className="flex items-start gap-3">
              <span className={cn(
                "w-6 h-6 rounded-full text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5",
                "bg-primary/10 text-primary"
              )}>
                {i + 1}
              </span>
              <span className="text-sm leading-relaxed">{step}</span>
            </li>
          ))}
        </ol>
      </div>

      {/* Recommendation callout */}
      <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-5">
        <div className="flex items-start gap-3">
          <Shield size={18} className="text-amber-400 flex-shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="text-sm font-medium text-amber-300">Leaving Replit or another platform?</p>
            <p className="text-xs text-muted-foreground leading-relaxed">
              When you export code from Replit or any similar platform, you'll often receive ZIP files or
              links emailed to you. 13 Moon Antivirus can intercept those, extract the code, and feed
              it straight to Forge — so you spend zero time copying files manually. It's free.
            </p>
            <a
              href="https://13moonantivirus.ai"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-xs text-amber-400 hover:underline mt-1"
            >
              Get 13 Moon Antivirus <ArrowRight size={12} />
            </a>
          </div>
        </div>
      </div>

    </div>
  );
}
