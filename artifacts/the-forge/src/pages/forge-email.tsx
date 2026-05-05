import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import {
  Mail, Plus, Trash2, Copy, Check, Loader2, X, Key,
  BarChart3, CheckCircle2, AlertCircle, Clock,
} from "lucide-react";

const API = import.meta.env.BASE_URL.replace(/\/$/, "");

interface EmailKey {
  id: number;
  name: string;
  keyPrefix: string;
  dailyLimit: number;
  monthlyLimit: number;
  sendsToday: number;
  sendsThisMonth: number;
  fromDomain: string | null;
  active: boolean;
  createdAt: string;
  rawKey?: string;
}

interface EmailSend {
  id: number;
  fromAddress: string;
  toAddress: string;
  subject: string;
  status: string;
  provider: string;
  sentAt: string;
}

function CopyBtn({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button onClick={() => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
      className="text-zinc-500 hover:text-white p-1 transition-colors flex-shrink-0">
      {copied ? <Check size={12} className="text-green-400" /> : <Copy size={12} />}
    </button>
  );
}

export default function ForgeEmail() {
  const [keys, setKeys] = useState<EmailKey[]>([]);
  const [sends, setSends] = useState<EmailSend[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ name: "Default", fromDomain: "" });
  const [adding, setAdding] = useState(false);
  const [newKey, setNewKey] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"keys" | "history">("keys");

  const fetchData = useCallback(async () => {
    const [keysRes, sendsRes] = await Promise.all([
      fetch(`${API}/api/email/keys`, { credentials: "include" }),
      fetch(`${API}/api/email/sends`, { credentials: "include" }),
    ]);
    if (keysRes.ok) setKeys(await keysRes.json().then(d => d.keys ?? []));
    if (sendsRes.ok) setSends(await sendsRes.json().then(d => d.sends ?? []));
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleCreate = async () => {
    setAdding(true);
    try {
      const r = await fetch(`${API}/api/email/keys`, {
        method: "POST", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (r.ok) {
        const data = await r.json();
        setKeys(prev => [data.key, ...prev]);
        setNewKey(data.key.rawKey);
        setShowAdd(false);
      }
    } finally { setAdding(false); }
  };

  const handleDelete = async (id: number) => {
    await fetch(`${API}/api/email/keys/${id}`, { method: "DELETE", credentials: "include" });
    setKeys(prev => prev.filter(k => k.id !== id));
  };

  return (
    <div className="min-h-screen bg-black text-white px-4 py-8 max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <Mail size={22} className="text-orange-400" />
          <div>
            <h1 className="text-xl font-bold">Email API</h1>
            <p className="text-xs text-zinc-500">Send transactional email through your API key. Powered by Resend.</p>
          </div>
        </div>
        <Button onClick={() => setShowAdd(true)} className="bg-orange-500 hover:bg-orange-600 text-white h-8 text-xs gap-1">
          <Plus size={13} /> New Key
        </Button>
      </div>

      {/* New key reveal */}
      {newKey && (
        <div className="rounded-xl border border-orange-500/30 bg-orange-500/5 p-4 mb-6">
          <p className="text-xs font-semibold text-orange-400 mb-2">⚠️ Copy your API key — it won't be shown again</p>
          <div className="flex items-center gap-2 bg-black rounded-lg border border-orange-500/20 px-3 py-2">
            <span className="text-xs font-mono text-orange-300 flex-1 break-all">{newKey}</span>
            <CopyBtn text={newKey} />
          </div>
          <button onClick={() => setNewKey(null)} className="text-[11px] text-zinc-500 hover:text-white mt-2">Dismiss</button>
        </div>
      )}

      {/* Code snippet */}
      <div className="rounded-xl border border-zinc-800 bg-zinc-900/20 p-4 mb-6">
        <p className="text-[11px] font-semibold text-zinc-500 mb-2 uppercase tracking-wider">Send your first email</p>
        <div className="bg-black rounded-lg border border-zinc-800 p-3 font-mono text-[11px] text-zinc-400 overflow-x-auto">
          <span className="text-orange-400">fetch</span>
          {`("https://13moonforge.ai/api/email/send", {\n  method: "POST",\n  headers: {\n    Authorization: \`Bearer YOUR_API_KEY\`,\n    "Content-Type": "application/json",\n  },\n  body: JSON.stringify({\n    to: "user@example.com",\n    subject: "Hello!",\n    html: "<p>Hello from The Forge!</p>",\n  }),\n})`}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-0 border-b border-zinc-800 mb-4">
        {([
          { id: "keys", label: "API Keys" },
          { id: "history", label: `Send History (${sends.length})` },
        ] as const).map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)}
            className={cn("px-4 py-2 text-xs font-medium border-b-2 -mb-px transition-colors",
              activeTab === tab.id ? "border-orange-500 text-orange-400" : "border-transparent text-zinc-500 hover:text-zinc-300")}>
            {tab.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16"><Loader2 size={20} className="animate-spin text-zinc-500" /></div>
      ) : activeTab === "keys" ? (
        keys.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-zinc-800 p-12 text-center">
            <Key size={28} className="text-zinc-600 mx-auto mb-3" />
            <p className="text-sm font-semibold text-zinc-400 mb-4">No API keys yet</p>
            <Button onClick={() => setShowAdd(true)} className="bg-orange-500 hover:bg-orange-600 text-white text-xs h-8">
              <Plus size={13} className="mr-1" /> Create Key
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            {keys.map(key => (
              <div key={key.id} className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-4">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <p className="text-sm font-semibold text-zinc-100">{key.name}</p>
                    <p className="text-xs font-mono text-zinc-500">{key.keyPrefix}••••••••••••</p>
                  </div>
                  <button onClick={() => handleDelete(key.id)}
                    className="p-1.5 text-zinc-600 hover:text-red-400 rounded transition-colors">
                    <Trash2 size={13} />
                  </button>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { label: "Today",    value: key.sendsToday,      limit: key.dailyLimit },
                    { label: "Month",    value: key.sendsThisMonth,  limit: key.monthlyLimit },
                    { label: "Domain",   value: key.fromDomain ?? "default", limit: null },
                  ].map(stat => (
                    <div key={stat.label} className="rounded-lg bg-zinc-800/40 p-2">
                      <p className="text-[10px] text-zinc-600">{stat.label}</p>
                      <p className="text-sm font-bold text-zinc-200">
                        {stat.limit !== null ? `${stat.value}/${stat.limit}` : stat.value}
                      </p>
                      {stat.limit !== null && (
                        <div className="mt-1 h-1 rounded-full bg-zinc-700 overflow-hidden">
                          <div className={cn("h-full rounded-full transition-all",
                            (stat.value / stat.limit) > 0.9 ? "bg-red-400" :
                            (stat.value / stat.limit) > 0.7 ? "bg-yellow-400" : "bg-green-400"
                          )} style={{ width: `${Math.min(100, (stat.value / stat.limit) * 100)}%` }} />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )
      ) : (
        sends.length === 0 ? (
          <div className="text-center py-12 text-zinc-600 text-sm">No emails sent yet.</div>
        ) : (
          <div className="space-y-2">
            {sends.map(send => (
              <div key={send.id} className="flex items-center gap-3 rounded-lg border border-zinc-800 bg-zinc-900/40 p-3">
                {send.status === "sent" ? <CheckCircle2 size={14} className="text-green-400 flex-shrink-0" /> :
                  <AlertCircle size={14} className="text-red-400 flex-shrink-0" />}
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-zinc-200 truncate">{send.subject}</p>
                  <p className="text-[11px] text-zinc-500">{send.fromAddress} → {send.toAddress}</p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-[10px] text-zinc-500">{send.provider}</p>
                  <p className="text-[10px] text-zinc-600">{new Date(send.sentAt).toLocaleString()}</p>
                </div>
              </div>
            ))}
          </div>
        )
      )}

      {showAdd && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
          <div className="w-full max-w-sm bg-zinc-900 border border-zinc-700 rounded-2xl overflow-hidden">
            <div className="flex items-center justify-between p-5 border-b border-zinc-800">
              <h2 className="font-bold text-white">Create Email API Key</h2>
              <button onClick={() => setShowAdd(false)} className="text-zinc-500 hover:text-white"><X size={18} /></button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <Label className="text-xs text-zinc-400 mb-1.5 block">Key name</Label>
                <Input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
                  placeholder="Production" className="bg-zinc-800 border-zinc-700 text-white h-9 text-sm" />
              </div>
              <div>
                <Label className="text-xs text-zinc-400 mb-1.5 block">From domain (optional)</Label>
                <Input value={form.fromDomain} onChange={e => setForm(p => ({ ...p, fromDomain: e.target.value }))}
                  placeholder="myapp.com" className="bg-zinc-800 border-zinc-700 text-white h-9 text-sm" />
              </div>
              <Button onClick={handleCreate} disabled={adding}
                className="w-full bg-orange-500 hover:bg-orange-600 text-white">
                {adding ? <Loader2 size={14} className="animate-spin mr-2" /> : null}
                Generate Key
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
