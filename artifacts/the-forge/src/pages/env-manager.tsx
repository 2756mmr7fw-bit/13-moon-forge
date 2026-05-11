import { useState, useEffect } from "react";
import { KeyRound, Plus, Trash2, Eye, EyeOff, Save, RefreshCw, AlertCircle, ChevronDown, Server } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { getAuthToken } from "@workspace/api-client-react";

interface CoolifyApp {
  id: string;
  name: string;
  kind: "app" | "service";
  status: string;
  url: string | null;
}

interface EnvVar {
  id?: number;
  key: string;
  value: string;
  is_preview?: boolean;
  is_build_time?: boolean;
  dirty?: boolean;
}

export default function EnvManagerPage() {
  const [apps, setApps] = useState<CoolifyApp[]>([]);
  const [appsLoading, setAppsLoading] = useState(true);
  const [connected, setConnected] = useState(false);
  const [selectedApp, setSelectedApp] = useState<CoolifyApp | null>(null);
  const [envVars, setEnvVars] = useState<EnvVar[]>([]);
  const [envLoading, setEnvLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showValues, setShowValues] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saveMsg, setSaveMsg] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const token = await getAuthToken();
      const res = await fetch("/api/coolify/apps", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json() as { connected: boolean; apps: CoolifyApp[] };
      setConnected(json.connected);
      setApps(json.apps ?? []);
      setAppsLoading(false);
    })();
  }, []);

  async function loadEnvVars(app: CoolifyApp) {
    if (selectedApp?.id === app.id) { setSelectedApp(null); setEnvVars([]); return; }
    setSelectedApp(app);
    setEnvLoading(true);
    setError(null);
    try {
      const token = await getAuthToken();
      const res = await fetch(`/api/coolify/envs/${app.id}?kind=${app.kind}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json() as EnvVar[];
      setEnvVars(json.map(v => ({ ...v, dirty: false })));
    } catch (e) {
      setError("Could not load env vars. Check your Coolify connection in Self-Host settings.");
      setEnvVars([]);
    }
    setEnvLoading(false);
  }

  function updateVar(idx: number, field: "key" | "value", val: string) {
    setEnvVars(prev => prev.map((v, i) => i === idx ? { ...v, [field]: val, dirty: true } : v));
  }

  function addVar() {
    setEnvVars(prev => [...prev, { key: "", value: "", dirty: true }]);
  }

  function removeVar(idx: number) {
    setEnvVars(prev => prev.filter((_, i) => i !== idx));
  }

  async function save() {
    if (!selectedApp) return;
    setSaving(true);
    setSaveMsg(null);
    setError(null);
    try {
      const token = await getAuthToken();
      const res = await fetch(`/api/coolify/envs/${selectedApp.id}?kind=${selectedApp.kind}`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ envs: envVars }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setSaveMsg("Saved — redeploy your app for changes to take effect.");
      setEnvVars(prev => prev.map(v => ({ ...v, dirty: false })));
    } catch {
      setError("Failed to save. Check your Coolify connection.");
    }
    setSaving(false);
  }

  if (appsLoading) {
    return (
      <div className="max-w-3xl mx-auto p-6 space-y-4">
        <div className="h-8 bg-muted rounded w-48 animate-pulse" />
        <div className="h-32 bg-muted rounded-xl animate-pulse" />
      </div>
    );
  }

  if (!connected) {
    return (
      <div className="max-w-3xl mx-auto p-6 space-y-6">
        <h1 className="text-2xl font-serif font-bold flex items-center gap-2">
          <KeyRound className="w-6 h-6 text-primary" />
          Env Manager
        </h1>
        <Card className="text-center py-16">
          <CardContent className="space-y-4">
            <Server className="w-10 h-10 text-muted-foreground/40 mx-auto" />
            <p className="font-medium">No Coolify connection</p>
            <p className="text-sm text-muted-foreground max-w-sm mx-auto">
              Connect your Coolify server in <span className="text-primary">Self-Host → Connections</span> to manage environment variables for your deployed apps.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const dirtyCount = envVars.filter(v => v.dirty).length;

  return (
    <div className="max-w-3xl mx-auto p-6 space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-serif font-bold flex items-center gap-2">
          <KeyRound className="w-6 h-6 text-primary" />
          Env Manager
        </h1>
        <p className="text-muted-foreground text-sm">
          View and edit environment variables for apps deployed on your Coolify server.
        </p>
      </div>

      <div className="space-y-3">
        {apps.map(app => (
          <div key={app.id}>
            <Card
              className="cursor-pointer hover:border-primary/50 transition-colors"
              onClick={() => loadEnvVars(app)}
            >
              <CardContent className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Server className="w-4 h-4 text-muted-foreground" />
                  <div>
                    <p className="font-medium text-sm">{app.name}</p>
                    {app.url && <p className="text-xs text-muted-foreground">{app.url}</p>}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge
                    variant={app.status === "running" ? "default" : "secondary"}
                    className="text-xs"
                  >
                    {app.status}
                  </Badge>
                  <ChevronDown
                    className={`w-4 h-4 text-muted-foreground transition-transform ${selectedApp?.id === app.id ? "rotate-180" : ""}`}
                  />
                </div>
              </CardContent>
            </Card>

            {selectedApp?.id === app.id && (
              <div className="mt-2 ml-4 space-y-3">
                {error && (
                  <div className="flex items-center gap-2 text-sm text-destructive bg-destructive/10 px-3 py-2 rounded-lg">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    {error}
                  </div>
                )}
                {saveMsg && (
                  <div className="text-sm text-green-600 bg-green-50 dark:bg-green-950/30 px-3 py-2 rounded-lg">
                    {saveMsg}
                  </div>
                )}
                {envLoading ? (
                  <div className="h-32 bg-muted/50 rounded-xl animate-pulse" />
                ) : (
                  <Card>
                    <CardHeader className="pb-2 flex flex-row items-center justify-between">
                      <CardTitle className="text-sm font-medium">
                        Environment Variables {envVars.length > 0 && <span className="text-muted-foreground font-normal">({envVars.length})</span>}
                      </CardTitle>
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setShowValues(v => !v)}
                          className="h-7 text-xs gap-1"
                        >
                          {showValues ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                          {showValues ? "Hide" : "Show"} values
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      {envVars.length === 0 && !error && (
                        <p className="text-sm text-muted-foreground text-center py-4">No env vars set yet</p>
                      )}
                      {envVars.map((v, i) => (
                        <div key={i} className="flex items-center gap-2">
                          <Input
                            value={v.key}
                            onChange={e => updateVar(i, "key", e.target.value)}
                            placeholder="KEY"
                            className="font-mono text-xs flex-1"
                          />
                          <Input
                            type={showValues ? "text" : "password"}
                            value={v.value}
                            onChange={e => updateVar(i, "value", e.target.value)}
                            placeholder="value"
                            className="font-mono text-xs flex-1"
                          />
                          {v.dirty && <div className="w-1.5 h-1.5 rounded-full bg-orange-400 shrink-0" title="Unsaved" />}
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => removeVar(i)}
                            className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      ))}
                      <div className="flex items-center justify-between pt-2">
                        <Button size="sm" variant="outline" onClick={addVar} className="gap-1 text-xs">
                          <Plus className="w-3.5 h-3.5" /> Add variable
                        </Button>
                        {dirtyCount > 0 && (
                          <Button size="sm" onClick={save} disabled={saving} className="gap-1 text-xs">
                            {saving ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                            Save {dirtyCount} change{dirtyCount !== 1 ? "s" : ""}
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
