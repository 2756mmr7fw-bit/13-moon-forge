import { useState } from "react";
import { Link } from "wouter";
import {
  ArrowLeft, Plus, Trash2, Clock, DollarSign, ChevronDown, TrendingUp,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { useProjects, useLedger } from "@/hooks/use-projects";
import type { LedgerType } from "@/hooks/use-projects";

function formatDate(ts: number): string {
  return new Date(ts).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function formatHours(h: number): string {
  if (h < 1) return `${Math.round(h * 60)}m`;
  return `${h % 1 === 0 ? h : h.toFixed(1)}h`;
}

export default function LedgerPage() {
  const { projects } = useProjects();
  const [selectedProjectId, setSelectedProjectId] = useState<string | undefined>(undefined);
  const [pickerOpen, setPickerOpen] = useState(false);
  const { entries, addEntry, deleteEntry, totalTime, totalCost } = useLedger(selectedProjectId);

  const [addType, setAddType] = useState<LedgerType>("time");
  const [label, setLabel] = useState("");
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");

  const selectedProject = projects.find(p => p.id === selectedProjectId);

  const submit = () => {
    if (!label.trim() || !amount.trim()) return;
    const val = parseFloat(amount);
    if (isNaN(val) || val <= 0) return;
    addEntry({
      projectId: selectedProjectId ?? "general",
      type: addType,
      label: label.trim(),
      amount: val,
      unit: addType === "time" ? "hours" : "usd",
      note: note.trim() || undefined,
    });
    setLabel("");
    setAmount("");
    setNote("");
  };

  const timeEntries = entries.filter(e => e.type === "time");
  const costEntries = entries.filter(e => e.type === "cost");

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Back */}
      <Link href="/project-room" className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors">
        <ArrowLeft size={12} /> Project Room
      </Link>

      {/* Header */}
      <div className="rounded-xl border border-blue-500/30 bg-blue-500/10 p-5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-3xl">📒</span>
          <div>
            <h1 className="text-xl font-bold text-blue-400">Ledger</h1>
            <p className="text-xs text-muted-foreground">Pink Moon · The Thirteen Moons</p>
          </div>
        </div>

        {/* Project selector */}
        <div className="relative">
          <button
            onClick={() => setPickerOpen(v => !v)}
            className={cn(
              "flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs transition-colors",
              selectedProject
                ? "border-blue-500/30 text-blue-400 bg-blue-500/10"
                : "border-border text-muted-foreground hover:text-foreground hover:bg-muted"
            )}
          >
            <span>{selectedProject ? selectedProject.name : "All projects"}</span>
            <ChevronDown size={12} />
          </button>
          {pickerOpen && (
            <div className="absolute right-0 top-full mt-1 w-56 bg-popover border border-border rounded-lg shadow-lg z-20 overflow-hidden">
              <button
                onClick={() => { setSelectedProjectId(undefined); setPickerOpen(false); }}
                className="w-full text-left px-3 py-2 text-xs hover:bg-muted text-muted-foreground"
              >
                All projects
              </button>
              {projects.map(p => (
                <button key={p.id} onClick={() => { setSelectedProjectId(p.id); setPickerOpen(false); }}
                  className="w-full text-left px-3 py-2 text-xs hover:bg-muted border-t border-border/50">
                  <div className="font-medium">{p.name}</div>
                  <div className="text-muted-foreground">{p.phase}</div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Totals */}
      <div className="grid grid-cols-2 gap-4">
        <div className="border border-border rounded-xl p-4 bg-card/50">
          <div className="flex items-center gap-2 text-muted-foreground mb-1">
            <Clock size={14} /> <span className="text-xs">Total time</span>
          </div>
          <div className="text-2xl font-bold">{formatHours(totalTime)}</div>
          <p className="text-xs text-muted-foreground mt-0.5">{timeEntries.length} {timeEntries.length === 1 ? "entry" : "entries"}</p>
        </div>
        <div className="border border-border rounded-xl p-4 bg-card/50">
          <div className="flex items-center gap-2 text-muted-foreground mb-1">
            <DollarSign size={14} /> <span className="text-xs">Total spent</span>
          </div>
          <div className="text-2xl font-bold">${totalCost.toFixed(2)}</div>
          <p className="text-xs text-muted-foreground mt-0.5">{costEntries.length} {costEntries.length === 1 ? "entry" : "entries"}</p>
        </div>
      </div>

      {/* Add entry */}
      <div className="border border-border rounded-xl p-5 space-y-4 bg-card/30">
        <h2 className="font-semibold text-sm">Log an entry</h2>

        {/* Type toggle */}
        <div className="flex gap-2">
          {(["time", "cost"] as LedgerType[]).map(t => (
            <button
              key={t}
              onClick={() => setAddType(t)}
              className={cn(
                "flex-1 flex items-center justify-center gap-2 py-2 rounded-lg border text-sm font-medium transition-all",
                addType === t
                  ? t === "time" ? "border-blue-500/40 bg-blue-500/10 text-blue-400" : "border-emerald-500/40 bg-emerald-500/10 text-emerald-400"
                  : "border-border text-muted-foreground hover:text-foreground"
              )}
            >
              {t === "time" ? <Clock size={14} /> : <DollarSign size={14} />}
              {t === "time" ? "Time" : "Cost"}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div className="col-span-2">
            <Input
              value={label}
              onChange={e => setLabel(e.target.value)}
              placeholder={addType === "time" ? "What did you work on?" : "What did this cost?"}
            />
          </div>
          <div>
            <Input
              value={amount}
              onChange={e => setAmount(e.target.value)}
              placeholder={addType === "time" ? "Hours" : "$ Amount"}
              type="number"
              min="0"
              step={addType === "time" ? "0.5" : "0.01"}
            />
          </div>
        </div>

        <div className="flex gap-3">
          <Input
            value={note}
            onChange={e => setNote(e.target.value)}
            placeholder="Note (optional)"
            className="flex-1"
          />
          <Button onClick={submit} disabled={!label.trim() || !amount.trim()} className="gap-2 shrink-0">
            <Plus size={15} /> Log
          </Button>
        </div>
      </div>

      {/* Entry list */}
      {entries.length === 0 ? (
        <div className="border border-dashed border-border rounded-xl p-10 text-center space-y-2">
          <TrendingUp size={24} className="mx-auto text-muted-foreground/40" />
          <p className="text-sm text-muted-foreground">Nothing logged yet.</p>
          <p className="text-xs text-muted-foreground">Track your time and costs here — 15 minutes every Friday keeps the bleeding visible.</p>
        </div>
      ) : (
        <div className="space-y-2">
          <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">Entries</h2>
          {entries.map(e => (
            <div key={e.id} className="flex items-center gap-3 px-4 py-3 border border-border rounded-lg bg-card/30 group">
              <div className={cn("shrink-0", e.type === "time" ? "text-blue-400" : "text-emerald-400")}>
                {e.type === "time" ? <Clock size={14} /> : <DollarSign size={14} />}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium truncate">{e.label}</div>
                {e.note && <div className="text-xs text-muted-foreground truncate">{e.note}</div>}
              </div>
              <div className="text-right shrink-0">
                <div className="text-sm font-semibold">
                  {e.type === "time" ? formatHours(e.amount) : `$${e.amount.toFixed(2)}`}
                </div>
                <div className="text-[10px] text-muted-foreground">{formatDate(e.date)}</div>
              </div>
              <button
                onClick={() => deleteEntry(e.id)}
                className="opacity-0 group-hover:opacity-100 p-1.5 rounded hover:bg-destructive/10 hover:text-destructive transition-all shrink-0"
              >
                <Trash2 size={13} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
