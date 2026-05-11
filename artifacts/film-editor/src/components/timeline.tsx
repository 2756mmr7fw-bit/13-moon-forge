import { useListFilmClips, getListFilmClipsQueryKey, useUpdateFilmClip, useReorderFilmClips } from "@workspace/api-client-react";
import { Loader2 } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";

export default function Timeline({ projectId }: { projectId: number }) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  const { data: clips, isLoading } = useListFilmClips(projectId, {
    query: { enabled: !!projectId, queryKey: getListFilmClipsQueryKey(projectId) }
  });

  const updateClip = useUpdateFilmClip();
  const reorderClips = useReorderFilmClips();

  // Dummy tracks representation
  const tracks = [
    { id: 'v2', type: 'video', name: 'V2' },
    { id: 'v1', type: 'video', name: 'V1' },
    { id: 'a1', type: 'audio', name: 'A1' },
    { id: 'a2', type: 'audio', name: 'A2' },
  ];

  const handleShuffleClips = () => {
    if (!clips || clips.length < 2) return;
    const clipIds = clips.map(c => c.id).sort(() => Math.random() - 0.5);
    reorderClips.mutate(
      { data: { clipIds } },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListFilmClipsQueryKey(projectId) });
          toast({ title: "Clips reordered" });
        }
      }
    );
  };

  return (
    <div className="flex flex-col h-full bg-[#111111]">
      {/* Timeline Toolbar */}
      <div className="h-8 shrink-0 border-b border-white/10 bg-black/40 flex items-center px-4 text-xs text-white/50 justify-between">
        <div className="flex items-center gap-4">
          <button className="hover:text-white transition-colors">Tools</button>
          <button className="hover:text-white transition-colors">Markers</button>
        </div>
        <button onClick={handleShuffleClips} className="hover:text-white transition-colors" disabled={reorderClips.isPending}>
          {reorderClips.isPending ? "Reordering..." : "Shuffle"}
        </button>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Track Headers */}
        <div className="w-32 shrink-0 border-r border-white/10 bg-[#161616] flex flex-col">
          {/* Time ruler header blank space */}
          <div className="h-6 border-b border-white/10 bg-black/20 shrink-0" />
          
          <div className="flex-1 overflow-hidden flex flex-col relative">
            {tracks.map(track => (
              <div 
                key={track.id} 
                className="h-16 border-b border-white/5 flex items-center px-3 gap-2"
              >
                <div className={`w-2 h-2 rounded-full ${track.type === 'video' ? 'bg-blue-500/50' : 'bg-green-500/50'}`} />
                <span className="text-xs font-medium text-white/60">{track.name}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Tracks Area */}
        <div className="flex-1 flex flex-col relative overflow-x-auto overflow-y-hidden bg-[#0a0a0a]">
          {/* Time Ruler */}
          <div className="h-6 shrink-0 border-b border-white/10 bg-black/40 relative">
            {/* Playhead Guide */}
            <div className="absolute top-0 bottom-0 left-32 w-px bg-red-500 z-50">
              <div className="absolute top-0 -left-1.5 w-3 h-3 bg-red-500 rounded-sm" />
            </div>
          </div>

          {/* Grid */}
          <div className="flex-1 relative">
            {/* Playhead Line */}
            <div className="absolute top-0 bottom-0 left-32 w-px bg-red-500/50 z-40 pointer-events-none" />

            {isLoading ? (
              <div className="absolute inset-0 flex items-center justify-center">
                <Loader2 className="w-5 h-5 text-white/20 animate-spin" />
              </div>
            ) : (
              <div className="absolute inset-0 flex flex-col">
                {tracks.map(track => (
                  <div key={track.id} className="h-16 border-b border-white/5 relative">
                    {/* Render clips for this track */}
                    {clips?.filter((_, i) => (track.name === 'V1' && i % 2 === 0) || (track.name === 'A1' && i % 2 !== 0)).map((clip, i) => (
                      <div 
                        key={clip.id}
                        className={`absolute top-1 bottom-1 rounded border border-white/20 px-2 py-1 overflow-hidden cursor-pointer hover:border-white/50
                          ${clip.type === 'audio' ? 'bg-green-600/20 text-green-400' : 'bg-blue-600/20 text-blue-400'}
                          ${updateClip.isPending && updateClip.variables?.id === clip.id ? 'opacity-50' : ''}
                        `}
                        style={{ left: `${(i * 150) + 50}px`, width: `${(clip.durationMs / 1000) * 10}px`, minWidth: '40px' }}
                        onClick={() => {
                          updateClip.mutate({
                            id: clip.id,
                            data: { name: clip.name + " (Edited)" }
                          }, {
                            onSuccess: () => queryClient.invalidateQueries({ queryKey: getListFilmClipsQueryKey(projectId) })
                          });
                        }}
                      >
                        <div className="text-[10px] font-mono truncate">{clip.name}</div>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
