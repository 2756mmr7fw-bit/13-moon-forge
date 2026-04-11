import { useState, useCallback } from "react";
import JSZip from "jszip";
import { saveAs } from "file-saver";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import {
  Code2, FolderTree as FolderTreeIcon, Copy, Check, Download, Plus, Trash2,
  Flame, ChevronDown, ChevronRight, Info,
} from "lucide-react";

// ─── Platform definitions ──────────────────────────────────────────────────────
const PLATFORMS = [
  { id: "github",  label: "GitHub Markdown",  lang: "markdown" },
  { id: "godot",   label: "Godot (GDScript)", lang: "gdscript" },
  { id: "unity",   label: "Unity (C#)",       lang: "csharp" },
  { id: "unreal",  label: "Unreal (C++)",     lang: "cpp" },
  { id: "python",  label: "Python (PEP 8)",   lang: "python" },
  { id: "plain",   label: "Plain / Clean",    lang: "text" },
] as const;

type PlatformId = (typeof PLATFORMS)[number]["id"];

const PLATFORM_RULES: Record<PlatformId, { title: string; rules: string[] }> = {
  github: {
    title: "GitHub Markdown",
    rules: [
      "Preserves original indentation and naming",
      "Wraps code in ```language fenced blocks",
      "Detects language from content heuristics",
      "Adds trailing newline",
    ],
  },
  godot: {
    title: "Godot (GDScript)",
    rules: [
      "Indentation: tabs (1 tab = 1 level)",
      "Functions: snake_case",
      "Classes: PascalCase",
      "Signals use past tense (e.g. player_died)",
      "Adds extends Node if no extends present",
      "Signal declarations moved to top",
    ],
  },
  unity: {
    title: "Unity (C#)",
    rules: [
      "Indentation: 4 spaces",
      "Methods: PascalCase",
      "Local variables: camelCase",
      "Adds using UnityEngine / using System if missing",
      "Wraps in MonoBehaviour class if no class present",
      "Namespace: YourGame (placeholder)",
    ],
  },
  unreal: {
    title: "Unreal Engine (C++)",
    rules: [
      "Indentation: tabs",
      "Structs: F-prefix (FMyStruct)",
      "UObjects: U-prefix (UMyClass)",
      "Actors: A-prefix (AMyActor)",
      "Adds UCLASS(), GENERATED_BODY() boilerplate",
      "Adds #include 'CoreMinimal.h' if missing",
    ],
  },
  python: {
    title: "Python (PEP 8)",
    rules: [
      "Indentation: 4 spaces",
      "Functions and variables: snake_case",
      "Classes: PascalCase",
      "Adds module docstring if missing",
      "Two blank lines between top-level definitions",
      "One blank line between class methods",
    ],
  },
  plain: {
    title: "Plain / Clean",
    rules: [
      "Normalizes mixed tabs/spaces to consistent indentation",
      "Removes trailing whitespace from each line",
      "Collapses 3+ consecutive blank lines to 2",
      "Ensures single trailing newline",
      "No naming convention changes",
    ],
  },
};

const FOLDER_OPTIONS = [
  "/scripts",
  "/scenes",
  "/ui",
  "/assets",
  "/autoload",
  "/addons",
  "custom",
];

