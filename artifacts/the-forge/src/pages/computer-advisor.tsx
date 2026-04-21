import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Monitor, Cpu, HardDrive, MemoryStick, Loader2, Copy, Check,
  Sparkles, Download, ExternalLink, ChevronRight, RefreshCw,
  Gamepad2, Code2, Film, Wrench, Zap, Shield,
} from "lucide-react";

const API_BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

// ── Software catalogue ────────────────────────────────────────────────────────
const SOFTWARE: {
  category: string;
  icon: React.ComponentType<{ size: number; className?: string }>;
  color: string;
  items: { name: string; desc: string; url: string; free: boolean; tags: string[] }[];
}[] = [
  {
    category: "Gaming", icon: Gamepad2, color: "text-purple-400",
    items: [
      { name: "Steam", desc: "The world's largest PC game store and launcher", url: "https://store.steampowered.com/about/", free: true, tags: ["gaming"] },
      { name: "Discord", desc: "Voice chat and communities for gamers", url: "https://discord.com/download", free: true, tags: ["gaming"] },
      { name: "MSI Afterburner", desc: "GPU monitoring, overclocking, and FPS overlay", url: "https://www.msi.com/Landing/afterburner/graphics-cards", free: true, tags: ["gaming", "nvidia", "amd"] },
      { name: "GeForce Experience", desc: "NVIDIA drivers + automatic game settings optimizer", url: "https://www.nvidia.com/en-us/geforce/geforce-experience/", free: true, tags: ["gaming", "nvidia"] },
      { name: "AMD Adrenalin", desc: "AMD graphics drivers + Radeon performance tools", url: "https://www.amd.com/en/technologies/software", free: true, tags: ["gaming", "amd"] },
      { name: "Xbox App", desc: "Game Pass, Xbox games, and multiplayer on PC", url: "https://www.xbox.com/en-US/apps/xbox-app-for-pc", free: true, tags: ["gaming"] },
      { name: "RivaTuner Statistics", desc: "Precise FPS cap and on-screen display overlay", url: "https://www.guru3d.com/software-pages/rivatuner-statistics-server-download.html", free: true, tags: ["gaming"] },
    ],
  },
  {
    category: "Game Development", icon: Code2, color: "text-orange-400",
    items: [
      { name: "Godot 4", desc: "Free, open-source game engine — perfect for beginners and pros", url: "https://godotengine.org/download", free: true, tags: ["gamedev"] },
      { name: "Unity", desc: "Popular game engine used by millions of developers", url: "https://unity.com/download", free: true, tags: ["gamedev"] },
      { name: "Unreal Engine 5", desc: "Hollywood-quality game engine, free to download", url: "https://www.unrealengine.com/en-US/download", free: true, tags: ["gamedev"] },
      { name: "Blender", desc: "Free 3D modeling, animation, and rendering", url: "https://www.blender.org/download/", free: true, tags: ["gamedev"] },
      { name: "VS Code", desc: "Lightweight code editor with great GDScript support", url: "https://code.visualstudio.com/download", free: true, tags: ["gamedev"] },
      { name: "GIMP", desc: "Free Photoshop alternative for game textures and sprites", url: "https://www.gimp.org/downloads/", free: true, tags: ["gamedev"] },
      { name: "Audacity", desc: "Free audio editor for game sound effects and music", url: "https://www.audacityteam.org/download/", free: true, tags: ["gamedev"] },
      { name: "Krita", desc: "Free digital painting app — great for 2D game art", url: "https://krita.org/en/download/", free: true, tags: ["gamedev"] },
    ],
  },
  {
    category: "System Info & Monitoring", icon: Cpu, color: "text-blue-400",
    items: [
      { name: "HWiNFO64", desc: "Detailed real-time hardware monitoring — temps, voltages, usage", url: "https://www.hwinfo.com/download/", free: true, tags: ["monitoring"] },
      { name: "CPU-Z", desc: "Shows exact CPU model, speed, and specs in detail", url: "https://www.cpuid.com/softwares/cpu-z.html", free: true, tags: ["monitoring"] },
      { name: "GPU-Z", desc: "Complete GPU information — model, VRAM, driver version", url: "https://www.techpowerup.com/gpuz/", free: true, tags: ["monitoring"] },
      { name: "Speccy", desc: "Quick overview of all your hardware in one screen", url: "https://www.ccleaner.com/speccy/download", free: true, tags: ["monitoring"] },
      { name: "CrystalDiskInfo", desc: "Check the health of your hard drives and SSDs", url: "https://crystalmark.info/en/software/crystaldiskinfo/", free: true, tags: ["monitoring"] },
    ],
  },
  {
    category: "Content Creation", icon: Film, color: "text-pink-400",
    items: [
      { name: "OBS Studio", desc: "Free screen recording and live streaming software", url: "https://obsproject.com/download", free: true, tags: ["creation"] },
      { name: "DaVinci Resolve", desc: "Professional-grade free video editor", url: "https://www.blackmagicdesign.com/products/davinciresolve", free: true, tags: ["creation"] },
      { name: "Handbrake", desc: "Convert and compress videos to any format", url: "https://handbrake.fr/downloads.php", free: true, tags: ["creation"] },
      { name: "ShareX", desc: "Powerful free screenshot and screen recorder", url: "https://getsharex.com/", free: true, tags: ["creation"] },
    ],
  },
  {
    category: "Performance & Cleanup", icon: Zap, color: "text-yellow-400",
    items: [
      { name: "CCleaner", desc: "Remove junk files and free up disk space safely", url: "https://www.ccleaner.com/ccleaner/download", free: true, tags: ["performance"] },
      { name: "Everything", desc: "Instantly search every file on your PC by name", url: "https://www.voidtools.com/downloads/", free: true, tags: ["performance"] },
      { name: "f.lux", desc: "Reduces blue light at night to reduce eye strain", url: "https://justgetflux.com/", free: true, tags: ["performance"] },
    ],
  },
  {
    category: "Security & Safety", icon: Shield, color: "text-green-400",
    items: [
      { name: "Malwarebytes", desc: "Scans for and removes malware, spyware, and viruses", url: "https://www.malwarebytes.com/mwb-download", free: true, tags: ["security"] },
      { name: "Bitwarden", desc: "Free, open-source password manager — save passwords safely", url: "https://bitwarden.com/download/", free: true, tags: ["security"] },
      { name: "ProtonVPN", desc: "Free VPN with no data limits — protects your connection", url: "https://protonvpn.com/download", free: true, tags: ["security"] },
    ],
  },
  {
    category: "Must-Have Utilities", icon: Wrench, color: "text-gray-400",
    items: [
      { name: "7-Zip", desc: "Open any zip, rar, or archive file for free", url: "https://www.7-zip.org/download.html", free: true, tags: ["utility"] },
      { name: "VLC Media Player", desc: "Plays any video or audio file, no codecs needed", url: "https://www.videolan.org/vlc/", free: true, tags: ["utility"] },
      { name: "Rufus", desc: "Create bootable USB drives for installing Windows or Linux", url: "https://rufus.ie/en/", free: true, tags: ["utility"] },
      { name: "Brave Browser", desc: "Fast, privacy-focused browser that blocks ads by default", url: "https://brave.com/download/", free: true, tags: ["utility"] },
      { name: "Notion", desc: "All-in-one notes, tasks, and project organizer", url: "https://www.notion.so/desktop", free: true, tags: ["utility"] },
    ],
  },
];

