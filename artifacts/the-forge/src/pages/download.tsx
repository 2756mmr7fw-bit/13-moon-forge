import { useState } from "react";
import { Monitor, Smartphone, Download as DownloadIcon, Wifi, Apple, CheckCircle2, ChevronDown, ChevronUp, ExternalLink, Terminal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

interface Section {
  id: string;
  label: string;
  icon: React.ReactNode;
  color: string;
}

const SECTIONS: Section[] = [
  { id: "windows", label: "Windows PC", icon: <Monitor size={20} />, color: "text-blue-400" },
  { id: "mac", label: "Mac", icon: <Apple size={20} />, color: "text-gray-300" },
  { id: "android", label: "Android Phone / Tablet", icon: <Smartphone size={20} />, color: "text-green-400" },
  { id: "ios", label: "iPhone / iPad", icon: <Smartphone size={20} />, color: "text-sky-400" },
  { id: "remote", label: "Forge Remote Agent", icon: <Wifi size={20} />, color: "text-orange-400" },
];

function Step({ n, children }: { n: number; children: React.ReactNode }) {
  return (
    <div className="flex gap-3 items-start">
      <span className="shrink-0 w-6 h-6 rounded-full bg-primary/20 border border-primary/30 text-primary text-xs font-bold flex items-center justify-center mt-0.5">
        {n}
      </span>
      <p className="text-sm text-muted-foreground leading-relaxed">{children}</p>
    </div>
  );
}

function Card({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn("rounded-xl border border-border bg-muted/5 p-5 space-y-4", className)}>
      {children}
    </div>
  );
}

function Code({ children }: { children: string }) {
  return (
    <code className="block bg-black/40 border border-border rounded-lg px-4 py-3 text-xs font-mono text-green-300 whitespace-pre-wrap break-all">
      {children}
    </code>
  );
}

function PwaSteps({ platform }: { platform: "windows" | "mac" | "android" | "ios" }) {
  const steps: Record<string, React.ReactNode[]> = {
    windows: [
      <>Open <strong>13moonforge.ai</strong> in <strong>Google Chrome</strong> or <strong>Microsoft Edge</strong>.</>,
      <>Look for the <strong>install icon</strong> (⊕) in the address bar at the top right — click it.</>,
      <>Click <strong>"Install"</strong> in the popup. A Forge app icon is now on your desktop and Start menu.</>,
      <>Open it anytime like any other app — no browser needed.</>,
    ],
    mac: [
      <>Open <strong>13moonforge.ai</strong> in <strong>Google Chrome</strong>.</>,
      <>Click the three-dot menu (⋮) in the top right → <strong>"Cast, save, and share"</strong> → <strong>"Install page as app"</strong>.</>,
      <>Click <strong>Install</strong>. Forge is now in your Dock and Applications folder.</>,
      <>On <strong>Safari</strong>: go to <strong>File → Add to Dock</strong> (macOS Sonoma+).</>,
    ],
    android: [
      <>Open <strong>13moonforge.ai</strong> in <strong>Chrome</strong>.</>,
      <>Tap the three-dot menu (⋮) at the top right → tap <strong>"Add to Home screen"</strong>.</>,
      <>Tap <strong>Add</strong>. The Forge icon appears on your home screen just like any app.</>,
      <>You can also go to your home screen and tap the icon — it opens full-screen, no browser bar.</>,
    ],
    ios: [
      <>Open <strong>13moonforge.ai</strong> in <strong>Safari</strong> (must be Safari, not Chrome).</>,
      <>Tap the <strong>Share button</strong> (box with upward arrow) at the bottom of the screen.</>,
      <>Scroll down and tap <strong>"Add to Home Screen"</strong>.</>,
      <>Tap <strong>Add</strong>. The Forge icon is on your home screen and opens full-screen.</>,
    ],
  };
  return (
    <div className="space-y-3">
      {steps[platform].map((s, i) => (
        <Step key={i} n={i + 1}>{s}</Step>
      ))}
    </div>
  );
}

