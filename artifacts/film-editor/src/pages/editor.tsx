import { useState } from "react";
import { useParams } from "wouter";
import { useGetFilmProject } from "@workspace/api-client-react";
import { Loader2, Play, Pause, SkipBack, SkipForward } from "lucide-react";
import Timeline from "@/components/timeline";
import ClipPanel from "@/components/clip-panel";
import AiPanel from "@/components/ai-panel";
import { getGetFilmProjectQueryKey } from "@workspace/api-client-react";
import { Link } from "wouter";
import { Film } from "lucide-react";

interface FilmClip {
  id: number;
  name: string;
  type: string;
  durationMs: number;
  sourceUrl?: string | null;
}

export default function Editor() {
  const params = useParams();
  const projectId = parseInt(params.id || "0", 10);
  const [selectedClip, setSelectedClip] = useState<FilmClip | null>(null);
  const [playing, setPlaying] = useState(false);

  const { data: project, isLoading } = useGetFilmProject(projectId, {
    query: { enabled: !!projectId, queryKey: getGetFilmProjectQueryKey(projectId) }
  });

  if (isLoading || !project) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-[#080808]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const isVideo = selectedClip?.type === "video";
  const isAudio = selectedClip?.type === "audio";
  const hasMedia = selectedClip?.sourceUrl && (isVideo || isAudio);

  return (
    <div className="h-screen w-full flex flex-col overflow-hidden bg-[#0A0A0A] text-foreground">
      {/* Top Navbar */}
      <header className="h-14 shrink-0 border-b border-white/10 bg-black/40 flex items-center px-4 justify-between">
        <div className="flex items-center gap-4">
          <Link href="/dashboard" className="flex items-center gap-2 text-white/40 hover:text-white transition-colors">
            <Film size={15} className="text-primary" />
            <span className="text-xs font-semibold text-primary/80 tracking-wide hidden sm:block">13 Moon Editor</span>
          </Link>
          <span className="text-white/20">/</span>
          <h1 className="font-semibold text-sm tracking-wide truncate max-w-[200px] text-white/90">
            {project.title}
          </h1>
          <div className="text-[10px] px-2 py-0.5 rounded-full bg-white/5 text-white/40 uppercase tracking-wider font-mono hidden sm:block">
            {project.status.replace("_", " ")}
          </div>
        </div>
        <div className="text-xs text-white/30 font-mono hidden sm:block">
          {project.aspectRatio} · {project.frameRate}fps
        </div>
      </header>

      {/* Main Workspace */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left: Clip Bin */}
        <div className="w-56 shrink-0 border-r border-white/10 flex flex-col bg-black/20">
          <ClipPanel
            projectId={project.id}
            selectedClipId={selectedClip?.id ?? null}
            onSelectClip={setSelectedClip}
          />
        </div>

        {/* Center: Preview Player */}
        <div className="flex-1 flex flex-col min-w-0 bg-black/60 relative">
          <div className="flex-1 flex items-center justify-center p-6 relative overflow-hidden">
            <div className="w-full h-full max-w-4xl mx-auto flex items-center justify-center">
              <div
                className="w-full bg-black shadow-2xl ring-1 ring-white/5 relative overflow-hidden"
                style={{
                  aspectRatio: project.aspectRatio.replace(":", "/"),
                  maxHeight: "100%"
                }}
              >
                {hasMedia && isVideo ? (
                  <video
                    key={selectedClip?.id}
                    src={selectedClip!.sourceUrl!}
                    controls
                    className="w-full h-full object-contain"
                    onPlay={() => setPlaying(true)}
                    onPause={() => setPlaying(false)}
                  />
                ) : hasMedia && isAudio ? (
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-gradient-to-br from-green-950/30 to-black">
                    <div className="w-16 h-16 rounded-full bg-green-900/40 flex items-center justify-center">
                      <div className="w-8 h-8 rounded-full bg-green-500/30 animate-pulse" />
                    </div>
                    <p className="text-xs text-white/60 font-mono truncate max-w-[80%]">{selectedClip?.name}</p>
                    <audio
                      key={selectedClip?.id}
                      src={selectedClip!.sourceUrl!}
                      controls
                      className="w-4/5"
                    />
                  </div>
                ) : selectedClip ? (
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-white/20">
                    <div className="text-3xl">🎬</div>
                    <p className="text-xs font-mono">{selectedClip.name}</p>
                    <p className="text-[10px] text-white/15">No preview URL · {(selectedClip.durationMs / 1000).toFixed(1)}s</p>
                  </div>
                ) : (
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-white/15">
                    <div className="text-2xl">▶</div>
                    <p className="text-xs font-mono tracking-widest uppercase">Select a clip to preview</p>
                    {/* Safe area guides */}
                    <div className="absolute inset-[5%] border border-white/5 pointer-events-none" />
                    <div className="absolute left-1/2 top-0 bottom-0 w-px bg-white/5 pointer-events-none" />
                    <div className="absolute top-1/2 left-0 right-0 h-px bg-white/5 pointer-events-none" />
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Player Controls (only for non-native-controls clips) */}
          {!hasMedia && (
            <div className="h-12 shrink-0 border-t border-white/10 flex items-center justify-center px-4 gap-4 bg-black/40">
              <div className="font-mono text-xs text-primary/70 w-24 text-right">00:00:00:00</div>
              <div className="flex items-center gap-2">
                <button className="w-8 h-8 flex items-center justify-center rounded hover:bg-white/10 text-white/50">
                  <SkipBack size={14} />
                </button>
                <button
                  onClick={() => setPlaying(p => !p)}
                  className="w-9 h-9 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 text-white/80"
                >
                  {playing ? <Pause size={15} /> : <Play size={15} />}
                </button>
                <button className="w-8 h-8 flex items-center justify-center rounded hover:bg-white/10 text-white/50">
                  <SkipForward size={14} />
                </button>
              </div>
              <div className="font-mono text-xs text-white/30 w-24">00:00:00:00</div>
            </div>
          )}
        </div>

        {/* Right: AI Co-Director */}
        <div className="w-72 shrink-0 border-l border-white/10 flex flex-col bg-[#0f0f11]">
          <AiPanel projectId={project.id} />
        </div>
      </div>

      {/* Bottom: Timeline */}
      <div className="h-52 shrink-0 border-t border-white/10 flex flex-col bg-[#141414]">
        <Timeline projectId={project.id} selectedClipId={selectedClip?.id ?? null} onSelectClip={setSelectedClip} />
      </div>
    </div>
  );
}