const GOAL_OPTIONS = [
  { id: "gaming",    label: "Gaming",             icon: "🎮", desc: "Play games at best performance" },
  { id: "gamedev",   label: "Make Games",          icon: "🕹️", desc: "Build my own game" },
  { id: "creation",  label: "Content Creation",    icon: "🎬", desc: "Stream, record, or edit video" },
  { id: "fix",       label: "Fix / Speed Up My PC",icon: "⚡", desc: "Make it faster and cleaner" },
  { id: "general",   label: "Everyday Use",        icon: "💻", desc: "Browsing, work, learning" },
  { id: "security",  label: "Stay Safe Online",    icon: "🔒", desc: "Protect my computer and data" },
];

// ── Browser auto-detect ────────────────────────────────────────────────────────
function detectBrowserSpecs() {
  const ua = navigator.userAgent;
  let os = "Unknown";
  if (ua.includes("Windows NT 11") || ua.includes("Windows NT 10")) os = ua.includes("Windows NT 11") ? "Windows 11" : "Windows 10";
  else if (ua.includes("Mac OS X")) os = "macOS";
  else if (ua.includes("Linux")) os = "Linux";
  else if (ua.includes("Android")) os = "Android";
  else if (ua.includes("iPhone") || ua.includes("iPad")) os = "iOS";

  const cores = navigator.hardwareConcurrency ? `${navigator.hardwareConcurrency} CPU cores detected` : "";
  const ram = (navigator as unknown as { deviceMemory?: number }).deviceMemory
    ? `~${(navigator as unknown as { deviceMemory: number }).deviceMemory}GB RAM (browser estimate)`
    : "";
  const screen = `${window.screen.width}×${window.screen.height}`;

  let gpu = "";
  try {
    const canvas = document.createElement("canvas");
    const gl = canvas.getContext("webgl") || canvas.getContext("experimental-webgl") as WebGLRenderingContext | null;
    if (gl) {
      const ext = (gl as WebGLRenderingContext).getExtension("WEBGL_debug_renderer_info");
      if (ext) gpu = (gl as WebGLRenderingContext).getParameter(ext.UNMASKED_RENDERER_WEBGL) as string;
    }
  } catch { /* no GL */ }

  return { os, cores, ram, screen, gpu };
}