function WindowsSection() {
  return (
    <div className="space-y-5">
      <Card>
        <h3 className="font-bold text-sm flex items-center gap-2">
          <span className="w-5 h-5 rounded bg-blue-500/20 flex items-center justify-center text-blue-400 text-xs">A</span>
          Install as an App (Recommended — free, instant)
        </h3>
        <PwaSteps platform="windows" />
      </Card>

      <Card>
        <h3 className="font-bold text-sm flex items-center gap-2">
          <span className="w-5 h-5 rounded bg-orange-500/20 flex items-center justify-center text-orange-400 text-xs">B</span>
          Forge Remote Agent — for Computer Fix sessions
        </h3>
        <p className="text-xs text-muted-foreground">
          Lets Flint see your screen, control your mouse, and talk you through fixes in real time. Only install this when you need it for a fix session.
        </p>
        <div className="rounded-lg border border-green-500/20 bg-green-500/5 p-3 space-y-3">
          <p className="text-xs font-bold text-green-400">✓ Available now — Python version</p>
          <a
            href={`${BASE}/forge_agent.py`}
            download="forge_agent.py"
            className="flex items-center gap-2 bg-orange-500/10 hover:bg-orange-500/20 border border-orange-500/30 text-orange-300 rounded-lg px-4 py-2 text-sm font-semibold transition-colors"
          >
            <DownloadIcon size={14} /> Download forge_agent.py
          </a>
          <div className="space-y-2">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">After downloading:</p>
            <Step n={1}>Install Python if you don't have it — <strong>python.org/downloads</strong> (free, takes 2 min)</Step>
            <Step n={2}>Open a terminal (search "cmd" in Windows) and run: <code className="bg-black/40 px-1.5 py-0.5 rounded text-green-300 text-xs">pip install websockets mss pyautogui pillow</code></Step>
            <Step n={3}>Run: <code className="bg-black/40 px-1.5 py-0.5 rounded text-green-300 text-xs">python forge_agent.py</code> — a small window appears with your <strong>Session Code</strong></Step>
            <Step n={4}>Enter that code in your Computer Fix session on the site — Flint can now see your screen.</Step>
          </div>
          <p className="text-[11px] text-muted-foreground pt-1 border-t border-border">A one-click Windows installer (.exe) is coming soon — for now, the Python version works exactly the same way.</p>
        </div>
      </Card>
    </div>
  );
}

function MacSection() {
  return (
    <div className="space-y-5">
      <Card>
        <h3 className="font-bold text-sm flex items-center gap-2">
          <span className="w-5 h-5 rounded bg-gray-500/20 flex items-center justify-center text-gray-300 text-xs">A</span>
          Install as an App (Recommended)
        </h3>
        <PwaSteps platform="mac" />
      </Card>

      <Card>
        <h3 className="font-bold text-sm flex items-center gap-2">
          <span className="w-5 h-5 rounded bg-orange-500/20 flex items-center justify-center text-orange-400 text-xs">B</span>
          Forge Remote Agent — for Computer Fix sessions
        </h3>
        <p className="text-xs text-muted-foreground">
          Same idea as Windows — lets Flint see your screen during a fix session.
        </p>
        <div className="rounded-lg border border-green-500/20 bg-green-500/5 p-3 space-y-3">
          <p className="text-xs font-bold text-green-400">✓ Available now — Python version</p>
          <a
            href={`${BASE}/forge_agent.py`}
            download="forge_agent.py"
            className="flex items-center gap-2 bg-orange-500/10 hover:bg-orange-500/20 border border-orange-500/30 text-orange-300 rounded-lg px-4 py-2 text-sm font-semibold transition-colors"
          >
            <DownloadIcon size={14} /> Download forge_agent.py
          </a>
          <div className="space-y-2">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">After downloading:</p>
            <Step n={1}>Mac usually has Python 3 already. Open Terminal and check: <code className="bg-black/40 px-1.5 py-0.5 rounded text-green-300 text-xs">python3 --version</code></Step>
            <Step n={2}>Install dependencies: <code className="bg-black/40 px-1.5 py-0.5 rounded text-green-300 text-xs">pip3 install websockets mss pyautogui pillow</code></Step>
            <Step n={3}>Run: <code className="bg-black/40 px-1.5 py-0.5 rounded text-green-300 text-xs">python3 forge_agent.py</code> — a window shows your <strong>Session Code</strong></Step>
            <Step n={4}>macOS will ask to grant Screen Recording permission — click Allow. Enter the code in your fix session.</Step>
          </div>
          <p className="text-[11px] text-muted-foreground pt-1 border-t border-border">A packaged Mac .app is coming soon — the Python version works exactly the same way.</p>
        </div>
      </Card>
    </div>
  );
}

