import { useListFilmClips, useCreateFilmClip, useDeleteFilmClip, getListFilmClipsQueryKey } from "@workspace/api-client-react";
import { Plus, Film, Music, Image as ImageIcon, Type, Square, Scissors, Loader2, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";

export default function ClipPanel({ projectId }: { projectId: number }) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { data: clips, isLoading } = useListFilmClips(projectId, {
    query: { enabled: !!projectId, queryKey: getListFilmClipsQueryKey(projectId) }
  });

  const createClip = useCreateFilmClip();
  const deleteClip = useDeleteFilmClip();

  const handleAddClip = () => {
    createClip.mutate(
      {
        data: {
          name: `New Clip ${clips?.length ? clips.length + 1 : 1}`,
          type: "video",
          durationMs: 5000,
          projectId
        }
      },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListFilmClipsQueryKey(projectId) });
          toast({ title: "Clip added" });
        }
      }
    );
  };

  const handleDeleteClip = (id: number, e: React.MouseEvent) => {
    e.stopPropagation();
    deleteClip.mutate(
      { id },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListFilmClipsQueryKey(projectId) });
          toast({ title: "Clip deleted" });
        }
      }
    );
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'video': return <Film className="w-4 h-4 text-blue-400" />;
      case 'audio': return <Music className="w-4 h-4 text-green-400" />;
      case 'image': return <ImageIcon className="w-4 h-4 text-orange-400" />;
      case 'text': return <Type className="w-4 h-4 text-white" />;
      case 'color': return <Square className="w-4 h-4 text-purple-400" />;
      case 'transition': return <Scissors className="w-4 h-4 text-gray-400" />;
      default: return <Film className="w-4 h-4" />;
    }
  };

  return (
    <div className="flex flex-col h-full text-sm">
      <div className="h-10 shrink-0 border-b border-white/10 flex items-center px-4 justify-between bg-black/40">
        <span className="font-medium text-white/80">Project Media</span>
        <Button 
          variant="ghost" 
          size="icon" 
          className="h-6 w-6 text-white/60 hover:text-white hover:bg-white/10"
          onClick={handleAddClip}
          disabled={createClip.isPending}
        >
          {createClip.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
        </Button>
      </div>
      
      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        {isLoading ? (
          <div className="py-8 flex justify-center text-white/30">
            <Loader2 className="w-5 h-5 animate-spin" />
          </div>
        ) : clips?.length === 0 ? (
          <div className="py-8 px-4 text-center text-white/30 text-xs">
            No media imported yet. Click + to add clips.
          </div>
        ) : (
          clips?.map(clip => (
            <div 
              key={clip.id} 
              className="flex items-center gap-3 p-2 rounded hover:bg-white/5 cursor-pointer group"
            >
              <div className="w-8 h-8 shrink-0 bg-black/50 rounded flex items-center justify-center">
                {getIcon(clip.type)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="truncate text-white/90 text-xs">{clip.name}</div>
                <div className="text-[10px] text-white/40 font-mono mt-0.5">
                  {(clip.durationMs / 1000).toFixed(1)}s
                </div>
              </div>
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-6 w-6 opacity-0 group-hover:opacity-100 text-white/40 hover:text-red-400 hover:bg-white/10 transition-all"
                onClick={(e) => handleDeleteClip(clip.id, e)}
              >
                <Trash2 className="w-3 h-3" />
              </Button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
