import { useState, useEffect, useCallback } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  ScanLine, FileImage, FileVideo, FileArchive, File, FileText,
  ShieldCheck, ShieldAlert, ShieldQuestion, Loader2, RefreshCw,
  Send, CheckCircle2, Clock, AlertTriangle, X, ChevronDown,
  Flame, Users, GraduationCap, Wrench, Tv, BookOpen, Film,
  Shield, XCircle, Phone, Wallet, Scissors, PenLine,
  Inbox, Mail, ArrowRight,
} from "lucide-react";
import { format } from "date-fns";

const API = import.meta.env.BASE_URL.replace(/\/$/, "");

interface MailAttachment {
  id: number;
  messageId: number;
  filename: string;
  mime: string;
  sizeBytes: number;
  scanStatus: "pending" | "scanning" | "clean" | "flagged" | "error";
  scanResult: string | null;
  droppedTo: string | null;
  createdAt: string;
  fromName: string;
  fromAddress: string;
  subject: string;
  msgCreatedAt: string;
}

const DROP_APPS = [
  { id: "forge",       name: "The Forge",             icon: Flame,       color: "text-orange-400", status: "live"  },
  { id: "academy",     name: "Forge Academy",          icon: GraduationCap, color: "text-orange-400", status: "live" },
  { id: "town-square", name: "People's Town Square",   icon: Users,       color: "text-green-400",  status: "live"  },
  { id: "press-tv",    name: "Town Square Press TV",   icon: Tv,          color: "text-red-400",    status: "soon"  },
  { id: "press",       name: "Town Square Press",      icon: BookOpen,    color: "text-amber-400",  status: "soon"  },
  { id: "workshop",    name: "Inventors Workshop",     icon: Wrench,      color: "text-cyan-400",   status: "soon"  },
  { id: "town-tv",     name: "Town Square TV",         icon: Film,        color: "text-purple-400", status: "soon"  },
  { id: "antivirus",   name: "13 Moon Antivirus",      icon: Shield,      color: "text-blue-400",   status: "soon"  },
  { id: "refusal",     name: "13 Moon Refusal",        icon: XCircle,     color: "text-rose-400",   status: "soon"  },
  { id: "guardian",    name: "Call Guardian",          icon: Phone,       color: "text-teal-400",   status: "soon"  },
  { id: "ledger",      name: "13 Moon Ledger",         icon: Wallet,      color: "text-emerald-400",status: "soon"  },
  { id: "editor",      name: "13 Moon Film Editor",    icon: Scissors,    color: "text-pink-400",   status: "soon"  },
  { id: "ezquill",     name: "13 Moon EzQuill",        icon: PenLine,     color: "text-violet-400", status: "soon"  },
];

function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(0)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

function fileIcon(mime: string) {
  if (mime.startsWith("image/"))        return <FileImage size={16} className="text-blue-400" />;
  if (mime.startsWith("video/"))        return <FileVideo size={16} className="text-purple-400" />;
  if (mime.includes("zip"))             return <FileArchive size={16} className="text-orange-400" />;
  if (mime === "application/pdf")       return <FileText size={16} className="text-red-400" />;
  if (mime.startsWith("text/"))         return <FileText size={16} className="text-zinc-400" />;
  return <File size={16} className="text-zinc-500" />;
}

function ScanBadge({ status }: { status: MailAttachment["scanStatus"] }) {
  switch (status) {
    case "clean":    return <Badge className="bg-green-500/15 text-green-400 border-green-500/30 border text-[10px] gap-1"><ShieldCheck size={10} /> Clean</Badge>;
    case "flagged":  return <Badge className="bg-red-500/15 text-red-400 border-red-500/30 border text-[10px] gap-1"><ShieldAlert size={10} /> Flagged</Badge>;
    case "scanning": return <Badge className="bg-yellow-500/15 text-yellow-400 border-yellow-500/30 border text-[10px] gap-1"><Loader2 size={10} className="animate-spin" /> Scanning</Badge>;
    case "error":    return <Badge className="bg-zinc-500/15 text-zinc-400 border-zinc-500/30 border text-[10px] gap-1"><AlertTriangle size={10} /> Error</Badge>;
    default:         return <Badge className="bg-zinc-700/40 text-zinc-400 border-zinc-700 border text-[10px] gap-1"><ShieldQuestion size={10} /> Pending</Badge>;
  }
}