function AndroidSection() {
  return (
    <Card>
      <h3 className="font-bold text-sm">Add to Home Screen</h3>
      <PwaSteps platform="android" />
      <div className="pt-2 border-t border-border">
        <p className="text-xs text-muted-foreground">
          <strong>Note:</strong> An Android APK for the Forge app is coming soon. The home screen shortcut works the same and is available right now.
        </p>
      </div>
    </Card>
  );
}

function IosSection() {
  return (
    <Card>
      <h3 className="font-bold text-sm">Add to Home Screen</h3>
      <PwaSteps platform="ios" />
      <div className="pt-2 border-t border-border">
        <p className="text-xs text-muted-foreground">
          <strong>Note:</strong> An iOS App Store release is coming soon. The Safari home screen install works today and looks and feels like a native app.
        </p>
      </div>
    </Card>
  );
}

function RemoteSection() {
  const [showAdvanced, setShowAdvanced] = useState(false);

  return (
    <div className="space-y-5">
      <Card>
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-lg bg-orange-500/15 shrink-0">
            <Wifi size={18} className="text-orange-400" />
          </div>
          <div className="space-y-1">
            <h3 className="font-bold text-sm">What is the Forge Remote Agent?</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              A small program you install on your computer that lets Flint see your screen, move your mouse, and type for you during a Computer Fix session. Think of it like giving a trusted mechanic the keys to your car — except you can take the keys back any time, and Flint can't connect without your session code.
            </p>
          </div>
        </div>
        <ul className="space-y-2">
          {[
            "Only active when you're in a fix session",
            "You control the session code — you can disconnect at any time",
            "Flint can see your screen and take over with your permission",
            "Voice built in — talk to Flint while he works",
            "Session ends automatically after the fix is complete",
          ].map(item => (
            <li key={item} className="flex items-start gap-2 text-sm text-muted-foreground">
              <CheckCircle2 size={13} className="text-green-400 shrink-0 mt-0.5" />
              {item}
            </li>
          ))}
        </ul>
      </Card>

      <div className="grid sm:grid-cols-2 gap-4">
        <Card>
          <h4 className="font-bold text-sm flex items-center gap-2">
            <Monitor size={15} className="text-blue-400" /> Windows
          </h4>
          <a
            href={`${BASE}/forge_agent.py`}
            download="forge_agent.py"
            className="flex items-center justify-center gap-2 bg-primary/10 hover:bg-primary/20 border border-primary/30 text-primary rounded-lg px-4 py-2.5 text-sm font-semibold transition-colors"
          >
            <DownloadIcon size={14} /> Download (.py)
          </a>
          <p className="text-xs text-muted-foreground">Windows 10 / 11 · Requires Python 3.8+</p>
          <p className="text-[11px] text-muted-foreground/60">One-click .exe installer coming soon</p>
        </Card>

        <Card>
          <h4 className="font-bold text-sm flex items-center gap-2">
            <Apple size={15} className="text-gray-300" /> Mac
          </h4>
          <a
            href={`${BASE}/forge_agent.py`}
            download="forge_agent.py"
            className="flex items-center justify-center gap-2 bg-primary/10 hover:bg-primary/20 border border-primary/30 text-primary rounded-lg px-4 py-2.5 text-sm font-semibold transition-colors"
          >
            <DownloadIcon size={14} /> Download (.py)
          </a>
          <p className="text-xs text-muted-foreground">macOS 12+ · Apple Silicon + Intel</p>
          <p className="text-[11px] text-muted-foreground/60">Packaged .app coming soon</p>
        </Card>
      </div>

      <Card>
        <button
          className="flex items-center justify-between w-full text-left"
          onClick={() => setShowAdvanced(v => !v)}
        >
          <span className="flex items-center gap-2 text-sm font-semibold">
            <Terminal size={14} className="text-muted-foreground" />
            Run from source (Python — advanced)
          </span>
          {showAdvanced ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </button>

        {showAdvanced && (
          <div className="space-y-4 pt-2">
            <p className="text-xs text-muted-foreground">
              If you prefer to run the agent directly from Python source instead of the packaged .exe or .app:
            </p>
            <div className="space-y-3">
              <Step n={1}>
                Make sure <strong>Python 3.10+</strong> is installed on your computer.{" "}
                <a href="https://python.org/downloads" target="_blank" rel="noreferrer" className="text-primary underline inline-flex items-center gap-0.5">
                  python.org <ExternalLink size={10} />
                </a>
              </Step>
              <Step n={2}>Install the required libraries — open a terminal and run:</Step>
              <Code>pip install websockets mss pyautogui pillow sounddevice numpy</Code>
              <Step n={3}>Download the agent script (coming soon — available when the Remote Agent launches):</Step>
              <div className="inline-flex items-center gap-2 border border-orange-500/20 bg-orange-500/5 rounded-lg px-3 py-2 text-xs font-mono text-orange-300/70">
                🔧 forge_agent.py — Coming Soon
              </div>
              <Step n={4}>Run it:</Step>
              <Code>python forge_agent.py</Code>
              <Step n={5}>A window shows your session code. Enter it in your Computer Fix session on the site.</Step>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}

const SECTION_CONTENT: Record<string, React.ReactNode> = {
  windows: <WindowsSection />,
  mac: <MacSection />,
  android: <AndroidSection />,
  ios: <IosSection />,
  remote: <RemoteSection />,
};

export default function Download() {
  const [active, setActive] = useState("windows");

  return (
    <div className="max-w-2xl mx-auto space-y-6 p-4 md:p-6">
      <div className="space-y-2">
        <h1 className="text-2xl font-black">Get the App</h1>
        <p className="text-sm text-muted-foreground">
          Install 13 Moon Forge on any device. Works as a home screen app on every platform — no App Store required.
        </p>
      </div>

      {/* Platform tabs */}
      <div className="flex flex-wrap gap-2">
        {SECTIONS.map(s => (
          <button
            key={s.id}
            onClick={() => setActive(s.id)}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold border transition-all",
              active === s.id
                ? "bg-primary/15 border-primary/40 text-foreground"
                : "bg-muted/10 border-border text-muted-foreground hover:border-primary/30 hover:text-foreground"
            )}
          >
            <span className={active === s.id ? s.color : ""}>{s.icon}</span>
            {s.label}
          </button>
        ))}
      </div>

      {/* Active section content */}
      <div className="space-y-4">
        {SECTION_CONTENT[active]}
      </div>

      {/* Footer note */}
      <div className="rounded-xl border border-border bg-muted/5 p-4 text-center space-y-1">
        <p className="text-xs text-muted-foreground">
          All Forge tools work in any modern browser. The app install just gives you a cleaner experience with no browser bar.
        </p>
        <p className="text-xs text-muted-foreground">
          The Forge Remote Agent is only needed for Computer Fix sessions.
        </p>
      </div>
    </div>
  );
}
