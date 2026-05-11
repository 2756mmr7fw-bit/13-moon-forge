import { useState } from "react";
import { Database, Play, Table, ChevronRight, AlertCircle, RefreshCw, Copy, Check } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { getAuthToken } from "@workspace/api-client-react";

interface QueryResult {
  rows: Record<string, unknown>[];
  rowCount: number;
  duration: number;
  command: string;
}

interface TableInfo {
  name: string;
  rowCount: number;
  sizeBytes: number;
}

export default function DatabaseManagerPage() {
  const [sql, setSql] = useState("SELECT NOW();");
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<QueryResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [tables, setTables] = useState<TableInfo[]>([]);
  const [tablesLoading, setTablesLoading] = useState(false);
  const [tablesLoaded, setTablesLoaded] = useState(false);
  const [copied, setCopied] = useState(false);

  async function runQuery() {
    if (!sql.trim()) return;
    setRunning(true);
    setError(null);
    setResult(null);
    const token = await getAuthToken();
    try {
      const res = await fetch("/api/db-manager/query", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ sql }),
      });
      const json = await res.json() as QueryResult & { error?: string };
      if (!res.ok || json.error) {
        setError(json.error ?? `HTTP ${res.status}`);
      } else {
        setResult(json);
      }
    } catch (e) {
      setError(String(e));
    }
    setRunning(false);
  }

  async function loadTables() {
    setTablesLoading(true);
    const token = await getAuthToken();
    const res = await fetch("/api/db-manager/tables", {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.ok) {
      const json = await res.json() as TableInfo[];
      setTables(json);
      setTablesLoaded(true);
    }
    setTablesLoading(false);
  }

  function clickTable(name: string) {
    setSql(`SELECT * FROM "${name}" LIMIT 50;`);
  }

  function copyResult() {
    if (!result) return;
    navigator.clipboard.writeText(JSON.stringify(result.rows, null, 2)).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  const cols = result?.rows?.[0] ? Object.keys(result.rows[0]) : [];

  return (
    <div className="max-w-5xl mx-auto p-6 space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-serif font-bold flex items-center gap-2">
          <Database className="w-6 h-6 text-primary" />
          Database Manager
        </h1>
        <p className="text-sm text-muted-foreground">
          Run SQL queries directly against the Forge database. Read-only for safety — use raw SQL for writes only when you're certain.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Table browser */}
        <Card className="md:col-span-1">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium">Tables</CardTitle>
              <Button
                size="sm" variant="ghost"
                onClick={loadTables}
                disabled={tablesLoading}
                className="h-7 w-7 p-0"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${tablesLoading ? "animate-spin" : ""}`} />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {!tablesLoaded ? (
              <div className="px-4 pb-4">
                <Button size="sm" variant="outline" className="w-full text-xs" onClick={loadTables} disabled={tablesLoading}>
                  {tablesLoading ? "Loading…" : "Load tables"}
                </Button>
              </div>
            ) : tables.length === 0 ? (
              <p className="text-xs text-muted-foreground px-4 pb-4">No tables found</p>
            ) : (
              <div className="divide-y">
                {tables.map(t => (
                  <button
                    key={t.name}
                    onClick={() => clickTable(t.name)}
                    className="w-full flex items-center justify-between px-3 py-2 text-xs hover:bg-muted/50 transition-colors text-left"
                  >
                    <div className="flex items-center gap-1.5">
                      <Table className="w-3 h-3 text-muted-foreground shrink-0" />
                      <span className="truncate font-mono">{t.name}</span>
                    </div>
                    <ChevronRight className="w-3 h-3 text-muted-foreground shrink-0" />
                  </button>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Query editor + results */}
        <div className="md:col-span-3 space-y-4">
          <Card>
            <CardContent className="p-4 space-y-3">
              <Textarea
                value={sql}
                onChange={e => setSql(e.target.value)}
                rows={5}
                placeholder="SELECT * FROM projects LIMIT 10;"
                className="font-mono text-sm resize-none"
                onKeyDown={e => {
                  if ((e.metaKey || e.ctrlKey) && e.key === "Enter") { e.preventDefault(); runQuery(); }
                }}
              />
              <div className="flex items-center justify-between">
                <p className="text-xs text-muted-foreground">Ctrl+Enter to run</p>
                <Button size="sm" onClick={runQuery} disabled={running} className="gap-1">
                  {running
                    ? <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    : <Play className="w-3.5 h-3.5" />
                  }
                  Run query
                </Button>
              </div>
            </CardContent>
          </Card>

          {error && (
            <div className="flex items-start gap-2 text-sm text-destructive bg-destructive/10 px-4 py-3 rounded-lg">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <pre className="whitespace-pre-wrap font-mono text-xs">{error}</pre>
            </div>
          )}

          {result && (
            <Card>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CardTitle className="text-sm font-medium">Results</CardTitle>
                    <Badge variant="secondary" className="text-xs">
                      {result.rowCount} row{result.rowCount !== 1 ? "s" : ""}
                    </Badge>
                    <span className="text-xs text-muted-foreground">{result.duration}ms</span>
                  </div>
                  <Button size="sm" variant="ghost" onClick={copyResult} className="h-7 text-xs gap-1">
                    {copied ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
                    {copied ? "Copied" : "Copy JSON"}
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                {result.rows.length === 0 ? (
                  <p className="text-sm text-muted-foreground px-4 pb-4">Query executed — no rows returned.</p>
                ) : (
                  <div className="overflow-auto max-h-80">
                    <table className="w-full text-xs">
                      <thead className="sticky top-0 bg-muted/80 backdrop-blur">
                        <tr>
                          {cols.map(c => (
                            <th key={c} className="text-left px-3 py-2 font-medium text-muted-foreground border-b whitespace-nowrap">
                              {c}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {result.rows.map((row, i) => (
                          <tr key={i} className="hover:bg-muted/30">
                            {cols.map(c => (
                              <td key={c} className="px-3 py-2 max-w-xs truncate font-mono">
                                {row[c] === null ? (
                                  <span className="text-muted-foreground/50 italic">null</span>
                                ) : typeof row[c] === "object" ? (
                                  JSON.stringify(row[c])
                                ) : (
                                  String(row[c])
                                )}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