async function apiFetch(path: string, opts: RequestInit = {}) {
  const res = await fetch(`${API}${path}`, {
    headers: { "Content-Type": "application/json", ...(opts.headers ?? {}) },
    ...opts,
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export default function MailScanner() {
  const [attachments, setAttachments] = useState<MailAttachment[]>([]);
  const [loading, setLoading]         = useState(false);
  const [scanning, setScanning]       = useState<Record<number, boolean>>({});
  const [dropping, setDropping]       = useState<Record<number, boolean>>({});
  const [dropTarget, setDropTarget]   = useState<number | null>(null);
  const [dropDest, setDropDest]       = useState<string>("");
  const [filterStatus, setFilterStatus] = useState<string>("all");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiFetch("/api/mail-scanner/attachments");
      setAttachments(data);
    } catch {
      setAttachments([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function scan(id: number) {
    setScanning(s => ({ ...s, [id]: true }));
    setAttachments(prev => prev.map(a => a.id === id ? { ...a, scanStatus: "scanning" } : a));
    try {
      const res = await apiFetch(`/api/mail-scanner/scan/${id}`, { method: "POST" });
      setAttachments(prev => prev.map(a => a.id === id ? { ...a, scanStatus: res.scanStatus } : a));
    } catch {
      setAttachments(prev => prev.map(a => a.id === id ? { ...a, scanStatus: "error" } : a));
    } finally {
      setScanning(s => ({ ...s, [id]: false }));
    }
  }

  async function drop(id: number) {
    if (!dropDest) return;
    setDropping(d => ({ ...d, [id]: true }));
    try {
      await apiFetch(`/api/mail-scanner/drop/${id}`, {
        method: "PUT",
        body: JSON.stringify({ destination: dropDest }),
      });
      setAttachments(prev => prev.map(a => a.id === id ? { ...a, droppedTo: dropDest } : a));
      setDropTarget(null);
      setDropDest("");
    } catch { /* best effort */ }
    finally { setDropping(d => ({ ...d, [id]: false })); }
  }

  const counts = {
    all:     attachments.length,
    pending: attachments.filter(a => a.scanStatus === "pending").length,
    clean:   attachments.filter(a => a.scanStatus === "clean").length,
    flagged: attachments.filter(a => a.scanStatus === "flagged").length,
  };

  const visible = filterStatus === "all"
    ? attachments
    : attachments.filter(a => a.scanStatus === filterStatus);

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      <div className="max-w-5xl mx-auto px-4 py-10 sm:px-6">

        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-2">
            <ScanLine size={16} className="text-orange-400" />
            <span className="text-xs font-bold text-orange-400 tracking-widest uppercase">Mail Scanner</span>
          </div>
          <h1 className="text-3xl font-black text-white mb-2">Attachment Scanner</h1>
          <p className="text-zinc-400 max-w-xl">
            Every file that comes through your Forge inbox lands here.
            Scan it before you use it. Send clean files directly to any app in the ecosystem.
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
          {[
            { label: "Total",   count: counts.all,     icon: Mail,         color: "text-zinc-400",  bg: "bg-zinc-800/50",       key: "all"     },
            { label: "Pending", count: counts.pending,  icon: Clock,        color: "text-zinc-400",  bg: "bg-zinc-800/50",       key: "pending" },
            { label: "Clean",   count: counts.clean,    icon: ShieldCheck,  color: "text-green-400", bg: "bg-green-500/10",      key: "clean"   },
            { label: "Flagged", count: counts.flagged,  icon: ShieldAlert,  color: "text-red-400",   bg: "bg-red-500/10",        key: "flagged" },
          ].map(({ label, count, icon: Icon, color, bg, key }) => (
            <button
              key={key}
              onClick={() => setFilterStatus(key)}
              className={cn(
                "rounded-xl border p-4 text-left transition-all",
                filterStatus === key
                  ? cn("border-orange-500/40", bg)
                  : "border-zinc-800 bg-zinc-900/40 hover:border-zinc-700"
              )}
            >
              <Icon size={16} className={cn(color, "mb-2")} />
              <p className="text-xl font-black text-white">{count}</p>
              <p className="text-xs text-zinc-500">{label}</p>
            </button>
          ))}
        </div>

        {/* Filter + Refresh */}
        <div className="flex items-center justify-between mb-4">
          <p className="text-sm text-zinc-500">
            {visible.length} attachment{visible.length !== 1 ? "s" : ""}
            {filterStatus !== "all" && ` · ${filterStatus}`}
          </p>
          <button
            onClick={load}
            disabled={loading}
            className="flex items-center gap-1.5 text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
          >
            <RefreshCw size={13} className={loading ? "animate-spin" : ""} />
            Refresh
          </button>
        </div>

        {/* Attachment list */}
        {loading && attachments.length === 0 ? (
          <div className="flex items-center justify-center py-20 text-zinc-600">
            <Loader2 size={24} className="animate-spin" />
          </div>
        ) : visible.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-zinc-600 text-center gap-3">
            <Inbox size={36} className="opacity-30" />
            <div>
              <p className="text-sm font-medium text-zinc-500">
                {filterStatus === "all" ? "No attachments yet" : `No ${filterStatus} attachments`}
              </p>
              <p className="text-xs text-zinc-600 mt-1">
                Forward an email with attachments to your Forge address and they'll appear here
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {visible.map(att => (
              <div
                key={att.id}
                className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-5"
              >
                <div className="flex items-start gap-4">

                  {/* File icon */}
                  <div className="w-10 h-10 rounded-xl bg-zinc-800 flex items-center justify-center shrink-0 mt-0.5">
                    {fileIcon(att.mime)}
                  </div>

                  {/* Main info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <p className="text-sm font-semibold text-white truncate">{att.filename}</p>
                      <ScanBadge status={att.scanStatus} />
                      {att.droppedTo && (
                        <Badge className="bg-orange-500/15 text-orange-400 border-orange-500/30 border text-[10px] gap-1">
                          <Send size={9} /> Dropped
                        </Badge>
                      )}
                    </div>

                    <p className="text-xs text-zinc-500 mb-1">
                      {formatBytes(att.sizeBytes)} · {att.mime}
                    </p>

                    <div className="flex items-center gap-1.5 text-xs text-zinc-600">
                      <Mail size={11} />
                      <span className="truncate">
                        From <span className="text-zinc-400">{att.fromName}</span>
                        {" · "}
                        <span className="text-zinc-500 italic truncate">{att.subject}</span>
                      </span>
                      <span className="shrink-0">· {format(new Date(att.createdAt), "MMM d")}</span>
                    </div>

                    {att.droppedTo && (
                      <p className="text-[11px] text-zinc-600 mt-1">
                        Sent to: <span className="text-zinc-400">
                          {DROP_APPS.find(a => a.id === att.droppedTo)?.name ?? att.droppedTo}
                        </span>
                      </p>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex flex-col gap-2 shrink-0">
                    {(att.scanStatus === "pending" || att.scanStatus === "error") && (
                      <Button
                        size="sm"
                        onClick={() => scan(att.id)}
                        disabled={scanning[att.id]}
                        className="bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border-0 h-8 text-xs gap-1.5"
                      >
                        {scanning[att.id]
                          ? <><Loader2 size={12} className="animate-spin" /> Scanning</>
                          : <><ScanLine size={12} /> Scan</>}
                      </Button>
                    )}

                    {att.scanStatus === "clean" && !att.droppedTo && (
                      <Button
                        size="sm"
                        onClick={() => setDropTarget(dropTarget === att.id ? null : att.id)}
                        className="bg-orange-500 hover:bg-orange-400 text-white h-8 text-xs gap-1.5"
                      >
                        <Send size={12} /> Forge Drop
                      </Button>
                    )}

                    {att.scanStatus === "flagged" && (
                      <p className="text-[11px] text-red-400 text-right max-w-[120px] leading-snug">
                        Blocked — antivirus flagged this file
                      </p>
                    )}
                  </div>
                </div>

                {/* Forge Drop destination picker */}
                {dropTarget === att.id && (
                  <div className="mt-4 pt-4 border-t border-zinc-800">
                    <p className="text-xs font-bold text-zinc-400 mb-3">Choose destination</p>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mb-3">
                      {DROP_APPS.filter(a => a.status === "live").map(app => {
                        const Icon = app.icon;
                        const sel  = dropDest === app.id;
                        return (
                          <button
                            key={app.id}
                            onClick={() => setDropDest(sel ? "" : app.id)}
                            className={cn(
                              "flex items-center gap-2 rounded-lg border p-2.5 text-xs text-left transition-all",
                              sel
                                ? "border-orange-500/50 bg-orange-500/10"
                                : "border-zinc-800 bg-zinc-800/30 hover:border-zinc-700"
                            )}
                          >
                            <Icon size={14} className={sel ? app.color : "text-zinc-500"} />
                            <span className={sel ? "text-white font-semibold" : "text-zinc-400"}>{app.name}</span>
                          </button>
                        );
                      })}
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        onClick={() => drop(att.id)}
                        disabled={!dropDest || dropping[att.id]}
                        className={cn(
                          "h-8 text-xs gap-1.5",
                          dropDest
                            ? "bg-orange-500 hover:bg-orange-400 text-white"
                            : "bg-zinc-800 text-zinc-500 cursor-not-allowed"
                        )}
                      >
                        {dropping[att.id]
                          ? <><Loader2 size={12} className="animate-spin" /> Sending</>
                          : <><ArrowRight size={12} /> Send to {DROP_APPS.find(a => a.id === dropDest)?.name ?? "destination"}</>
                        }
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => { setDropTarget(null); setDropDest(""); }}
                        className="h-8 text-xs text-zinc-500 hover:text-zinc-300"
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* How it works */}
        <div className="mt-10 rounded-2xl border border-zinc-800 bg-zinc-900/30 p-6">
          <p className="text-sm font-bold text-zinc-300 mb-4">How mail scanning works</p>
          <div className="grid sm:grid-cols-3 gap-4">
            {[
              {
                step: "1",
                title: "Email arrives",
                desc: "You forward (or someone sends to) your Forge address. Any attached file lands here automatically.",
                color: "text-zinc-400",
                bg: "bg-zinc-800",
              },
              {
                step: "2",
                title: "You scan it",
                desc: "Hit Scan on any attachment. It goes to 13 Moon Antivirus. You get a clean or flagged verdict.",
                color: "text-orange-400",
                bg: "bg-orange-500/10",
              },
              {
                step: "3",
                title: "Drop the clean ones",
                desc: "Clean files can be sent to any app in the Town Square ecosystem — straight to the Forge Drop bucket.",
                color: "text-green-400",
                bg: "bg-green-500/10",
              },
            ].map(({ step, title, desc, color, bg }) => (
              <div key={step} className={cn("rounded-xl p-4", bg, "border border-zinc-800")}>
                <p className={cn("text-xs font-black mb-1", color)}>Step {step}</p>
                <p className="text-sm font-bold text-white mb-1">{title}</p>
                <p className="text-xs text-zinc-500 leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
