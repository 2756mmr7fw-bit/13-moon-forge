import { useState } from "react";
import { Film, Sparkles, Layers, Play, Scissors, Music, Zap, ArrowRight, Star, Globe } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";

const FEATURES = [
  {
    icon: Scissors,
    title: "Timeline Editing",
    desc: "Multi-track timeline for video, audio, images, and text overlays. Cut, trim, and arrange clips with precision.",
  },
  {
    icon: Sparkles,
    title: "AI Co-Director",
    desc: "13 Moons AI analyzes your cut, suggests pacing improvements, generates scratch voiceover, and helps you find the right angle.",
  },
  {
    icon: Music,
    title: "Audio & Video Tracks",
    desc: "Layer multiple video and audio tracks. Import from URL or link your media files directly.",
  },
  {
    icon: Globe,
    title: "Any Aspect Ratio",
    desc: "16:9 widescreen, 9:16 vertical, 1:1 square, 21:9 cinematic. Built for every platform.",
  },
  {
    icon: Zap,
    title: "Fast & Browser-Based",
    desc: "No download required. Works in your browser. Your projects are saved and accessible anywhere.",
  },
  {
    icon: Layers,
    title: "Project Management",
    desc: "Organize all your cuts in one place. See total footage edited, project status, and recent work at a glance.",
  },
];

