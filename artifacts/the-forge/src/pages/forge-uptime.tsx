import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import {
  Activity, Plus, Trash2, RefreshCw, AlertCircle, CheckCircle2,
  Clock, Loader2, X, Bell, BellOff, ChevronRight, Globe,
  ExternalLink, Pause, Play,
} from "lucide-react";

const API = import.meta.env.BASE_URL.replace(/\/$/, "");

interface Monitor {
  id: number;
  name: string;
  url: string;
  status: "up" | "down" | "unknown" | "timeout" | "error";
  intervalSeconds: number;
  uptimePercent: number | null;
  avgResponseMs: number | null;
  alertEmail: string | null;
  paused: boolean;
  lastCheckedAt: string | null;
}

export default function ForgeUptime() {
  const [monitors, setMonitors] = useState<Monitor[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [checking, setChecking] = useState<number | null>(null);
  const [form, setForm] = useState({ name: "", url: "", alertEmail: "", intervalSeconds: "60" });
  const [adding, setAdding] = useState(false);

  const fetchMonitors = useCallback(async () => {
    const r = await fetch(`${API}/api/uptime/monitors`, { credentials: "include" });
    if (r.ok) setMonitors(await r.json().then(d => d.monitors ?? []));
    setLoading(false);
  }, []);

  useEffect(() => { fetchMonitors(); }, [fetchMonitors]);

  const handleAdd = async () => {
    if (!form.name || !form.url) return;
    setAdding(true);
    try {
      const r = await fetch(`${API}/api/uptime/monitors`, {
        method: "POST", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, intervalSeconds: parseInt(form.intervalSeconds) }),
      });
      if (r.ok) {
        const data = await r.json();
        setMonitors(prev => [data.monitor, ...prev]);
        setForm({ name: "", url: "", alertEmail: "", intervalSeconds: "60" });
        setShowAdd(false);
      }
    } finally { setAdding(false); }
  };

  const handleDelete = async (id: number) => {
    await fetch(`${API}/api/uptime/monitors/${id}`, { method: "DELETE", credentials: "include" });
    setMonitors(prev => prev.filter(m => m.id !== id));
  };

  const handleCheck = async (id: number) => {
    setChecking(id);
    try {
      const r = await fetch(`${API}/api/uptime/monitors/${id}/check`, { method: "POST", credentials: "include" });
      if (r.ok) {
        const data = await r.json();
        setMonitors(prev => prev.map(m => m.id === id ? data.monitor : m));
      }
    } finally { setChecking(null); }
  };

  const handleTogglePause = async (monitor: Monitor) => {
    await fetch(`${API}/api/uptime/monitors/${monitor.id}`, {
      method: "PATCH", credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ paused: !monitor.paused }),
    });
    setMonitors(prev => prev.map(m => m.id === monitor.id ? { ...m, paused: !m.paused } : m));
  };

  const up = monitors.filter(m => m.status === "up").length;
  const down = monitors.filter(m => m.status === "down" || m.status === "timeout" || m.status === "error").length;

  return (
    <div className="min-h-screen bg-black text-white px-4 py-8 max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <Activity size={22} className="text-orange-400" />
          <div>
            <h1 className="text-xl font-bold">Uptime Monitoring</h1>
            <p className="text-xs text-zinc-500">Ping your URLs every minute. Get alerted when they go down.</p>
          </div>
        </div>
        <Button
          onClick={() => setShowAdd(true)}
          className="bg-orange-500 hover:bg-orange-600 text-white h-8 text-xs gap-1"
        >
          <Plus size={13} /> Add Monitor
        </Button>
      </div>

      {/* Summary */}
      {monitors.length > 0 && (
        <div className="grid grid-cols-3 gap-3 mb-6">
          {[
            { label: "Total",       value: monitors.length, color: "text-zinc-300" },
            { label: "Up",          value: up,              color: "text-green-400" },
            { label: "Down",        value: down,            color: down > 0 ? "text-red-400" : "text-zinc-500" },
          ].map(s => (
            <div key={s.label} className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-3 text-center">
              <p className={cn("text-2xl font-bold", s.color)}>{s.value}</p>
              <p className="text-[11px] text-zinc-500 mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>
      )}

      {/* Monitors list */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 size={20} className="animate-spin text-zinc-500" />
        </div>
      ) : monitors.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-zinc-800 p-12 text-center">
          <Activity size={28} className="text-zinc-600 mx-auto mb-3" />
          <p className="text-sm font-semibold text-zinc-400 mb-1">No monitors yet</p>
          <p className="text-xs text-zinc-600 mb-4">Add your first URL to start tracking uptime.</p>
          <Button onClick={() => setShowAdd(true)} className="bg-orange-500 hover:bg-orange-600 text-white text-xs h-8">
            <Plus size={13} className="mr-1" /> Add Monitor
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          {monitors.map(monitor => (
            <div key={monitor.id} className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className={cn("w-2.5 h-2.5 rounded-full flex-shrink-0 mt-0.5",
                    monitor.paused ? "bg-zinc-600" :
                    monitor.status === "up" ? "bg-green-400 shadow-[0_0_6px_#4ade80]" :
                    monitor.status === "unknown" ? "bg-zinc-500" :
                    "bg-red-400 shadow-[0_0_6px_#f87171] animate-pulse"
                  )} />
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-zinc-100 truncate">{monitor.name}</p>
                    <a href={monitor.url} target="_blank" rel="noopener noreferrer"
                      className="text-xs text-zinc-500 hover:text-orange-400 transition-colors truncate flex items-center gap-1">
                      {monitor.url.replace(/^https?:\/\//, "")} <ExternalLink size={10} />
                    </a>
                  </div>
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  <button onClick={() => handleCheck(monitor.id)} disabled={checking === monitor.id}
                    className="p-1.5 text-zinc-600 hover:text-white rounded transition-colors">
                    {checking === monitor.id ? <Loader2 size={13} className="animate-spin" /> : <RefreshCw size={13} />}
                  </button>
                  <button onClick={() => handleTogglePause(monitor)}
                    className="p-1.5 text-zinc-600 hover:text-white rounded transition-colors">
                    {monitor.paused ? <Play size={13} /> : <Pause size={13} />}
                  </button>
                  <button onClick={() => handleDelete(monitor.id)}
                    className="p-1.5 text-zinc-600 hover:text-red-400 rounded transition-colors">
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>

              <div className="flex items-center gap-4 mt-3">
                {monitor.uptimePercent !== null && (
                  <div>
                    <p className="text-[10px] text-zinc-600">Uptime</p>
                    <p className={cn("text-sm font-bold", monitor.uptimePercent >= 99 ? "text-green-400" : monitor.uptimePercent >= 95 ? "text-yellow-400" : "text-red-400")}>
                      {monitor.uptimePercent.toFixed(1)}%
                    </p>
                  </div>
                )}
                {monitor.avgResponseMs !== null && (
                  <div>
                    <p className="text-[10px] text-zinc-600">Avg response</p>
                    <p className={cn("text-sm font-bold", monitor.avgResponseMs < 500 ? "text-green-400" : monitor.avgResponseMs < 2000 ? "text-yellow-400" : "text-red-400")}>
                      {monitor.avgResponseMs}ms
                    </p>
                  </div>
                )}
                <div>
                  <p className="text-[10px] text-zinc-600">Interval</p>
                  <p className="text-sm font-bold text-zinc-300">{monitor.intervalSeconds}s</p>
                </div>
                {monitor.alertEmail && (
                  <div className="flex items-center gap-1 text-[11px] text-zinc-500">
                    <Bell size={11} className="text-orange-400" /> {monitor.alertEmail}
                  </div>
                )}
                {monitor.lastCheckedAt && (
                  <div className="ml-auto">
                    <p className="text-[10px] text-zinc-600">Last check</p>
                    <p className="text-[11px] text-zinc-400">
                      {new Date(monitor.lastCheckedAt).toLocaleTimeString()}
                    </p>
                  </div>
                )}
              </div>

              {/* Status bar */}
              <div className="mt-3">
                <a href={`/status/${monitor.name.toLowerCase().replace(/\s+/g, "-")}`}
                  target="_blank" rel="noopener noreferrer"
                  className="text-[10px] text-zinc-600 hover:text-orange-400 flex items-center gap-1">
                  <Globe size={10} /> Public status page <ChevronRight size={10} />
                </a>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add Modal */}
      {showAdd && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-zinc-900 border border-zinc-700 rounded-2xl overflow-hidden">
            <div className="flex items-center justify-between p-5 border-b border-zinc-800">
              <h2 className="font-bold text-white">Add Monitor</h2>
              <button onClick={() => setShowAdd(false)} className="text-zinc-500 hover:text-white">
                <X size={18} />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <Label className="text-xs text-zinc-400 mb-1.5 block">Name</Label>
                <Input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
                  placeholder="My App" className="bg-zinc-800 border-zinc-700 text-white h-9 text-sm" />
              </div>
              <div>
                <Label className="text-xs text-zinc-400 mb-1.5 block">URL to ping</Label>
                <Input value={form.url} onChange={e => setForm(p => ({ ...p, url: e.target.value }))}
                  placeholder="https://myapp.13moonforge.ai" className="bg-zinc-800 border-zinc-700 text-white h-9 text-sm" />
              </div>
              <div>
                <Label className="text-xs text-zinc-400 mb-1.5 block">Alert email (optional)</Label>
                <Input value={form.alertEmail} onChange={e => setForm(p => ({ ...p, alertEmail: e.target.value }))}
                  placeholder="you@example.com" type="email" className="bg-zinc-800 border-zinc-700 text-white h-9 text-sm" />
              </div>
              <div>
                <Label className="text-xs text-zinc-400 mb-1.5 block">Check interval</Label>
                <select value={form.intervalSeconds} onChange={e => setForm(p => ({ ...p, intervalSeconds: e.target.value }))}
                  className="w-full bg-zinc-800 border border-zinc-700 text-white h-9 text-sm rounded-md px-3">
                  <option value="30">Every 30 seconds</option>
                  <option value="60">Every minute</option>
                  <option value="300">Every 5 minutes</option>
                  <option value="600">Every 10 minutes</option>
                </select>
              </div>
              <Button onClick={handleAdd} disabled={adding || !form.name || !form.url}
                className="w-full bg-orange-500 hover:bg-orange-600 text-white">
                {adding ? <Loader2 size={14} className="animate-spin mr-2" /> : null}
                Start Monitoring
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