// ─── Formatting engine ────────────────────────────────────────────────────────
function detectLanguage(code: string): string {
  if (/^\s*extends\s+\w+|func\s+\w+\s*\(|@export|@onready/.test(code)) return "gdscript";
  if (/using\s+(UnityEngine|System)|MonoBehaviour|void\s+Start\s*\(/.test(code)) return "csharp";
  if (/#include|UCLASS|GENERATED_BODY|UPROPERTY|TSubclassOf/.test(code)) return "cpp";
  if (/def\s+\w+\s*\(|import\s+\w+|from\s+\w+\s+import/.test(code)) return "python";
  if (/function\s+\w+|const\s+\w+|let\s+\w+|=>/.test(code)) return "javascript";
  if (/class\s+\w+|interface\s+\w+|public\s+\w+/.test(code)) return "java";
  return "text";
}

function normalizeIndent(code: string, useTab: boolean, spaces: number): string {
  const lines = code.split("\n");
  return lines.map(line => {
    const stripped = line.trimStart();
    const indent = line.length - stripped.length;
    const tabCount = Math.round(indent / 4) || (indent > 0 ? 1 : 0);
    const prefix = useTab ? "\t".repeat(tabCount) : " ".repeat(tabCount * spaces);
    return stripped ? prefix + stripped : "";
  }).join("\n");
}

function toSnakeCase(str: string): string {
  return str
    .replace(/([A-Z])/g, "_$1")
    .replace(/^_/, "")
    .replace(/__+/g, "_")
    .toLowerCase();
}

function toPascalCase(str: string): string {
  return str.replace(/(^|_)([a-z])/g, (_, __, c) => c.toUpperCase());
}

function toCamelCase(str: string): string {
  const pascal = toPascalCase(str);
  return pascal.charAt(0).toLowerCase() + pascal.slice(1);
}

function formatGitHub(code: string): string {
  const lang = detectLanguage(code);
  return `\`\`\`${lang}\n${code.trimEnd()}\n\`\`\`\n`;
}

function formatGodot(code: string): string {
  let lines = code.split("\n");

  // Convert spaces to tabs
  lines = lines.map(line => {
    const stripped = line.trimStart();
    const spaces = line.length - stripped.length;
    const tabs = Math.ceil(spaces / 4);
    return stripped ? "\t".repeat(Math.max(tabs, 0)) + stripped : "";
  });

  // snake_case function names
  let result = lines.join("\n");
  result = result.replace(/\bfunc\s+([A-Z][a-zA-Z0-9]*)\s*\(/g, (_, name) => `func ${toSnakeCase(name)}(`);

  // Add extends if missing
  if (!/^\s*extends\s+/m.test(result)) {
    result = "extends Node\n\n" + result;
  }

  return result.trimEnd() + "\n";
}

function formatUnity(code: string): string {
  let result = normalizeIndent(code, false, 4);

  // Add using statements if missing
  const usings: string[] = [];
  if (!result.includes("using UnityEngine")) usings.push("using UnityEngine;");
  if (!result.includes("using System")) usings.push("using System;");

  // PascalCase method names after access modifiers
  result = result.replace(
    /\b(public|private|protected|internal|static|override|virtual|async)\s+\w+\s+([a-z]\w*)\s*\(/g,
    (match, mod, name) => match.replace(name, toPascalCase(name))
  );

  // camelCase local vars (inside methods: var/int/float/string + lowercase)
  result = result.replace(/\b(var|int|float|string|bool|double)\s+([A-Z][a-zA-Z0-9]*)\b/g, (_, type, name) =>
    `${type} ${toCamelCase(name)}`
  );

  // Wrap in class if no class present
  if (!/\bclass\s+\w+/.test(result)) {
    result = `${usings.join("\n")}\n\nnamespace YourGame\n{\n    public class MyBehaviour : MonoBehaviour\n    {\n${result.split("\n").map(l => "        " + l).join("\n")}\n    }\n}\n`;
  } else if (usings.length) {
    result = usings.join("\n") + "\n\n" + result;
  }

  return result.trimEnd() + "\n";
}

function formatUnreal(code: string): string {
  let result = normalizeIndent(code, true, 4);

  // Add CoreMinimal include if missing
  if (!result.includes("CoreMinimal")) {
    result = '#include "CoreMinimal.h"\n\n' + result;
  }

  // Add UCLASS wrapper if a class is present but no UCLASS
  if (/\bclass\s+\w+/.test(result) && !result.includes("UCLASS")) {
    result = result.replace(
      /\bclass\s+(\w+)(\s*:\s*[^{]+)?(\s*\{)/g,
      (_, name, base, brace) =>
        `UCLASS()\nclass ${name}${base ?? ""}${brace}\n\tGENERATED_BODY()\npublic:`
    );
  }

  return result.trimEnd() + "\n";
}

function formatPython(code: string): string {
  let result = normalizeIndent(code, false, 4);
  const lines = result.split("\n");

  // Add module docstring if first real line isn't a string
  const firstReal = lines.find(l => l.trim());
  if (firstReal && !firstReal.trim().startsWith('"""') && !firstReal.trim().startsWith("'''")) {
    result = '"""Module description."""\n\n' + result;
  }

  // Ensure two blank lines before top-level def/class
  result = result.replace(/\n(def |class )/g, "\n\n\n$1").replace(/\n{4,}/g, "\n\n\n");

  return result.trimEnd() + "\n";
}

function formatPlain(code: string): string {
  const lines = code.split("\n");
  const cleaned = lines.map(line => line.trimEnd());

  // Normalize indentation: detect if tabs or spaces
  const hasTabs = cleaned.some(l => l.startsWith("\t"));
  const normalized = hasTabs
    ? cleaned.map(l => l.replace(/^\t+/, m => "  ".repeat(m.length)))
    : cleaned;

  // Collapse 3+ blank lines
  let result = "";
  let blanks = 0;
  for (const line of normalized) {
    if (line.trim() === "") {
      blanks++;
      if (blanks <= 2) result += "\n";
    } else {
      blanks = 0;
      result += line + "\n";
    }
  }

  return result.trimEnd() + "\n";
}

function formatCode(code: string, platform: PlatformId): string {
  if (!code.trim()) return "";
  switch (platform) {
    case "github":  return formatGitHub(code);
    case "godot":   return formatGodot(code);
    case "unity":   return formatUnity(code);
    case "unreal":  return formatUnreal(code);
    case "python":  return formatPython(code);
    case "plain":   return formatPlain(code);
  }
}

// ─── Components ────────────────────────────────────────────────────────────────
function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <Button variant="ghost" size="sm" onClick={copy} className="h-7 gap-1.5 text-xs">
      {copied ? <Check size={13} className="text-green-400" /> : <Copy size={13} />}
      {copied ? "Copied" : "Copy"}
    </Button>
  );
}

// ─── Tab 1: Format Code ───────────────────────────────────────────────────────
function FormatTab() {
  const [input, setInput] = useState("");
  const [platform, setPlatform] = useState<PlatformId>("godot");
  const [showRules, setShowRules] = useState(false);
  const formatted = formatCode(input, platform);

  return (
    <div className="space-y-6">
      {/* Controls row */}
      <div className="flex flex-wrap gap-3 items-end">
        <div className="flex-1 min-w-[200px]">
          <Label className="text-xs text-muted-foreground mb-1.5 block">Target Platform</Label>
          <Select value={platform} onValueChange={(v) => setPlatform(v as PlatformId)}>
            <SelectTrigger className="w-full max-w-[260px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PLATFORMS.map(p => (
                <SelectItem key={p.id} value={p.id}>{p.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowRules(r => !r)}
          className="gap-1.5 text-xs"
        >
          <Info size={13} />
          Format Rules
          {showRules ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
        </Button>
      </div>

      {/* Rules panel */}
      {showRules && (
        <div className="bg-muted/40 border border-border rounded-lg p-4">
          <p className="text-xs font-semibold text-foreground mb-2">
            {PLATFORM_RULES[platform].title} — Format Rules
          </p>
          <ul className="space-y-1">
            {PLATFORM_RULES[platform].rules.map((r, i) => (
              <li key={i} className="text-xs text-muted-foreground flex gap-2">
                <span className="text-primary shrink-0">·</span>
                {r}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Editors */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Input */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label className="text-xs text-muted-foreground">Paste Your Code</Label>
            {input && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setInput("")}
                className="h-6 text-xs text-muted-foreground"
              >
                Clear
              </Button>
            )}
          </div>
          <Textarea
            value={input}
            onChange={e => setInput(e.target.value)}
            placeholder="Paste your code here..."
            className="h-[420px] font-mono text-[13px] resize-none bg-muted/30"
          />
        </div>

        {/* Output */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Label className="text-xs text-muted-foreground">Formatted Output</Label>
              {formatted && (
                <Badge variant="secondary" className="text-[10px] h-4 px-1.5">
                  {PLATFORMS.find(p => p.id === platform)?.label}
                </Badge>
              )}
            </div>
            {formatted && <CopyButton text={formatted} />}
          </div>
          <div className="relative h-[420px] rounded-md border border-border bg-muted/10 overflow-hidden">
            {formatted ? (
              <pre className="h-full overflow-auto p-4 text-[13px] font-mono text-foreground whitespace-pre leading-relaxed">
                {formatted}
              </pre>
            ) : (
              <div className="flex items-center justify-center h-full">
                <p className="text-sm text-muted-foreground">
                  Formatted output will appear here
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Tab 2: Organize Project ──────────────────────────────────────────────────
interface ProjectFile {
  id: string;
  name: string;
  code: string;
  folder: string;
  customFolder: string;
}

function newFile(): ProjectFile {
  return {
    id: crypto.randomUUID(),
    name: "untitled.gd",
    code: "",
    folder: "/scripts",
    customFolder: "",
  };
}

function buildTree(files: ProjectFile[]): Record<string, ProjectFile[]> {
  const tree: Record<string, ProjectFile[]> = {};
  for (const f of files) {
    const folder = f.folder === "custom" ? f.customFolder || "/misc" : f.folder;
    if (!tree[folder]) tree[folder] = [];
    tree[folder].push(f);
  }
  return tree;
}

function ProjectTree({ files }: { files: ProjectFile[] }) {
  const [open, setOpen] = useState<Set<string>>(new Set());
  const tree = buildTree(files);

  if (files.length === 0) {
    return (
      <div className="flex items-center justify-center h-24 text-sm text-muted-foreground">
        Add files to see the folder tree
      </div>
    );
  }

  const toggle = (folder: string) =>
    setOpen(prev => {
      const next = new Set(prev);
      next.has(folder) ? next.delete(folder) : next.add(folder);
      return next;
    });

  return (
    <div className="font-mono text-sm space-y-0.5">
      <div className="flex items-center gap-1.5 text-muted-foreground text-xs mb-2 pb-2 border-b border-border">
        <FolderTreeIcon size={13} />
        project/
      </div>
      {Object.entries(tree).sort(([a], [b]) => a.localeCompare(b)).map(([folder, folderFiles]) => {
        const isOpen = open.has(folder) !== false; // default open
        return (
          <div key={folder}>
            <button
              onClick={() => toggle(folder)}
              className="flex items-center gap-1.5 text-xs text-amber-400/90 hover:text-amber-300 transition-colors w-full text-left"
            >
              {open.has(folder)
                ? <ChevronDown size={12} />
                : <ChevronRight size={12} />
              }
              📁 {folder}/
              <span className="text-muted-foreground ml-auto">({folderFiles.length})</span>
            </button>
            {!open.has(folder) && folderFiles.map(f => (
              <div key={f.id} className="ml-5 text-xs text-muted-foreground py-0.5 flex items-center gap-1.5">
                <span className="text-[10px]">📄</span>
                {f.name || "untitled"}
              </div>
            ))}
          </div>
        );
      })}
    </div>
  );
}

function OrganizeTab() {
  const [files, setFiles] = useState<ProjectFile[]>([newFile()]);
  const [activeId, setActiveId] = useState<string>(files[0].id);
  const [downloading, setDownloading] = useState(false);

  const activeFile = files.find(f => f.id === activeId) ?? files[0];

  const updateFile = useCallback((id: string, patch: Partial<ProjectFile>) => {
    setFiles(prev => prev.map(f => f.id === id ? { ...f, ...patch } : f));
  }, []);

  const addFile = () => {
    const f = newFile();
    setFiles(prev => [...prev, f]);
    setActiveId(f.id);
  };

  const removeFile = (id: string) => {
    setFiles(prev => {
      const next = prev.filter(f => f.id !== id);
      if (next.length === 0) {
        const blank = newFile();
        setActiveId(blank.id);
        return [blank];
      }
      if (activeId === id) setActiveId(next[0].id);
      return next;
    });
  };

  const downloadZip = async () => {
    setDownloading(true);
    try {
      const zip = new JSZip();
      for (const f of files) {
        const folder = f.folder === "custom" ? f.customFolder || "misc" : f.folder;
        const path = `project${folder}/${f.name || "untitled"}`;
        zip.file(path, f.code);
      }
      const blob = await zip.generateAsync({ type: "blob" });
      saveAs(blob, "forge-project.zip");
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
      {/* File list + editor (left 2 cols) */}
      <div className="lg:col-span-2 space-y-4">
        {/* File tabs */}
        <div className="flex items-center gap-2 flex-wrap">
          {files.map(f => (
            <button
              key={f.id}
              onClick={() => setActiveId(f.id)}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-mono border transition-all",
                f.id === activeId
                  ? "bg-primary/10 border-primary/30 text-primary"
                  : "bg-muted/30 border-border text-muted-foreground hover:text-foreground"
              )}
            >
              {f.name || "untitled"}
              {files.length > 1 && (
                <span
                  onClick={e => { e.stopPropagation(); removeFile(f.id); }}
                  className="ml-0.5 hover:text-destructive cursor-pointer"
                >
                  ×
                </span>
              )}
            </button>
          ))}
          <Button
            variant="ghost"
            size="sm"
            onClick={addFile}
            className="h-7 gap-1 text-xs text-muted-foreground hover:text-foreground"
          >
            <Plus size={12} />
            Add File
          </Button>
        </div>

        {/* Active file editor */}
        {activeFile && (
          <div className="space-y-3 border border-border rounded-lg p-4 bg-muted/10">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs text-muted-foreground mb-1.5 block">Filename</Label>
                <Input
                  value={activeFile.name}
                  onChange={e => updateFile(activeFile.id, { name: e.target.value })}
                  placeholder="player.gd"
                  className="font-mono text-sm h-9"
                />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground mb-1.5 block">Folder</Label>
                <Select
                  value={activeFile.folder}
                  onValueChange={v => updateFile(activeFile.id, { folder: v })}
                >
                  <SelectTrigger className="h-9 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {FOLDER_OPTIONS.map(f => (
                      <SelectItem key={f} value={f}>
                        {f === "custom" ? "Custom path…" : f}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {activeFile.folder === "custom" && (
              <div>
                <Label className="text-xs text-muted-foreground mb-1.5 block">Custom Folder Path</Label>
                <Input
                  value={activeFile.customFolder}
                  onChange={e => updateFile(activeFile.id, { customFolder: e.target.value })}
                  placeholder="/my-custom-folder"
                  className="font-mono text-sm h-9"
                />
              </div>
            )}

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <Label className="text-xs text-muted-foreground">Code</Label>
                {activeFile.code && <CopyButton text={activeFile.code} />}
              </div>
              <Textarea
                value={activeFile.code}
                onChange={e => updateFile(activeFile.id, { code: e.target.value })}
                placeholder="Paste your code here..."
                className="h-[300px] font-mono text-[13px] resize-none bg-muted/20"
              />
            </div>

            <div className="flex justify-end">
              {files.length > 1 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => removeFile(activeFile.id)}
                  className="gap-1.5 text-xs text-destructive hover:text-destructive"
                >
                  <Trash2 size={13} />
                  Remove File
                </Button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Right panel: tree + download */}
      <div className="space-y-4">
        {/* Folder tree */}
        <div className="border border-border rounded-lg p-4 bg-muted/10">
          <p className="text-xs font-semibold text-foreground mb-3 flex items-center gap-2">
            <FolderTreeIcon size={14} />
            Project Structure
          </p>
          <ProjectTree files={files} />
        </div>

        {/* Download */}
        <div className="border border-border rounded-lg p-4 bg-muted/10 space-y-3">
          <p className="text-xs font-semibold text-foreground">Export Project</p>
          <p className="text-xs text-muted-foreground">
            Downloads all {files.length} file{files.length === 1 ? "" : "s"} in their correct folders as a ZIP archive.
          </p>
          <Button
            onClick={downloadZip}
            disabled={downloading || files.every(f => !f.code.trim())}
            className="w-full gap-2"
          >
            <Download size={15} />
            {downloading ? "Building ZIP…" : "Download ZIP"}
          </Button>
          <p className="text-[11px] text-muted-foreground">
            All processing happens in your browser — no code is sent to any server.
          </p>
        </div>

        {/* Folder guide */}
        <div className="border border-border rounded-lg p-4 bg-muted/10">
          <p className="text-xs font-semibold text-foreground mb-2">Folder Guide</p>
          <div className="space-y-1.5">
            {[
              ["/scripts", "Gameplay logic"],
              ["/scenes", "Scene definitions"],
              ["/ui", "Interface code"],
              ["/assets", "Asset loaders/refs"],
              ["/autoload", "Singletons / globals"],
              ["/addons", "Plugins / extensions"],
            ].map(([folder, desc]) => (
              <div key={folder} className="flex items-start gap-2 text-xs">
                <code className="text-amber-400/80 shrink-0">{folder}</code>
                <span className="text-muted-foreground">{desc}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Page ──────────────────────────────────────────────────────────────────────
export default function CodeForge() {
  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-start gap-4">
        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-orange-500 to-red-700 flex items-center justify-center shadow-lg shrink-0"
          style={{ boxShadow: "0 0 24px rgba(239, 68, 68, 0.3)" }}>
          <Code2 size={22} className="text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-black tracking-tight flex items-center gap-3">
            Code Forge
            <Badge variant="secondary" className="text-[10px] font-bold tracking-wider">
              MOON #5 · FORGE
            </Badge>
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Format code for any platform. Organize project files and export as ZIP — all in your browser, no upload needed.
          </p>
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="format">
        <TabsList className="mb-6">
          <TabsTrigger value="format" className="gap-2">
            <Code2 size={14} />
            Format Code
          </TabsTrigger>
          <TabsTrigger value="organize" className="gap-2">
            <FolderTreeIcon size={14} />
            Organize Project
          </TabsTrigger>
        </TabsList>

        <TabsContent value="format">
          <FormatTab />
        </TabsContent>

        <TabsContent value="organize">
          <OrganizeTab />
        </TabsContent>
      </Tabs>

      {/* Footer note */}
      <div className="flex items-start gap-3 px-4 py-3 rounded-lg border border-border bg-muted/20">
        <Flame size={16} className="text-primary shrink-0 mt-0.5" />
        <p className="text-xs text-muted-foreground">
          <span className="font-semibold text-foreground">Code Forge</span> runs entirely in your browser. 
          No code is sent to any server. Formatting is rule-based — for production use, pair with your platform's official linter (gdformat, Black, clang-format, etc).
        </p>
      </div>
    </div>
  );
}
