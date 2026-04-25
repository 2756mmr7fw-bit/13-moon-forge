import { useState, useEffect } from "react";
import { getAuthToken } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from "@/components/ui/select";
import {
  Shield, ExternalLink, Copy, CheckCircle2, Zap, FileCode2,
  ArrowRight, ArrowLeft, Info, Wifi, WifiOff, Mail, Upload, Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";

const API_BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

interface StatusData {
  connected: boolean;
  ingestUrl: string;
  antivirusPushUrl: string;
  antivirusProbeUrl: string;
  antivirusUrl: string;
  antivirusReplit: string;
  authNote: string;
}

async function authFetch(url: string, opts: RequestInit = {}) {
  const token = await getAuthToken();
  return fetch(url, {
    ...opts,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(opts.headers ?? {}),
    },
  });
}

function CopyButton({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    await navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <button onClick={copy} title="Copy" className="p-1.5 rounded hover:bg-muted transition-colors flex-shrink-0">
      {copied
        ? <CheckCircle2 size={15} className="text-green-400" />
        : <Copy size={15} className="text-muted-foreground" />}
    </button>
  );
}

type ProbeState = "idle" | "checking" | "ok" | "fail";

function StatusBadge({ state }: { state: ProbeState }) {
  if (state === "checking") return <Badge variant="outline" className="gap-1 text-yellow-400 border-yellow-400/30"><Loader2 size={10} className="animate-spin" /> Checking…</Badge>;
  if (state === "ok")       return <Badge variant="outline" className="gap-1 text-green-400 border-green-400/30"><CheckCircle2 size={10} /> Connected</Badge>;
  if (state === "fail")     return <Badge variant="outline" className="gap-1 text-red-400 border-red-400/30"><WifiOff size={10} /> Unreachable</Badge>;
  return null;
}

