import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  Mail, Star, Trash2, RefreshCw, Inbox, ArrowLeft,
  Loader2, Copy, Check, Paperclip, FolderOpen, Forward,
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

export default function ForgeInbox() {
  const { user } = useUser();
  const [folder, setFolder] = useState<Folder>("inbox");
  const [messages, setMessages] = useState<ForgeMessage[]>([]);
  const [selected, setSelected] = useState<ForgeMessage | null>(null);
  const [loading, setLoading] = useState(false);
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

  async function removeMessage(msg: ForgeMessage) {
    try {
      await apiFetch(`/api/mailbox/${msg.id}`, { method: "DELETE" });
      setSelected(null);
      setMessages(prev => prev.filter(m => m.id !== msg.id));
    } catch { /* ignore */ }
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
        <div className="flex items-center gap-3">
          <Mail size={20} className="text-primary shrink-0" />
          <div className="flex-1 min-w-0">
            <h1 className="text-xl font-bold tracking-tight">Forge Inbox</h1>
            <p className="text-xs text-muted-foreground">Receive-only forwarding address — nothing goes out from here</p>
          </div>
        </div>

        {/* Forwarding address callout */}
        <div className="mt-3 flex items-start gap-3 rounded-lg border border-primary/20 bg-primary/5 px-4 py-3">
          <Forward size={16} className="text-primary mt-0.5 shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-foreground">Your Forge forwarding address</p>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              <span className="font-mono text-xs text-primary bg-primary/10 rounded px-2 py-0.5 break-all">
                {forgeEmail}
              </span>
              <button
                onClick={copyEmail}
                className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors shrink-0"
                title="Copy address"
              >
                {copied ? <Check size={12} className="text-green-500" /> : <Copy size={12} />}
                {copied ? "Copied" : "Copy"}
              </button>
            </div>
            <p className="text-[11px] text-muted-foreground mt-1.5 leading-relaxed">
              Forward emails here — PDFs, ZIPs, or any attachment lands in your{" "}
              <span className="inline-flex items-center gap-0.5 font-medium text-foreground">
                <FolderOpen size={11} />
                Workspace
              </span>
              {" "}automatically. You can't send mail out from this address.
            </p>
            <p className="text-[10px] text-muted-foreground/50 mt-1">
              Needs MX records on forge.13moonforge.ai to receive external mail — works in-app now.
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
              <Forward size={32} className="opacity-20" />
              <div>
                <p className="text-sm font-medium">Nothing forwarded yet</p>
                <p className="text-xs mt-1 opacity-70">Forward an email with an attachment to your Forge address and it'll show up here</p>
              </div>
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
                    {selected.fromAddress && (
                      <span className="ml-1 opacity-60">&lt;{selected.fromAddress}&gt;</span>
                    )}
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
                    onClick={() => removeMessage(selected)}
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
            <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground gap-3 p-8 text-center">
              <Paperclip size={40} className="opacity-20" />
              <div>
                <p className="text-sm font-medium">Select a message to read it</p>
                <p className="text-xs mt-1 opacity-70">Attachments you forward here are saved to Workspace automatically</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
