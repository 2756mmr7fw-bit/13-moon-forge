import { useParams } from "wouter";
import { useGetFilmProject } from "@workspace/api-client-react";
import { Loader2 } from "lucide-react";
import Timeline from "@/components/timeline";
import ClipPanel from "@/components/clip-panel";
import AiPanel from "@/components/ai-panel";
import { getGetFilmProjectQueryKey } from "@workspace/api-client-react";

export default function Editor() {
  const params = useParams();
  const projectId = parseInt(params.id || "0", 10);

  const { data: project, isLoading } = useGetFilmProject(projectId, {
    query: { enabled: !!projectId, queryKey: getGetFilmProjectQueryKey(projectId) }
  });

  if (isLoading || !project) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="h-screen w-full flex flex-col overflow-hidden bg-[#0A0A0A] text-foreground selection:bg-primary/30">
      {/* Top Navbar */}
      <header className="h-14 shrink-0 border-b border-white/10 bg-black/40 flex items-center px-4 justify-between">
        <div className="flex items-center gap-4">
          <h1 className="font-semibold text-sm tracking-wide truncate max-w-[300px]">
            {project.title}
          </h1>
          <div className="text-[10px] px-2 py-0.5 rounded-full bg-white/5 text-white/50 uppercase tracking-wider font-mono">
            {project.status.replace("_", " ")}
          </div>
        </div>
        <div className="text-xs text-white/40 font-mono">
          {project.aspectRatio} @ {project.frameRate}fps
        </div>
      </header>

      {/* Main Workspace */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left: Clip Bin */}
        <div className="w-72 shrink-0 border-r border-white/10 flex flex-col bg-black/20">
          <ClipPanel projectId={project.id} />
        </div>

        {/* Center: Preview Player */}
        <div className="flex-1 flex flex-col min-w-0 bg-black/60 relative">
          <div className="flex-1 flex items-center justify-center p-8 relative overflow-hidden">
            <div className="w-full h-full max-w-4xl mx-auto flex items-center justify-center">
              {/* Dummy Player Viewport */}
              <div 
                className="w-full bg-black shadow-2xl ring-1 ring-white/5 relative overflow-hidden"
                style={{ 
                  aspectRatio: project.aspectRatio.replace(':', '/'),
                  maxHeight: '100%' 
                }}
              >
                <div className="absolute inset-0 flex items-center justify-center text-white/20 font-mono text-sm tracking-widest uppercase">
                  No Clip Selected
                </div>
                
                {/* Safe Area Guides */}
                <div className="absolute inset-[5%] border border-white/10 pointer-events-none" />
                <div className="absolute inset-[10%] border border-white/5 pointer-events-none" />
                <div className="absolute left-1/2 top-0 bottom-0 w-px bg-white/10 pointer-events-none" />
                <div className="absolute top-1/2 left-0 right-0 h-px bg-white/10 pointer-events-none" />
              </div>
            </div>
          </div>
          
          {/* Player Controls */}
          <div className="h-12 shrink-0 border-t border-white/10 flex items-center justify-center px-4 gap-4 bg-black/40">
            <div className="font-mono text-xs text-primary w-24 text-right">00:00:00:00</div>
            <div className="flex items-center gap-2">
              <button className="w-8 h-8 flex items-center justify-center rounded hover:bg-white/10 text-white/70">◁</button>
              <button className="w-8 h-8 flex items-center justify-center rounded hover:bg-white/10 text-white/70">▷</button>
            </div>
            <div className="font-mono text-xs text-white/40 w-24">00:00:00:00</div>
          </div>
        </div>

        {/* Right: AI Co-Director */}
        <div className="w-80 shrink-0 border-l border-white/10 flex flex-col bg-[#0f0f11]">
          <AiPanel />
        </div>
      </div>

      {/* Bottom: Timeline */}
      <div className="h-80 shrink-0 border-t border-white/10 flex flex-col bg-[#141414]">
        <Timeline projectId={project.id} />
      </div>
    </div>
  );
}