export default function AntivirusPage() {
  const [status, setStatus] = useState<StatusData | null>(null);
  const [forgeProbe, setForgeProbe]     = useState<ProbeState>("idle");
  const [avProbe,    setAvProbe]        = useState<ProbeState>("idle");

  // Send-to-antivirus form
  const [sendFilename, setSendFilename] = useState("");
  const [sendContent,  setSendContent]  = useState("");
  const [sendType,     setSendType]     = useState("code");
  const [sendNote,     setSendNote]     = useState("");
  const [sending,      setSending]      = useState(false);
  const [sendResult,   setSendResult]   = useState<{ ok: boolean; msg: string } | null>(null);

  useEffect(() => {
    authFetch(`${API_BASE}/api/antivirus/status`)
      .then(r => r.ok ? r.json() : null)
      .then(d => d && setStatus(d))
      .catch(() => {});
  }, []);

  const probeForge = async () => {
    setForgeProbe("checking");
    try {
      const r = await fetch(`${API_BASE}/api/antivirus/status`);
      setForgeProbe(r.ok ? "ok" : "fail");
    } catch { setForgeProbe("fail"); }
  };

  const probeAntivirus = async () => {
    setAvProbe("checking");
    try {
      const r = await authFetch(`${API_BASE}/api/antivirus/probe`);
      const d = await r.json();
      setAvProbe(d.ok ? "ok" : "fail");
    } catch { setAvProbe("fail"); }
  };

  const sendToAntivirus = async () => {
    if (!sendFilename || !sendContent) return;
    setSending(true);
    setSendResult(null);
    try {
      const r = await authFetch(`${API_BASE}/api/antivirus/send`, {
        method: "POST",
        body: JSON.stringify({
          filename: sendFilename,
          content:  sendContent,
          type:     sendType,
          note:     sendNote || undefined,
        }),
      });
      const d = await r.json();
      if (r.ok) {
        setSendResult({ ok: true, msg: `Sent — Antivirus file ID: ${d.antivirusResponse?.fileId ?? "received"}` });
        setSendFilename(""); setSendContent(""); setSendNote("");
      } else {
        setSendResult({ ok: false, msg: d.error ?? "Failed to send" });
      }
    } catch (e: any) {
      setSendResult({ ok: false, msg: e?.message ?? "Network error" });
    } finally {
      setSending(false);
    }
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
            <Badge variant="outline" className="text-green-400 border-green-400/30 text-xs">Live</Badge>
          </div>
          <p className="text-muted-foreground text-sm leading-relaxed">
            Fully wired, both directions. Forge sends files to the Antivirus. Antivirus extracts
            email PDFs and pushes them straight into your Workspace.
          </p>
          <div className="flex gap-3 mt-3">
            <a href="https://13moonantivirus.ai" target="_blank" rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-xs text-primary hover:underline">
              <ExternalLink size={12} /> 13moonantivirus.ai
            </a>
            <a href="https://13-moon-ai-antivirus.replit.app" target="_blank" rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:underline">
              <ExternalLink size={12} /> Web App
            </a>
          </div>
        </div>
      </div>

      {/* Pipeline diagram */}
      <div className="rounded-xl border border-border bg-card p-5 space-y-4">
        <h2 className="font-semibold flex items-center gap-2"><Zap size={16} className="text-primary" /> Two-Way Pipeline</h2>
        <div className="grid sm:grid-cols-5 gap-2 items-center text-center">
          {/* Antivirus → Forge */}
          <div className="sm:col-span-2 bg-muted/50 rounded-lg p-3 space-y-1">
            <div className="text-xl">🦠</div>
            <p className="text-xs font-semibold">Antivirus</p>
            <p className="text-[10px] text-muted-foreground">Extracts PDFs from email</p>
          </div>
          <div className="flex flex-col items-center gap-0.5">
            <ArrowRight size={16} className="text-green-400 rotate-0" />
            <p className="text-[9px] text-muted-foreground">POST</p>
            <ArrowLeft size={16} className="text-orange-400" />
            <p className="text-[9px] text-muted-foreground">POST</p>
          </div>
          <div className="sm:col-span-2 bg-muted/50 rounded-lg p-3 space-y-1">
            <div className="text-xl">🔥</div>
            <p className="text-xs font-semibold">Forge</p>
            <p className="text-[10px] text-muted-foreground">Receives & sends files</p>
          </div>
        </div>
        <div className="grid sm:grid-cols-2 gap-3 pt-1">
          <div className="text-xs text-muted-foreground space-y-0.5">
            <p className="text-green-400 font-medium flex items-center gap-1"><ArrowRight size={11} /> Antivirus → Forge</p>
            <p>Email PDFs → extracted → land in your Workspace automatically</p>
          </div>
          <div className="text-xs text-muted-foreground space-y-0.5">
            <p className="text-orange-400 font-medium flex items-center gap-1"><ArrowLeft size={11} /> Forge → Antivirus</p>
            <p>Send any file from Forge directly into the Antivirus for scanning or storage</p>
          </div>
        </div>
      </div>

      {/* Connection health */}
      <div className="rounded-xl border border-border bg-card p-5 space-y-4">
        <h2 className="font-semibold flex items-center gap-2"><Wifi size={16} className="text-primary" /> Connection Health</h2>
        <div className="space-y-3">
          {/* Forge endpoint */}
          <div className="flex items-center justify-between gap-3 py-2 border-b border-border/50">
            <div className="space-y-0.5">
              <p className="text-xs font-medium">Forge Ingest Endpoint <span className="text-muted-foreground">(Antivirus calls this)</span></p>
              {status?.ingestUrl
                ? <div className="flex items-center gap-1.5 bg-muted rounded px-2 py-1">
                    <code className="text-[10px] text-green-400 break-all flex-1">{status.ingestUrl}</code>
                    <CopyButton value={status.ingestUrl} />
                  </div>
                : <div className="h-6 bg-muted animate-pulse rounded w-72" />}
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <StatusBadge state={forgeProbe} />
              <Button size="sm" variant="outline" onClick={probeForge} disabled={forgeProbe === "checking"} className="text-xs h-7 px-2">
                Test
              </Button>
            </div>
          </div>
          {/* Antivirus endpoint */}
          <div className="flex items-center justify-between gap-3 py-2">
            <div className="space-y-0.5">
              <p className="text-xs font-medium">Antivirus Push Endpoint <span className="text-muted-foreground">(Forge calls this)</span></p>
              {status?.antivirusPushUrl
                ? <div className="flex items-center gap-1.5 bg-muted rounded px-2 py-1">
                    <code className="text-[10px] text-orange-400 break-all flex-1">{status.antivirusPushUrl}</code>
                    <CopyButton value={status.antivirusPushUrl} />
                  </div>
                : <div className="h-6 bg-muted animate-pulse rounded w-72" />}
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <StatusBadge state={avProbe} />
              <Button size="sm" variant="outline" onClick={probeAntivirus} disabled={avProbe === "checking"} className="text-xs h-7 px-2">
                Test
              </Button>
            </div>
          </div>
        </div>
        {status?.authNote && (
          <p className="text-[10px] text-muted-foreground flex items-center gap-1">
            <Info size={10} /> {status.authNote}
          </p>
        )}
      </div>

      {/* Send file to antivirus */}
      <div className="rounded-xl border border-border bg-card p-5 space-y-4">
        <h2 className="font-semibold flex items-center gap-2">
          <Upload size={16} className="text-orange-400" /> Send a File to the Antivirus
        </h2>
        <p className="text-xs text-muted-foreground">
          Push any content from Forge directly into the Antivirus — for scanning, storage, or forwarding.
        </p>
        <div className="space-y-3">
          <div className="grid sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Filename</Label>
              <Input
                value={sendFilename}
                onChange={e => setSendFilename(e.target.value)}
                placeholder="mycode.js"
                className="h-8 text-xs"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Type</Label>
              <Select value={sendType} onValueChange={setSendType}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="code">Code</SelectItem>
                  <SelectItem value="text">Text</SelectItem>
                  <SelectItem value="pdf">PDF</SelectItem>
                  <SelectItem value="zip">ZIP</SelectItem>
                  <SelectItem value="binary">Binary</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Content</Label>
            <Textarea
              value={sendContent}
              onChange={e => setSendContent(e.target.value)}
              placeholder="Paste the file content here…"
              className="text-xs font-mono min-h-[120px] resize-y"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Note <span className="text-muted-foreground">(optional)</span></Label>
            <Input
              value={sendNote}
              onChange={e => setSendNote(e.target.value)}
              placeholder="e.g. From the Apr 25 build"
              className="h-8 text-xs"
              maxLength={500}
            />
          </div>
          <div className="flex items-center gap-3">
            <Button
              onClick={sendToAntivirus}
              disabled={sending || !sendFilename || !sendContent}
              className="gap-2"
            >
              {sending ? <><Loader2 size={14} className="animate-spin" /> Sending…</> : <><Upload size={14} /> Send to Antivirus</>}
            </Button>
            {sendResult && (
              <p className={cn("text-xs", sendResult.ok ? "text-green-400" : "text-red-400")}>
                {sendResult.ok ? <CheckCircle2 size={12} className="inline mr-1" /> : null}
                {sendResult.msg}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Antivirus → Forge info */}
      <div className="rounded-xl border border-border bg-card p-5 space-y-3">
        <h2 className="font-semibold flex items-center gap-2">
          <Mail size={16} className="text-green-400" /> Antivirus → Forge (Email Extraction)
        </h2>
        <p className="text-xs text-muted-foreground leading-relaxed">
          When the Antivirus extracts a PDF or code file from your email, it automatically POSTs it
          to Forge's ingest endpoint. The file lands in your <strong>Workspace</strong> marked with 🦠
          so you know exactly where it came from. Forge AI can then read and build from it immediately.
        </p>
        <div className="bg-muted/50 rounded-lg p-3 space-y-1">
          <p className="text-[10px] font-mono text-muted-foreground">POST {status?.ingestUrl ?? "/api/ingest/document"}</p>
          <p className="text-[10px] font-mono text-muted-foreground">Authorization: Bearer [TPTS_INBOUND_KEY]</p>
          <p className="text-[10px] font-mono text-muted-foreground">{"{ userId, content, filename, type, source }"}</p>
        </div>
      </div>

      {/* Callout */}
      <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-5">
        <div className="flex items-start gap-3">
          <Shield size={18} className="text-amber-400 flex-shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="text-sm font-medium text-amber-300">Leaving Replit or another platform?</p>
            <p className="text-xs text-muted-foreground leading-relaxed">
              When you export code from Replit or similar platforms, files are often emailed to you as ZIPs
              or PDFs. The Antivirus intercepts those, extracts the code, and feeds it straight to Forge — so
              you're never copying files manually. It's free.
            </p>
            <a href="https://13moonantivirus.ai" target="_blank" rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-xs text-amber-400 hover:underline mt-1">
              Get 13 Moon Antivirus <ArrowRight size={12} />
            </a>
          </div>
        </div>
      </div>

    </div>
  );
}
