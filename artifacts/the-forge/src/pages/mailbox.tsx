import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import {
  Mail, Star, Trash2, Send, RefreshCw, X, Inbox, ArrowLeft,
  PenLine, Loader2, Copy, Check, Paperclip, FolderOpen,
} from "lucide-react";
import { useUser } from "@clerk/clerk-react";
import { format } from "date-fns";

const API = import.meta.env.BASE_URL.replace(/\/$/, "");

interface ForgeMessage {
  id: number;
  userId: string;
  fromName: string;
  fromAddress: string;
  subject: string;
  body: string;
  read: boolean;
  starred: boolean;
  folder: string;
  createdAt: string;
}

type Folder = "inbox" | "starred" | "trash";

async function apiFetch(path: string, opts: RequestInit = {}) {
  const res = await fetch(`${API}${path}`, {
    headers: { "Content-Type": "application/json", ...(opts.headers ?? {}) },
    ...opts,
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export default function Mailbox() {
  const { user } = useUser();
  const [folder, setFolder] = useState<Folder>("inbox");
  const [messages, setMessages] = useState<ForgeMessage[]>([]);
  const [selected, setSelected] = useState<ForgeMessage | null>(null);
  const [loading, setLoading] = useState(false);
  const [composing, setComposing] = useState(false);
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);
  const [copied, setCopied] = useState(false);

  const forgeEmail = user ? `${user.id}@forge.13moonforge.ai` : "—";

  const load = useCallback(async () => {
    setLoading(true);
    setSelected(null);
    try {
      const endpoint = folder === "inbox" ? "/api/mailbox"
        : folder === "starred" ? "/api/mailbox/starred"
        : "/api/mailbox/trash";
      const data = await apiFetch(endpoint);
      setMessages(data);
    } catch {
      setMessages([]);
    } finally {
      setLoading(false);
    }
  }, [folder]);

  useEffect(() => { load(); }, [load]);

  async function openMessage(msg: ForgeMessage) {
    setSelected(msg);
    if (!msg.read) {
      try { await apiFetch(`/api/mailbox/${msg.id}/read`, { method: "PUT" }); } catch { /* best effort */ }
      setMessages(prev => prev.map(m => m.id === msg.id ? { ...m, read: true } : m));
    }
  }

  async function toggleStar(msg: ForgeMessage, e: React.MouseEvent) {
    e.stopPropagation();
    try {
      const res = await apiFetch(`/api/mailbox/${msg.id}/star`, { method: "PUT" });
      setMessages(prev => prev.map(m => m.id === msg.id ? { ...m, starred: res.starred } : m));
      if (selected?.id === msg.id) setSelected(s => s ? { ...s, starred: res.starred } : s);
    } catch { /* ignore */ }
  }

  async function trashMessage(msg: ForgeMessage) {
    try {
      await apiFetch(`/api/mailbox/${msg.id}`, { method: "DELETE" });
      setSelected(null);
      setMessages(prev => prev.filter(m => m.id !== msg.id));
    } catch { /* ignore */ }
  }

  async function send() {
    if (!body.trim()) return;
    setSending(true);
    try {
      await apiFetch("/api/mailbox/compose", {
        method: "POST",
        body: JSON.stringify({ subject: subject.trim() || "(No subject)", body: body.trim() }),
      });
      setComposing(false);
      setSubject(""); setBody("");
      if (folder === "inbox") load();
    } catch { /* ignore */ } finally {
      setSending(false);
    }
  }

  function copyEmail() {
    navigator.clipboard.writeText(forgeEmail);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const unread = messages.filter(m => !m.read).length;

  const FolderBtn = ({ id, label, icon: Icon }: { id: Folder; label: string; icon: any }) => (
    <button
      onClick={() => setFolder(id)}
      className={cn(
        "flex items-center gap-2 w-full px-3 py-2 rounded-md text-sm transition-colors",
        folder === id
          ? "bg-primary/10 text-primary font-medium"
          : "text-muted-foreground hover:bg-muted hover:text-foreground",
      )}
    >
      <Icon size={15} />
      <span>{label}</span>
      {id === "inbox" && unread > 0 && (
        <Badge variant="secondary" className="ml-auto text-[10px] px-1.5 py-0 min-w-[18px] text-center">
          {unread}
        </Badge>
      )}
    </button>
  );

  return (
    <div className="h-screen flex flex-col overflow-hidden">
      {/* Header */}
      <div className="border-b border-border px-6 py-4 shrink-0">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold tracking-tight flex items-center gap-2">
              <Mail size={20} className="text-primary" />
              Forge Mailbox
            </h1>
            <div className="flex items-center gap-2 mt-0.5">
              <p className="text-xs text-muted-foreground font-mono">{forgeEmail}</p>
              <button onClick={copyEmail} className="text-muted-foreground hover:text-foreground transition-colors" title="Copy address">
                {copied ? <Check size={12} className="text-green-500" /> : <Copy size={12} />}
              </button>
            </div>
          </div>
          <Button onClick={() => setComposing(true)} size="sm" className="gap-2 shrink-0">
            <PenLine size={14} />
            New Note
          </Button>
        </div>

        {/* Email-to-Workspace callout */}
        <div className="mt-3 flex items-start gap-3 rounded-lg border border-primary/20 bg-primary/5 px-4 py-3">
          <Paperclip size={16} className="text-primary mt-0.5 shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-foreground">Email PDFs & ZIPs straight to Forge</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Send any file as an attachment to{" "}
              <button
                onClick={copyEmail}
                className="font-mono text-primary hover:underline inline-flex items-center gap-1"
                title="Copy address"
              >
                {forgeEmail}
                {copied ? <Check size={10} className="text-green-500" /> : <Copy size={10} />}
              </button>
              {" "}and it will land in your{" "}
              <span className="inline-flex items-center gap-0.5 font-medium text-foreground">
                <FolderOpen size={11} />
                Workspace
              </span>
              {" "}automatically.
            </p>
            <p className="text-[10px] text-muted-foreground/60 mt-1">
              Requires MX records on forge.13moonforge.ai — see setup guide once DNS is configured.
            </p>
          </div>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <div className="w-44 shrink-0 border-r border-border p-3 flex flex-col gap-1 bg-sidebar/50">
          <FolderBtn id="inbox"   label="Inbox"   icon={Inbox} />
          <FolderBtn id="starred" label="Starred" icon={Star} />
          <FolderBtn id="trash"   label="Trash"   icon={Trash2} />
          <div className="flex-1" />
          <button onClick={load} className="flex items-center gap-2 px-3 py-2 rounded-md text-xs text-muted-foreground hover:bg-muted transition-colors">
            <RefreshCw size={13} />
            Refresh
          </button>
        </div>

        {/* Message list */}
        <div className={cn("border-r border-border flex flex-col overflow-hidden", selected ? "hidden md:flex w-72 shrink-0" : "flex-1 md:flex md:w-72 md:shrink-0")}>
          {loading ? (
            <div className="flex-1 flex items-center justify-center text-muted-foreground">
              <Loader2 size={20} className="animate-spin" />
            </div>
          ) : messages.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground p-8 text-center gap-3">
              <Mail size={32} className="opacity-30" />
              <p className="text-sm">Nothing here yet</p>
            </div>
          ) : (
            <div className="flex-1 overflow-y-auto">
              {messages.map(msg => (
                <button
                  key={msg.id}
                  onClick={() => openMessage(msg)}
                  className={cn(
                    "w-full text-left px-4 py-3 border-b border-border/50 hover:bg-muted/50 transition-colors",
                    selected?.id === msg.id && "bg-primary/5 border-l-2 border-l-primary",
                    !msg.read && "bg-primary/5",
                  )}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className={cn("text-sm truncate", !msg.read ? "font-semibold" : "font-normal")}>
                      {msg.fromName}
                    </span>
                    <span className="text-[10px] text-muted-foreground shrink-0">
                      {format(new Date(msg.createdAt), "MMM d")}
                    </span>
                  </div>
                  <p className={cn("text-xs truncate mt-0.5", !msg.read ? "text-foreground font-medium" : "text-muted-foreground")}>
                    {msg.subject}
                  </p>
                  <p className="text-[11px] text-muted-foreground/70 truncate mt-0.5">
                    {msg.body.slice(0, 80)}
                  </p>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Message view */}
        <div className={cn("flex-1 flex flex-col overflow-hidden", selected ? "flex" : "hidden md:flex")}>
          {selected ? (
            <>
              <div className="border-b border-border px-6 py-4 flex items-start justify-between gap-4 shrink-0">
                <div className="flex-1 min-w-0">
                  <button onClick={() => setSelected(null)} className="md:hidden mb-2 flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
                    <ArrowLeft size={13} /> Back
                  </button>
                  <h2 className="text-base font-semibold">{selected.subject}</h2>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    From <span className="font-medium text-foreground">{selected.fromName}</span>
                    <span className="ml-1 opacity-60">&lt;{selected.fromAddress}&gt;</span>
                    <span className="ml-2">{format(new Date(selected.createdAt), "MMM d, yyyy 'at' h:mm a")}</span>
                  </p>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={(e) => toggleStar(selected, e)}
                    className={cn("p-2 rounded-md hover:bg-muted transition-colors", selected.starred && "text-yellow-500")}
                    title={selected.starred ? "Unstar" : "Star"}
                  >
                    <Star size={15} fill={selected.starred ? "currentColor" : "none"} />
                  </button>
                  <button
                    onClick={() => trashMessage(selected)}
                    className="p-2 rounded-md hover:bg-muted text-muted-foreground hover:text-destructive transition-colors"
                    title="Delete"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
              <div className="flex-1 overflow-y-auto px-6 py-5">
                <pre className="text-sm whitespace-pre-wrap font-sans leading-relaxed text-foreground/90">
                  {selected.body}
                </pre>
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground gap-3">
              <Mail size={40} className="opacity-20" />
              <p className="text-sm">Select a message to read it</p>
            </div>
          )}
        </div>
      </div>

      {/* Compose overlay */}
      {composing && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-end sm:items-center justify-center p-4">
          <div className="bg-background border border-border rounded-xl w-full max-w-lg shadow-2xl flex flex-col">
            <div className="flex items-center justify-between px-5 py-4 border-b border-border">
              <h3 className="font-semibold text-sm flex items-center gap-2">
                <PenLine size={15} className="text-primary" />
                New Note to Self
              </h3>
              <button onClick={() => { setComposing(false); setSubject(""); setBody(""); }} className="text-muted-foreground hover:text-foreground">
                <X size={16} />
              </button>
            </div>
            <div className="p-5 flex flex-col gap-3">
              <div>
                <p className="text-xs text-muted-foreground mb-1">To</p>
                <p className="text-sm font-mono text-foreground/70 bg-muted rounded-md px-3 py-2 text-xs">{forgeEmail}</p>
              </div>
              <Input
                placeholder="Subject (optional)"
                value={subject}
                onChange={e => setSubject(e.target.value)}
                className="text-sm"
              />
              <Textarea
                placeholder="Write your note..."
                value={body}
                onChange={e => setBody(e.target.value)}
                rows={8}
                className="text-sm resize-none"
                autoFocus
              />
            </div>
            <div className="px-5 pb-5 flex justify-end gap-2">
              <Button variant="ghost" size="sm" onClick={() => { setComposing(false); setSubject(""); setBody(""); }}>
                Cancel
              </Button>
              <Button size="sm" onClick={send} disabled={!body.trim() || sending} className="gap-2">
                {sending ? <Loader2 size={13} className="animate-spin" /> : <Send size={13} />}
                Save to Inbox
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
