import { useState, useCallback } from "react";
import Editor from "@monaco-editor/react";
import { getAuthToken } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from "@/components/ui/select";
import {
  Copy, Check, Download, Save, FileCode2, Loader2, CheckCircle2, Info,
} from "lucide-react";
import { cn } from "@/lib/utils";

const API_BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

const LANGUAGES = [
  { id: "javascript", label: "JavaScript" },
  { id: "typescript", label: "TypeScript" },
  { id: "python",     label: "Python" },
  { id: "gdscript",   label: "GDScript (Godot)" },
  { id: "csharp",     label: "C# (Unity)" },
  { id: "cpp",        label: "C++ (Unreal)" },
  { id: "html",       label: "HTML" },
  { id: "css",        label: "CSS" },
  { id: "json",       label: "JSON" },
  { id: "markdown",   label: "Markdown" },
  { id: "sql",        label: "SQL" },
  { id: "shell",      label: "Shell / Bash" },
  { id: "rust",       label: "Rust" },
  { id: "go",         label: "Go" },
  { id: "java",       label: "Java" },
  { id: "plaintext",  label: "Plain Text" },
];

const EXT_MAP: Record<string, string> = {
  javascript: "js", typescript: "ts", python: "py", gdscript: "gd",
  csharp: "cs", cpp: "cpp", html: "html", css: "css", json: "json",
  markdown: "md", sql: "sql", shell: "sh", rust: "rs", go: "go",
  java: "java", plaintext: "txt",
};

async function authFetch(url: string, opts: RequestInit = {}) {
  const token = await getAuthToken();
  return fetch(url, {
    ...opts,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(opts.headers ?? {}),
    },
  });
}

export default function DiyCodePage() {
  const [code, setCode]         = useState("// Start writing your code here\n");
  const [language, setLanguage] = useState("javascript");
  const [filename, setFilename] = useState("my-code.js");
  const [copied, setCopied]     = useState(false);
  const [saving, setSaving]     = useState(false);
  const [saveMsg, setSaveMsg]   = useState<{ ok: boolean; text: string } | null>(null);

  const autoFilename = useCallback((lang: string) => {
    const base = filename.replace(/\.[^.]+$/, "");
    return `${base}.${EXT_MAP[lang] ?? "txt"}`;
  }, [filename]);

  const handleLangChange = (lang: string) => {
    setLanguage(lang);
    setFilename(autoFilename(lang));
  };

  const handleFilenameChange = (val: string) => setFilename(val);

  const copy = async () => {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const download = () => {
    const blob = new Blob([code], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = filename;
    a.click(); URL.revokeObjectURL(url);
  };

  const saveToWorkspace = async () => {
    if (!code.trim()) return;
    setSaving(true); setSaveMsg(null);
    try {
      const r = await authFetch(`${API_BASE}/api/workspace`, {
        method: "POST",
        body: JSON.stringify({
          type: "code",
          name: filename,
          content: code,
          icon: "💻",
          color: "blue",
        }),
      });
      if (r.ok) {
        setSaveMsg({ ok: true, text: `Saved "${filename}" to Workspace` });
      } else {
        setSaveMsg({ ok: false, text: "Couldn't save — are you signed in?" });
      }
    } catch {
      setSaveMsg({ ok: false, text: "Network error" });
    } finally {
      setSaving(false);
      setTimeout(() => setSaveMsg(null), 4000);
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-64px)]">

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2 px-4 py-2 border-b border-border bg-card flex-shrink-0">
        <div className="flex items-center gap-1.5">
          <FileCode2 size={16} className="text-primary" />
          <span className="font-semibold text-sm">DIY Code Editor</span>
          <Badge variant="outline" className="text-xs text-green-400 border-green-400/30">No credits</Badge>
        </div>
        <div className="flex-1" />

        {/* Language */}
        <div className="flex items-center gap-2">
          <Label className="text-xs text-muted-foreground whitespace-nowrap">Language</Label>
          <Select value={language} onValueChange={handleLangChange}>
            <SelectTrigger className="h-7 text-xs w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {LANGUAGES.map(l => (
                <SelectItem key={l.id} value={l.id} className="text-xs">{l.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Filename */}
        <div className="flex items-center gap-2">
          <Label className="text-xs text-muted-foreground">File</Label>
          <Input
            value={filename}
            onChange={e => handleFilenameChange(e.target.value)}
            className="h-7 text-xs w-36"
            placeholder="filename.js"
          />
        </div>

        {/* Actions */}
        <Button size="sm" variant="outline" onClick={copy} className="h-7 gap-1.5 text-xs">
          {copied ? <Check size={12} className="text-green-400" /> : <Copy size={12} />}
          {copied ? "Copied" : "Copy"}
        </Button>
        <Button size="sm" variant="outline" onClick={download} className="h-7 gap-1.5 text-xs">
          <Download size={12} /> Download
        </Button>
        <Button
          size="sm"
          onClick={saveToWorkspace}
          disabled={saving || !code.trim()}
          className="h-7 gap-1.5 text-xs"
        >
          {saving
            ? <><Loader2 size={12} className="animate-spin" /> Saving…</>
            : <><Save size={12} /> Save to Workspace</>}
        </Button>
      </div>

      {/* Save message */}
      {saveMsg && (
        <div className={cn(
          "px-4 py-1.5 text-xs flex items-center gap-2 flex-shrink-0",
          saveMsg.ok ? "bg-green-500/10 text-green-400" : "bg-red-500/10 text-red-400"
        )}>
          {saveMsg.ok && <CheckCircle2 size={12} />}
          {saveMsg.text}
        </div>
      )}

      {/* Beginner tip banner */}
      <div className="flex items-start gap-2 px-4 py-2 bg-primary/5 border-b border-border/50 flex-shrink-0">
        <Info size={13} className="text-primary flex-shrink-0 mt-0.5" />
        <p className="text-xs text-muted-foreground leading-relaxed">
          <strong className="text-foreground">This editor uses zero credits.</strong>{" "}
          Write your own code, paste from anywhere, or edit something Forge generated.
          Hit <strong>Save to Workspace</strong> to keep it — or <strong>Download</strong> to grab the file.
          If you get stuck, head to <a href="/code-forge" className="text-primary hover:underline">Write Code</a> and ask Forge for help.
        </p>
      </div>

      {/* Monaco Editor */}
      <div className="flex-1 overflow-hidden">
        <Editor
          height="100%"
          language={language === "gdscript" ? "python" : language}
          value={code}
          onChange={v => setCode(v ?? "")}
          theme="vs-dark"
          options={{
            fontSize: 14,
            fontFamily: "'JetBrains Mono', 'Fira Code', 'Cascadia Code', monospace",
            minimap: { enabled: false },
            lineNumbers: "on",
            wordWrap: "on",
            scrollBeyondLastLine: false,
            automaticLayout: true,
            tabSize: 2,
            insertSpaces: true,
            formatOnPaste: true,
            renderWhitespace: "selection",
            bracketPairColorization: { enabled: true },
            padding: { top: 12, bottom: 12 },
          }}
        />
      </div>
    </div>
  );
}