// ── Streaming hook ─────────────────────────────────────────────────────────────
function useStream() {
  const [output, setOutput] = useState("");
  const [status, setStatus] = useState<"idle" | "running" | "done" | "error">("idle");

  const run = async (body: object) => {
    if (status === "running") return;
    setOutput(""); setStatus("running");
    try {
      const res = await fetch(`${API_BASE}/api/computer-advisor/analyze`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.body) throw new Error("No stream");
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buf = ""; let acc = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });
        const lines = buf.split("\n"); buf = lines.pop() ?? "";
        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const raw = line.slice(6).trim();
          if (raw === "[DONE]") { setStatus("done"); return; }
          try {
            const j = JSON.parse(raw);
            const delta = j.choices?.[0]?.delta?.content ?? "";
            acc += delta; setOutput(acc);
          } catch { /* skip */ }
        }
      }
      setStatus("done");
    } catch { setStatus("error"); }
  };

  return { output, status, run, reset: () => { setOutput(""); setStatus("idle"); } };
}

// ── Copy button ────────────────────────────────────────────────────────────────
function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button onClick={async () => { await navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
      className="p-1.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors">
      {copied ? <Check size={14} className="text-green-400" /> : <Copy size={14} />}
    </button>
  );
}

// ── Software card ──────────────────────────────────────────────────────────────
function SoftwareCard({ item }: { item: typeof SOFTWARE[0]["items"][0] }) {
  return (
    <a href={item.url} target="_blank" rel="noreferrer"
      className="flex items-start gap-3 p-3 rounded-lg border border-border bg-muted/10 hover:bg-muted/30 hover:border-primary/40 transition-all group">
      <div className="shrink-0 mt-0.5 w-7 h-7 rounded bg-primary/10 flex items-center justify-center">
        <Download size={14} className="text-primary" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold group-hover:text-primary transition-colors">{item.name}</span>
          <Badge variant="outline" className="text-[10px] text-green-400 border-green-400/30 py-0">Free</Badge>
        </div>
        <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{item.desc}</p>
      </div>
      <ExternalLink size={13} className="text-muted-foreground shrink-0 mt-1 group-hover:text-primary transition-colors" />
    </a>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function ComputerAdvisor() {
  const [goals, setGoals] = useState<string[]>([]);
  const [specs, setSpecs] = useState({
    os: "", cpu: "", gpu: "", ram: "", storage: "", screenRes: "", extras: "",
  });
  const [autoDetected, setAutoDetected] = useState<ReturnType<typeof detectBrowserSpecs> | null>(null);
  const [showAllSoftware, setShowAllSoftware] = useState(false);
  const [compareMode, setCompareMode] = useState(false);
  const [specsB, setSpecsB] = useState({ os: "", cpu: "", gpu: "", ram: "", storage: "" });
  const { output, status, run, reset } = useStream();
  const { output: outputB, status: statusB, run: runB, reset: resetB } = useStream();

  useEffect(() => {
    const d = detectBrowserSpecs();
    setAutoDetected(d);
    setSpecs(prev => ({
      ...prev,
      os: d.os !== "Unknown" ? d.os : prev.os,
      screenRes: d.screen || prev.screenRes,
      gpu: d.gpu || prev.gpu,
    }));
  }, []);

  const toggleGoal = (id: string) =>
    setGoals(g => g.includes(id) ? g.filter(x => x !== id) : [...g, id]);

  const analyze = () => run({ specs, goals });

  const filteredSoftware = showAllSoftware
    ? SOFTWARE
    : SOFTWARE.filter(cat =>
        goals.length === 0 || cat.items.some(item =>
          goals.some(g => item.tags.includes(g))
        )
      );

  return (
    <div className="space-y-8 max-w-3xl">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
          <Monitor size={22} className="text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">Computer Advisor</h1>
          <p className="text-sm text-muted-foreground">Tell Forge about your PC — get personalized tips, settings, and free software recommendations</p>
        </div>
      </div>

      {/* Auto-detect banner */}
      {autoDetected && (
        <div className="flex items-start gap-3 p-3 rounded-lg bg-primary/5 border border-primary/20 text-xs text-muted-foreground">
          <Sparkles size={15} className="text-primary mt-0.5 shrink-0" />
          <div>
            <span className="text-foreground font-medium">Auto-detected from your browser: </span>
            {[autoDetected.os !== "Unknown" && autoDetected.os, autoDetected.cores, autoDetected.ram, autoDetected.screen && `Screen: ${autoDetected.screen}`, autoDetected.gpu && `GPU: ${autoDetected.gpu.slice(0, 60)}`].filter(Boolean).join(" · ")}
            <span className="block mt-0.5 text-muted-foreground/70">Fill in the details below to get a more precise analysis — especially CPU model, RAM size, and storage type.</span>
          </div>
        </div>
      )}

      {/* Goals */}
      <div className="space-y-3">
        <Label className="text-base font-semibold">What do you want to use your computer for? <span className="text-muted-foreground font-normal text-sm">(pick all that apply)</span></Label>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {GOAL_OPTIONS.map(g => (
            <button key={g.id} onClick={() => toggleGoal(g.id)}
              className={`flex items-start gap-2.5 p-3 rounded-lg border text-left transition-all ${goals.includes(g.id) ? "border-primary bg-primary/10 text-foreground" : "border-border hover:border-primary/40 hover:bg-muted/30 text-muted-foreground"}`}>
              <span className="text-lg leading-none mt-0.5">{g.icon}</span>
              <div>
                <p className="text-xs font-semibold text-foreground">{g.label}</p>
                <p className="text-[11px] text-muted-foreground">{g.desc}</p>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Specs form */}
      <div className="space-y-4">
        <Label className="text-base font-semibold">Your computer specs <span className="text-muted-foreground font-normal text-sm">(fill in what you know — anything helps)</span></Label>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="os" className="text-xs flex items-center gap-1.5"><Monitor size={12} /> Operating System</Label>
            <Input id="os" placeholder="e.g. Windows 11, macOS Ventura" value={specs.os} onChange={e => setSpecs(p => ({ ...p, os: e.target.value }))} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="cpu" className="text-xs flex items-center gap-1.5"><Cpu size={12} /> CPU / Processor</Label>
            <Input id="cpu" placeholder="e.g. Intel i5-12400, AMD Ryzen 5 5600X" value={specs.cpu} onChange={e => setSpecs(p => ({ ...p, cpu: e.target.value }))} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="gpu" className="text-xs flex items-center gap-1.5"><Monitor size={12} /> Graphics Card (GPU)</Label>
            <Input id="gpu" placeholder="e.g. NVIDIA RTX 3060, AMD RX 6600" value={specs.gpu} onChange={e => setSpecs(p => ({ ...p, gpu: e.target.value }))} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="ram" className="text-xs flex items-center gap-1.5"><MemoryStick size={12} /> RAM (Memory)</Label>
            <Input id="ram" placeholder="e.g. 16GB DDR4, 8GB" value={specs.ram} onChange={e => setSpecs(p => ({ ...p, ram: e.target.value }))} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="storage" className="text-xs flex items-center gap-1.5"><HardDrive size={12} /> Storage</Label>
            <Input id="storage" placeholder="e.g. 500GB SSD + 1TB HDD" value={specs.storage} onChange={e => setSpecs(p => ({ ...p, storage: e.target.value }))} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="res" className="text-xs flex items-center gap-1.5"><Monitor size={12} /> Screen Resolution</Label>
            <Input id="res" placeholder="e.g. 1920×1080, 2560×1440" value={specs.screenRes} onChange={e => setSpecs(p => ({ ...p, screenRes: e.target.value }))} />
          </div>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="extras" className="text-xs">Anything else? <span className="text-muted-foreground">(problems you're having, things you've already tried, budget, etc.)</span></Label>
          <Textarea id="extras" placeholder="e.g. My PC runs slow when gaming. I have a $300 budget for upgrades. Already have an SSD." rows={2} value={specs.extras} onChange={e => setSpecs(p => ({ ...p, extras: e.target.value }))} className="resize-none" />
        </div>
      </div>

      {/* Analyze button */}
      <Button onClick={status === "done" ? () => { reset(); } : analyze}
        disabled={status === "running"}
        size="lg" className="w-full gap-2">
        {status === "running"
          ? <><Loader2 size={18} className="animate-spin" /> Forge is analyzing your setup…</>
          : status === "done"
          ? <><RefreshCw size={18} /> Analyze Again</>
          : <><Sparkles size={18} /> Analyze My Computer</>}
      </Button>

      {/* Output */}
      {(output || status === "running") && (
        <div className="rounded-lg border border-border bg-muted/20 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-2.5 border-b border-border bg-muted/40">
            <div className="flex items-center gap-2 text-sm font-semibold">
              <Sparkles size={15} className="text-primary" />
              Forge's Analysis
            </div>
            <div className="flex items-center gap-2">
              {status === "done" && <Badge variant="outline" className="text-[10px] text-green-400 border-green-400/30">Done</Badge>}
              {status === "running" && <Badge variant="outline" className="text-[10px] text-primary border-primary/30 animate-pulse">Analyzing…</Badge>}
              {output && <CopyButton text={output} />}
            </div>
          </div>
          <div className="p-4 prose prose-sm prose-invert max-w-none">
            <pre className="whitespace-pre-wrap text-sm text-foreground font-sans leading-relaxed">
              {output}
              {status === "running" && <span className="animate-pulse text-primary">▋</span>}
            </pre>
          </div>
        </div>
      )}

      {status === "error" && (
        <p className="text-sm text-destructive text-center">Something went wrong. Please try again.</p>
      )}

      {/* Compare with another PC */}
      {status === "done" && (
        <div className="space-y-4 pt-2 border-t border-border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold">Compare with another PC</p>
              <p className="text-xs text-muted-foreground">Enter a second machine's specs to see how they stack up side by side</p>
            </div>
            <Button variant="outline" size="sm" onClick={() => { setCompareMode(v => !v); resetB(); }}>
              {compareMode ? "Hide Comparison" : "Compare PCs"}
            </Button>
          </div>

          {compareMode && (
            <div className="space-y-4 p-4 rounded-lg border border-border bg-muted/10">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Second PC specs</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {([
                  ["os",      "OS",           "e.g. Windows 10, macOS"],
                  ["cpu",     "CPU",          "e.g. Intel i3-10100, Ryzen 3 3300X"],
                  ["gpu",     "GPU",          "e.g. GTX 1650, RX 580"],
                  ["ram",     "RAM",          "e.g. 8GB DDR4"],
                  ["storage", "Storage",      "e.g. 256GB SSD"],
                ] as [keyof typeof specsB, string, string][]).map(([key, label, ph]) => (
                  <div key={key} className="space-y-1">
                    <Label className="text-xs">{label}</Label>
                    <Input placeholder={ph} value={specsB[key]} onChange={e => setSpecsB(p => ({ ...p, [key]: e.target.value }))} />
                  </div>
                ))}
              </div>
              <Button
                size="sm" className="gap-1.5"
                disabled={statusB === "running"}
                onClick={() => runB({ specs: { ...specsB, screenRes: "", extras: "Compare this to another PC" }, goals })}>
                {statusB === "running"
                  ? <><Loader2 size={14} className="animate-spin" /> Analyzing…</>
                  : <><Sparkles size={14} /> Analyze Second PC</>}
              </Button>
            </div>
          )}

          {/* Side-by-side output */}
          {(outputB || statusB === "running") && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div className="rounded-lg border border-border bg-muted/20 overflow-hidden">
                <div className="flex items-center gap-2 px-4 py-2.5 border-b border-border bg-muted/40">
                  <Sparkles size={14} className="text-primary" />
                  <span className="text-sm font-semibold">PC One</span>
                  <Badge variant="outline" className="text-[10px] text-green-400 border-green-400/30 ml-auto">Done</Badge>
                </div>
                <pre className="p-4 whitespace-pre-wrap text-xs text-foreground font-sans leading-relaxed max-h-96 overflow-y-auto">{output}</pre>
              </div>
              <div className="rounded-lg border border-border bg-muted/20 overflow-hidden">
                <div className="flex items-center gap-2 px-4 py-2.5 border-b border-border bg-muted/40">
                  <Sparkles size={14} className="text-blue-400" />
                  <span className="text-sm font-semibold">PC Two</span>
                  {statusB === "done" && <Badge variant="outline" className="text-[10px] text-green-400 border-green-400/30 ml-auto">Done</Badge>}
                  {statusB === "running" && <Badge variant="outline" className="text-[10px] text-primary border-primary/30 animate-pulse ml-auto">Analyzing…</Badge>}
                </div>
                <pre className="p-4 whitespace-pre-wrap text-xs text-foreground font-sans leading-relaxed max-h-96 overflow-y-auto">
                  {outputB}{statusB === "running" && <span className="animate-pulse text-primary">▋</span>}
                </pre>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Software catalogue */}
      <div className="space-y-5 pt-2 border-t border-border">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold">Recommended Free Software</h2>
            <p className="text-sm text-muted-foreground">
              {goals.length > 0 ? "Filtered to match your goals — " : "All categories — "}
              everything here is 100% free to download
            </p>
          </div>
          {goals.length > 0 && (
            <Button variant="outline" size="sm" onClick={() => setShowAllSoftware(v => !v)}>
              {showAllSoftware ? "Show Relevant Only" : "Show All"}
            </Button>
          )}
        </div>

        {filteredSoftware.map(cat => (
          <div key={cat.category} className="space-y-2">
            <div className="flex items-center gap-2">
              <cat.icon size={16} className={cat.color} />
              <h3 className="text-sm font-semibold">{cat.category}</h3>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {cat.items.map(item => <SoftwareCard key={item.name} item={item} />)}
            </div>
          </div>
        ))}

        <p className="text-xs text-muted-foreground text-center pt-2">
          All downloads link directly to the official software websites. Forge doesn't host or endorse any specific product.
        </p>
      </div>
    </div>
  );
}
