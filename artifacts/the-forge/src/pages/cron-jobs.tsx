import { useState, useEffect } from "react";
import { Timer, Plus, Trash2, Play, Pause, RefreshCw, AlertCircle, Server, CheckCircle, Clock } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { getAuthToken } from "@workspace/api-client-react";

interface CronJob {
  id: number;
  name: string;
  schedule: string;
  command: string;
  appId: string | null;
  enabled: boolean;
  lastRun: string | null;
  lastStatus: "success" | "error" | "running" | null;
  createdAt: string;
}

const CRON_PRESETS = [
  { label: "Every minute",  value: "* * * * *" },
  { label: "Every 5 min",   value: "*/5 * * * *" },
  { label: "Every hour",    value: "0 * * * *" },
  { label: "Every day at midnight", value: "0 0 * * *" },
  { label: "Every Sunday",  value: "0 0 * * 0" },
  { label: "First of month", value: "0 0 1 * *" },
];

export default function CronJobsPage() {
  const [jobs, setJobs] = useState<CronJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({ name: "", schedule: "0 * * * *", command: "" });

  async function load() {
    const token = await getAuthToken();
    const res = await fetch("/api/cron-jobs", { headers: { Authorization: `Bearer ${token}` } });
    if (res.ok) {
      const json = await res.json() as CronJob[];
      setJobs(json);
    }
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function createJob() {
    if (!form.name.trim() || !form.schedule.trim() || !form.command.trim()) {
      setError("Name, schedule, and command are all required.");
      return;
    }
    setSaving(true);
    setError(null);
    const token = await getAuthToken();
    const res = await fetch("/api/cron-jobs", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    if (res.ok) {
      const job = await res.json() as CronJob;
      setJobs(prev => [job, ...prev]);
      setForm({ name: "", schedule: "0 * * * *", command: "" });
      setCreating(false);
    } else {
      const j = await res.json() as { error?: string };
      setError(j.error ?? "Failed to create job");
    }
    setSaving(false);
  }

  async function toggleJob(id: number, enabled: boolean) {
    const token = await getAuthToken();
    await fetch(`/api/cron-jobs/${id}`, {
      method: "PATCH",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ enabled: !enabled }),
    });
    setJobs(prev => prev.map(j => j.id === id ? { ...j, enabled: !enabled } : j));
  }

  async function deleteJob(id: number) {
    const token = await getAuthToken();
    await fetch(`/api/cron-jobs/${id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });
    setJobs(prev => prev.filter(j => j.id !== id));
  }

  async function runNow(id: number) {
    const token = await getAuthToken();
    await fetch(`/api/cron-jobs/${id}/run`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
    });
    await load();
  }

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto p-6 space-y-4">
        <div className="h-8 bg-muted rounded w-48 animate-pulse" />
        <div className="h-32 bg-muted rounded-xl animate-pulse" />
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto p-6 space-y-6">
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <h1 className="text-2xl font-serif font-bold flex items-center gap-2">
            <Timer className="w-6 h-6 text-primary" />
            Cron Jobs
          </h1>
          <p className="text-sm text-muted-foreground">
            Scheduled tasks that run on your Forge server. Commands are executed server-side.
          </p>
        </div>
        <Button onClick={() => setCreating(c => !c)} size="sm" className="gap-1">
          <Plus className="w-4 h-4" /> New Job
        </Button>
      </div>

      {creating && (
        <Card className="border-primary/30">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">New Scheduled Job</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {error && (
              <div className="flex items-center gap-2 text-sm text-destructive bg-destructive/10 px-3 py-2 rounded-lg">
                <AlertCircle className="w-4 h-4 shrink-0" /> {error}
              </div>
            )}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">Job name</label>
                <Input
                  value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  placeholder="Daily cleanup"
                  className="text-sm"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">Schedule (cron expression)</label>
                <Input
                  value={form.schedule}
                  onChange={e => setForm(f => ({ ...f, schedule: e.target.value }))}
                  placeholder="0 * * * *"
                  className="font-mono text-sm"
                />
              </div>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {CRON_PRESETS.map(p => (
                <button
                  key={p.value}
                  onClick={() => setForm(f => ({ ...f, schedule: p.value }))}
                  className={`text-xs px-2 py-1 rounded-md border transition-colors ${
                    form.schedule === p.value
                      ? "bg-primary/10 border-primary/40 text-primary"
                      : "border-border text-muted-foreground hover:border-primary/30"
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Command</label>
              <Input
                value={form.command}
                onChange={e => setForm(f => ({ ...f, command: e.target.value }))}
                placeholder="node /app/scripts/cleanup.js"
                className="font-mono text-sm"
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" size="sm" onClick={() => { setCreating(false); setError(null); }}>
                Cancel
              </Button>
              <Button size="sm" onClick={createJob} disabled={saving} className="gap-1">
                {saving ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
                Create
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {jobs.length === 0 && !creating ? (
        <Card className="text-center py-16">
          <CardContent className="space-y-3">
            <Clock className="w-10 h-10 text-muted-foreground/40 mx-auto" />
            <p className="font-medium">No cron jobs yet</p>
            <p className="text-sm text-muted-foreground">Schedule recurring tasks — cleanups, reports, backups — to run automatically on your server.</p>
            <Button size="sm" onClick={() => setCreating(true)} className="gap-1">
              <Plus className="w-3.5 h-3.5" /> Create your first job
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {jobs.map(job => (
            <Card key={job.id} className={`transition-opacity ${job.enabled ? "" : "opacity-60"}`}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm">{job.name}</span>
                      <Badge variant={job.enabled ? "default" : "secondary"} className="text-xs">
                        {job.enabled ? "Active" : "Paused"}
                      </Badge>
                      {job.lastStatus && (
                        <Badge
                          variant={job.lastStatus === "success" ? "outline" : "destructive"}
                          className="text-xs"
                        >
                          {job.lastStatus === "success" ? (
                            <CheckCircle className="w-3 h-3 mr-1" />
                          ) : (
                            <AlertCircle className="w-3 h-3 mr-1" />
                          )}
                          {job.lastStatus}
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      <span className="font-mono bg-muted px-1.5 py-0.5 rounded">{job.schedule}</span>
                      <span className="font-mono truncate max-w-[200px]">{job.command}</span>
                    </div>
                    {job.lastRun && (
                      <p className="text-xs text-muted-foreground">
                        Last run: {new Date(job.lastRun).toLocaleString()}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => runNow(job.id)}
                      className="h-8 w-8 p-0"
                      title="Run now"
                    >
                      <Play className="w-3.5 h-3.5" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => toggleJob(job.id, job.enabled)}
                      className="h-8 w-8 p-0"
                      title={job.enabled ? "Pause" : "Enable"}
                    >
                      {job.enabled ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5 text-green-500" />}
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => deleteJob(job.id)}
                      className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