export default function Landing() {
  const [, navigate] = useLocation();
  const [playDemo, setPlayDemo] = useState(false);

  return (
    <div className="min-h-screen bg-[#080808] text-white overflow-x-hidden">

      {/* Nav */}
      <nav className="fixed top-0 inset-x-0 z-50 border-b border-white/5 bg-black/60 backdrop-blur-md">
        <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-primary/20 flex items-center justify-center">
              <Film size={14} className="text-primary" />
            </div>
            <span className="font-bold text-sm tracking-tight">13 Moon Film Editor</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs text-white/40 hidden sm:block">AI-powered. Browser-based. Free.</span>
            <Button
              size="sm"
              className="gap-1.5 font-semibold"
              onClick={() => navigate("/dashboard")}
            >
              Start Editing <ArrowRight size={13} />
            </Button>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <div className="relative pt-32 pb-20 px-6 text-center overflow-hidden">
        {/* Glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-primary/10 rounded-full blur-[120px] pointer-events-none" />

        <div className="relative z-10 max-w-3xl mx-auto space-y-6">
          <div className="inline-flex items-center gap-2 bg-white/5 border border-white/10 text-white/60 px-3 py-1.5 rounded-full text-xs font-medium">
            <Star size={10} className="text-primary" fill="currentColor" />
            Built on 13 Moon Forge · Free to use
          </div>

          <h1 className="text-4xl sm:text-6xl font-black leading-tight tracking-tight">
            Edit film like a<br />
            <span className="text-primary">director with AI.</span>
          </h1>

          <p className="text-base sm:text-lg text-white/50 max-w-xl mx-auto leading-relaxed">
            A browser-based video editor with a real timeline, multi-track support, and an AI co-director
            that helps you cut smarter. No download. No monthly fee. Yours.
          </p>

          <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
            <Button
              size="lg"
              className="gap-2 font-bold text-base px-8"
              onClick={() => navigate("/dashboard")}
            >
              <Film size={16} /> Open the Editor
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="gap-2 border-white/10 text-white/70 hover:text-white hover:border-white/30"
              onClick={() => setPlayDemo(true)}
            >
              <Play size={14} /> See How It Works
            </Button>
          </div>
        </div>
      </div>

      {/* Editor Preview */}
      <div className="max-w-5xl mx-auto px-6 pb-20">
        <div className="relative rounded-2xl overflow-hidden border border-white/10 shadow-2xl shadow-black/80">
          {/* Mock Editor UI */}
          <div className="bg-[#0a0a0a] h-10 border-b border-white/10 flex items-center px-4 gap-3">
            <div className="flex gap-1.5">
              <div className="w-3 h-3 rounded-full bg-red-500/60" />
              <div className="w-3 h-3 rounded-full bg-yellow-500/60" />
              <div className="w-3 h-3 rounded-full bg-green-500/60" />
            </div>
            <span className="text-xs text-white/30 font-mono">13 Moon Film Editor — My Documentary.13mfp</span>
          </div>
          <div className="bg-[#0d0d0d] flex h-64 sm:h-80">
            {/* Left panel */}
            <div className="w-40 sm:w-52 border-r border-white/10 p-3 space-y-2 shrink-0">
              <div className="text-[10px] text-white/30 uppercase tracking-widest mb-3">Project Media</div>
              {["Opening Scene.mp4", "Interview Cut.mp4", "B-Roll Nature.mp4", "Background Score.mp3", "Narration VO.mp3"].map((name, i) => (
                <div key={i} className="flex items-center gap-2 p-1.5 rounded hover:bg-white/5 cursor-pointer">
                  <div className={`w-6 h-6 rounded flex items-center justify-center shrink-0 ${i < 3 ? "bg-blue-500/20" : "bg-green-500/20"}`}>
                    {i < 3 ? <Film size={10} className="text-blue-400" /> : <Music size={10} className="text-green-400" />}
                  </div>
                  <span className="text-[10px] text-white/60 truncate">{name}</span>
                </div>
              ))}
            </div>
            {/* Center preview */}
            <div className="flex-1 flex items-center justify-center bg-black/40 relative">
              <div className="w-4/5 aspect-video bg-black rounded border border-white/5 flex items-center justify-center relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-blue-900/20 to-purple-900/20" />
                <Play size={32} className="text-white/20" />
                <div className="absolute bottom-2 left-2 right-2 h-1 bg-white/10 rounded-full">
                  <div className="h-full w-1/3 bg-primary rounded-full" />
                </div>
              </div>
              <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex items-center gap-2 text-white/40 font-mono text-[10px]">
                00:00:34:12 / 00:02:15:00
              </div>
            </div>
            {/* Right AI panel */}
            <div className="w-48 sm:w-56 border-l border-white/10 p-3 flex flex-col shrink-0">
              <div className="flex items-center gap-1.5 mb-3">
                <Sparkles size={11} className="text-primary" />
                <span className="text-[10px] text-white/60 font-medium">13 Moons AI</span>
              </div>
              <div className="flex-1 space-y-2">
                <div className="bg-white/5 rounded-lg p-2 text-[10px] text-white/60 leading-relaxed">
                  The cut at 0:34 feels abrupt. Try a 12-frame dissolve to ease the transition into the interview.
                </div>
                <div className="bg-primary/10 rounded-lg p-2 text-[10px] text-primary/80 leading-relaxed ml-4">
                  Can you suggest a pacing change for the opening?
                </div>
                <div className="bg-white/5 rounded-lg p-2 text-[10px] text-white/60 leading-relaxed">
                  Your opening runs 18s before the first cut. For documentary style, 8–10s is tighter. Try trimming the establishing shot.
                </div>
              </div>
            </div>
          </div>
          {/* Timeline */}
          <div className="bg-[#111] h-20 border-t border-white/10 p-2">
            <div className="flex gap-1 h-full items-center">
              <div className="w-20 shrink-0 space-y-1">
                <div className="text-[9px] text-white/30 flex items-center gap-1"><div className="w-1.5 h-1.5 rounded-full bg-blue-500/50" />V1</div>
                <div className="text-[9px] text-white/30 flex items-center gap-1"><div className="w-1.5 h-1.5 rounded-full bg-green-500/50" />A1</div>
              </div>
              <div className="flex-1 space-y-1">
                <div className="flex gap-1">
                  {[120, 80, 160, 90, 110].map((w, i) => (
                    <div key={i} style={{ width: w }} className="h-6 rounded bg-blue-600/30 border border-blue-500/30 text-[9px] text-blue-400/70 flex items-center px-1.5 truncate shrink-0">
                      Clip {i + 1}
                    </div>
                  ))}
                </div>
                <div className="flex gap-1">
                  {[200, 140, 180].map((w, i) => (
                    <div key={i} style={{ width: w }} className="h-6 rounded bg-green-600/30 border border-green-500/30 text-[9px] text-green-400/70 flex items-center px-1.5 truncate shrink-0">
                      Audio {i + 1}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
        <p className="text-center text-xs text-white/25 mt-4 font-mono">Preview of the editor interface</p>
      </div>

      {/* Features */}
      <div className="max-w-5xl mx-auto px-6 pb-24">
        <div className="text-center mb-12 space-y-3">
          <h2 className="text-2xl sm:text-3xl font-bold">Everything you need to cut your film</h2>
          <p className="text-sm text-white/40 max-w-md mx-auto">
            No fluff. Just the tools a real editor needs, powered by AI that actually knows filmmaking.
          </p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {FEATURES.map((f) => (
            <div key={f.title} className="bg-white/3 border border-white/8 rounded-xl p-5 space-y-3 hover:border-primary/30 transition-colors">
              <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                <f.icon size={16} className="text-primary" />
              </div>
              <h3 className="font-semibold text-sm">{f.title}</h3>
              <p className="text-xs text-white/45 leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* CTA */}
      <div className="max-w-2xl mx-auto px-6 pb-24 text-center space-y-6">
        <div className="bg-gradient-to-br from-primary/10 via-primary/5 to-transparent border border-primary/20 rounded-2xl p-10 space-y-5">
          <h2 className="text-2xl font-bold">Ready to start cutting?</h2>
          <p className="text-sm text-white/50">
            Free to use. No credit card. Your projects live on your account — edit on any device.
          </p>
          <Button
            size="lg"
            className="gap-2 font-bold px-10"
            onClick={() => navigate("/dashboard")}
          >
            <Film size={16} /> Open the Editor
          </Button>
          <p className="text-xs text-white/30">
            Powered by <a href="https://13moonforge.ai" className="text-primary/70 hover:text-primary underline-offset-2 hover:underline" target="_blank" rel="noopener noreferrer">13 Moon Forge</a>
          </p>
        </div>
      </div>

      {playDemo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm" onClick={() => setPlayDemo(false)}>
          <div className="bg-[#111] border border-white/10 rounded-2xl p-6 max-w-lg w-full space-y-4 text-center" onClick={e => e.stopPropagation()}>
            <Film size={32} className="mx-auto text-primary" />
            <h3 className="font-bold text-lg">Try it yourself</h3>
            <p className="text-sm text-white/50">The best demo is the real thing. Create a project, import clips via URL, and let the AI co-director guide your cut.</p>
            <Button className="w-full gap-2" onClick={() => { setPlayDemo(false); navigate("/projects/new"); }}>
              <Film size={14} /> Create Your First Project
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
