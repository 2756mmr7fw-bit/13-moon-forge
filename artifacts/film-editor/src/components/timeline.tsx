import { useListFilmClips, getListFilmClipsQueryKey, useReorderFilmClips } from "@workspace/api-client-react";
import { Loader2, Shuffle } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";

interface FilmClip {
  id: number;
  name: string;
  type: string;
  durationMs: number;
  sourceUrl?: string | null;
}

interface TimelineProps {
  projectId: number;
  selectedClipId?: number | null;
  onSelectClip?: (clip: FilmClip | null) => void;
}

const TRACKS = [
  { id: "v1", type: "video", name: "V1", color: "blue" },
  { id: "v2", type: "video", name: "V2", color: "blue" },
  { id: "a1", type: "audio", name: "A1", color: "green" },
  { id: "a2", type: "audio", name: "A2", color: "green" },
];

const PX_PER_SEC = 80;

export default function Timeline({ projectId, selectedClipId, onSelectClip }: TimelineProps) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: clips, isLoading } = useListFilmClips(projectId, {
    query: { enabled: !!projectId, queryKey: getListFilmClipsQueryKey(projectId) }
  });

  const reorderClips = useReorderFilmClips();

  const handleShuffleClips = () => {
    if (!clips || clips.length < 2) return;
    const clipIds = clips.map(c => c.id).sort(() => Math.random() - 0.5);
    reorderClips.mutate(
      { id: projectId, data: { clipIds } },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListFilmClipsQueryKey(projectId) });
          toast({ title: "Clips reordered" });
        }
      }
    );
  };

  // Assign clips to tracks by type and order
  const videoClips = clips?.filter(c => c.type === "video" || c.type === "image") ?? [];
  const audioClips = clips?.filter(c => c.type === "audio") ?? [];
  const v1Clips = videoClips.filter((_, i) => i % 2 === 0);
  const v2Clips = videoClips.filter((_, i) => i % 2 !== 0);
  const a1Clips = audioClips.filter((_, i) => i % 2 === 0);
  const a2Clips = audioClips.filter((_, i) => i % 2 !== 0);

  const trackClips: Record<string, typeof videoClips> = {
    v1: v1Clips,
    v2: v2Clips,
    a1: a1Clips,
    a2: a2Clips,
  };

  // Build ruler ticks up to total duration
  const totalMs = clips?.reduce((sum, c) => sum + c.durationMs, 0) ?? 60000;
  const totalSec = Math.max(Math.ceil(totalMs / 1000), 60);
  const rulerTicks = Array.from({ length: Math.ceil(totalSec / 5) + 1 }, (_, i) => i * 5);

  return (
    <div className="flex flex-col h-full bg-[#111111]">
      {/* Timeline Toolbar */}
      <div className="h-8 shrink-0 border-b border-white/10 bg-black/40 flex items-center px-4 text-xs text-white/40 justify-between">
        <div className="flex items-center gap-4">
          <span className="font-mono text-[10px]">{clips?.length ?? 0} clips</span>
          <span className="text-white/20">·</span>
          <span className="font-mono text-[10px]">{(totalMs / 1000).toFixed(1)}s total</span>
        </div>
        <button
          onClick={handleShuffleClips}
          disabled={reorderClips.isPending || !clips?.length}
          className="flex items-center gap-1 hover:text-white transition-colors disabled:opacity-30"
        >
          {reorderClips.isPending
            ? <Loader2 size={11} className="animate-spin" />
            : <Shuffle size={11} />}
          <span className="text-[10px]">Shuffle</span>
        </button>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Track Headers */}
        <div className="w-28 shrink-0 border-r border-white/10 bg-[#161616] flex flex-col">
          <div className="h-5 border-b border-white/10 bg-black/20 shrink-0" />
          {TRACKS.map(track => (
            <div
              key={track.id}
              className="h-10 border-b border-white/5 flex items-center px-3 gap-2"
            >
              <div className={`w-2 h-2 rounded-full ${track.color === "blue" ? "bg-blue-500/50" : "bg-green-500/50"}`} />
              <span className="text-xs font-mono text-white/50">{track.name}</span>
            </div>
          ))}
        </div>

        {/* Tracks Scroll Area */}
        <div className="flex-1 flex flex-col relative overflow-x-auto overflow-y-hidden bg-[#0a0a0a]">
          {/* Time Ruler */}
          <div className="h-5 shrink-0 border-b border-white/10 bg-black/40 relative flex" style={{ minWidth: `${totalSec * PX_PER_SEC}px` }}>
            {rulerTicks.map(sec => (
              <div key={sec} className="absolute top-0 bottom-0 flex flex-col" style={{ left: sec * PX_PER_SEC }}>
                <div className="w-px h-full bg-white/10" />
                <span className="absolute top-0.5 left-1 text-[9px] text-white/30 font-mono whitespace-nowrap">
                  {new Date(sec * 1000).toISOString().substring(11, 19)}
                </span>
              </div>
            ))}
            {/* Playhead */}
            <div className="absolute top-0 bottom-0 left-0 w-px bg-red-500 z-50">
              <div className="absolute top-0 -left-1 w-2 h-2 bg-red-500 rotate-45 translate-y-0.5" />
            </div>
          </div>

          {/* Track Rows */}
          <div className="flex-1 flex flex-col" style={{ minWidth: `${totalSec * PX_PER_SEC}px` }}>
            {isLoading ? (
              <div className="flex items-center justify-center h-full">
                <Loader2 className="w-5 h-5 text-white/20 animate-spin" />
              </div>
            ) : (
              TRACKS.map(track => {
                const tClips = trackClips[track.id] ?? [];
                let offset = 0;
                return (
                  <div key={track.id} className="h-10 border-b border-white/5 relative">
                    {tClips.map(clip => {
                      const left = offset * PX_PER_SEC;
                      const width = Math.max((clip.durationMs / 1000) * PX_PER_SEC, 30);
                      offset += clip.durationMs / 1000;
                      const isSelected = selectedClipId === clip.id;
                      return (
                        <div
                          key={clip.id}
                          onClick={() => onSelectClip?.(isSelected ? null : clip as FilmClip)}
                          className={`absolute top-1 bottom-1 rounded border px-1.5 py-0.5 overflow-hidden cursor-pointer transition-all ${
                            track.color === "blue"
                              ? isSelected
                                ? "bg-blue-500/40 border-blue-400 ring-1 ring-blue-400/50"
                                : "bg-blue-600/20 border-blue-500/30 hover:bg-blue-600/30 hover:border-blue-400/50"
                              : isSelected
                                ? "bg-green-500/40 border-green-400 ring-1 ring-green-400/50"
                                : "bg-green-600/20 border-green-500/30 hover:bg-green-600/30 hover:border-green-400/50"
                          }`}
                          style={{ left, width }}
                        >
                          <div className={`text-[9px] font-mono truncate ${track.color === "blue" ? "text-blue-300" : "text-green-300"}`}>
                            {clip.name}
                          </div>
                          {(clip as FilmClip).sourceUrl && (
                            <div className="absolute bottom-0.5 right-1 text-[7px] text-white/25">URL</div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
