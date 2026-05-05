import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import {
  Zap, Plus, Trash2, Copy, Check, Loader2, X, Key,
  BarChart3, Activity,
} from "lucide-react";

const API = import.meta.env.BASE_URL.replace(/\/$/, "");

interface AiKey {
  id: number;
  name: string;
  keyPrefix: string;
  monthlyTokenLimit: number;
  tokensUsedThisMonth: number;
  allowedModels: string;
  active: boolean;
  createdAt: string;
  rawKey?: string;
}

interface AiUsage {
  id: number;
  model: string;
  provider: string;
  totalTokens: number;
  latencyMs: number | null;
  status: string;
  usedAt: string;
}

interface Model {
  id: string;
  name: string;
  provider: string;
  contextWindow: number;
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

const PROVIDER_COLORS: Record<string, string> = {
  openai: "text-green-400", anthropic: "text-orange-400",
  google: "text-blue-400", meta: "text-purple-400", mistral: "text-cyan-400",
};

export default function ForgeAi() {
  const [keys, setKeys] = useState<AiKey[]>([]);
  const [usage, setUsage] = useState<AiUsage[]>([]);
  const [models, setModels] = useState<Model[]>([]);
  const [totalTokens, setTotalTokens] = useState(0);
  const [byModel, setByModel] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ name: "Default", monthlyTokenLimit: "1000000" });
  const [adding, setAdding] = useState(false);
  const [newKey, setNewKey] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"keys" | "usage" | "models">("keys");

  const fetchData = useCallback(async () => {
    const [keysRes, usageRes, modelsRes] = await Promise.all([
      fetch(`${API}/api/ai/keys`, { credentials: "include" }),
      fetch(`${API}/api/ai/usage`, { credentials: "include" }),
      fetch(`${API}/api/ai/models`, { credentials: "include" }),
    ]);
    if (keysRes.ok) setKeys(await keysRes.json().then(d => d.keys ?? []));
    if (usageRes.ok) {
      const data = await usageRes.json();
      setUsage(data.usage ?? []);
      setTotalTokens(data.totalTokens ?? 0);
      setByModel(data.byModel ?? {});
    }
    if (modelsRes.ok) setModels(await modelsRes.json().then(d => d.models ?? []));
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleCreate = async () => {
    setAdding(true);
    try {
      const r = await fetch(`${API}/api/ai/keys`, {
        method: "POST", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, monthlyTokenLimit: parseInt(form.monthlyTokenLimit) }),
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
    await fetch(`${API}/api/ai/keys/${id}`, { method: "DELETE", credentials: "include" });
    setKeys(prev => prev.filter(k => k.id !== id));
  };

  return (
    <div className="min-h-screen bg-black text-white px-4 py-8 max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <Zap size={22} className="text-orange-400" />
          <div>
            <h1 className="text-xl font-bold">AI Gateway</h1>
            <p className="text-xs text-zinc-500">One key for all AI models. Usage tracking, cost caps, OpenAI-compatible.</p>
          </div>
        </div>
        <Button onClick={() => setShowAdd(true)} className="bg-orange-500 hover:bg-orange-600 text-white h-8 text-xs gap-1">
          <Plus size={13} /> New Key
        </Button>
      </div>

      {/* New key reveal */}
      {newKey && (
        <div className="rounded-xl border border-orange-500/30 bg-orange-500/5 p-4 mb-6">
          <p className="text-xs font-semibold text-orange-400 mb-2">⚠️ Copy your key — it won't be shown again</p>
          <div className="flex items-center gap-2 bg-black rounded-lg border border-orange-500/20 px-3 py-2">
            <span className="text-xs font-mono text-orange-300 flex-1 break-all">{newKey}</span>
            <CopyBtn text={newKey} />
          </div>
          <button onClick={() => setNewKey(null)} className="text-[11px] text-zinc-500 hover:text-white mt-2">Dismiss</button>
        </div>
      )}

      {/* OpenAI compatible notice */}
      <div className="rounded-xl border border-zinc-800 bg-zinc-900/20 p-4 mb-6">
        <p className="text-[11px] font-semibold text-zinc-500 mb-2 uppercase tracking-wider">100% OpenAI-compatible</p>
        <div className="bg-black rounded-lg border border-zinc-800 p-3 font-mono text-[11px] text-zinc-400 overflow-x-auto">
          <span className="text-orange-400">const</span>{` client = new OpenAI({\n  baseURL: "https://13moonforge.ai/api/ai",\n  apiKey: "YOUR_FORGE_KEY",\n});\n\n`}
          <span className="text-orange-400">const</span>{` res = await client.chat.completions.create({\n  model: "claude-3-5-sonnet",  // or gpt-4o, gemini-1.5-pro, llama-3.1-70b\n  messages: [{ role: "user", content: "Hello!" }],\n});`}
        </div>
      </div>

      {/* Stats row */}
      {totalTokens > 0 && (
        <div className="grid grid-cols-3 gap-3 mb-6">
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-3 text-center">
            <p className="text-xl font-bold text-orange-400">{(totalTokens / 1000).toFixed(1)}K</p>
            <p className="text-[11px] text-zinc-500">Total tokens</p>
          </div>
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-3 text-center">
            <p className="text-xl font-bold text-zinc-200">{usage.length}</p>
            <p className="text-[11px] text-zinc-500">Requests</p>
          </div>
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-3 text-center">
            <p className="text-xl font-bold text-zinc-200">{Object.keys(byModel).length}</p>
            <p className="text-[11px] text-zinc-500">Models used</p>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-0 border-b border-zinc-800 mb-4">
        {([
          { id: "keys", label: "API Keys" },
          { id: "usage", label: "Usage" },
          { id: "models", label: "Models" },
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
            {keys.map(key => {
              const pct = Math.min(100, (key.tokensUsedThisMonth / key.monthlyTokenLimit) * 100);
              return (
                <div key={key.id} className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <p className="text-sm font-semibold text-zinc-100">{key.name}</p>
                      <p className="text-xs font-mono text-zinc-500">{key.keyPrefix}••••••••</p>
                    </div>
                    <button onClick={() => handleDelete(key.id)}
                      className="p-1.5 text-zinc-600 hover:text-red-400 rounded transition-colors">
                      <Trash2 size={13} />
                    </button>
                  </div>
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-zinc-500">Monthly tokens</span>
                      <span className={pct > 90 ? "text-red-400" : pct > 70 ? "text-yellow-400" : "text-zinc-300"}>
                        {(key.tokensUsedThisMonth / 1000).toFixed(1)}K / {(key.monthlyTokenLimit / 1000).toFixed(0)}K
                      </span>
                    </div>
                    <div className="h-1.5 rounded-full bg-zinc-800 overflow-hidden">
                      <div className={cn("h-full rounded-full", pct > 90 ? "bg-red-400" : pct > 70 ? "bg-yellow-400" : "bg-orange-500")}
                        style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                  <p className="text-[10px] text-zinc-600 mt-2">
                    Models: {key.allowedModels === "*" ? "All models" : key.allowedModels}
                  </p>
                </div>
              );
            })}
          </div>
        )
      ) : activeTab === "usage" ? (
        usage.length === 0 ? (
          <div className="text-center py-12 text-zinc-600 text-sm">No usage yet. Make your first AI call.</div>
        ) : (
          <div className="space-y-2">
            {usage.slice(0, 50).map(u => (
              <div key={u.id} className="flex items-center gap-3 rounded-lg border border-zinc-800 bg-zinc-900/40 p-3">
                <Activity size={13} className={PROVIDER_COLORS[u.provider] ?? "text-zinc-400"} />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-mono text-zinc-300">{u.model}</p>
                  <p className="text-[11px] text-zinc-600">{u.provider}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs font-bold text-zinc-200">{u.totalTokens.toLocaleString()} tokens</p>
                  {u.latencyMs && <p className="text-[10px] text-zinc-600">{u.latencyMs}ms</p>}
                </div>
              </div>
            ))}
          </div>
        )
      ) : (
        <div className="grid grid-cols-1 gap-2">
          {models.map(model => (
            <div key={model.id} className="flex items-center gap-3 rounded-xl border border-zinc-800 bg-zinc-900/40 p-3">
              <div className="flex-1">
                <p className="text-sm font-semibold text-zinc-200">{model.name}</p>
                <p className={cn("text-[11px] capitalize", PROVIDER_COLORS[model.provider] ?? "text-zinc-500")}>{model.provider}</p>
              </div>
              <div className="text-right">
                <p className="text-xs text-zinc-500">{(model.contextWindow / 1000).toFixed(0)}K context</p>
                <p className="text-[10px] font-mono text-zinc-600">{model.id}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {showAdd && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
          <div className="w-full max-w-sm bg-zinc-900 border border-zinc-700 rounded-2xl overflow-hidden">
            <div className="flex items-center justify-between p-5 border-b border-zinc-800">
              <h2 className="font-bold text-white">Create AI Gateway Key</h2>
              <button onClick={() => setShowAdd(false)} className="text-zinc-500 hover:text-white"><X size={18} /></button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <Label className="text-xs text-zinc-400 mb-1.5 block">Key name</Label>
                <Input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
                  className="bg-zinc-800 border-zinc-700 text-white h-9 text-sm" />
              </div>
              <div>
                <Label className="text-xs text-zinc-400 mb-1.5 block">Monthly token limit</Label>
                <select value={form.monthlyTokenLimit} onChange={e => setForm(p => ({ ...p, monthlyTokenLimit: e.target.value }))}
                  className="w-full bg-zinc-800 border border-zinc-700 text-white h-9 text-sm rounded-md px-3">
                  <option value="100000">100K tokens</option>
                  <option value="500000">500K tokens</option>
                  <option value="1000000">1M tokens</option>
                  <option value="5000000">5M tokens</option>
                  <option value="999999999">Unlimited</option>
                </select>
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
