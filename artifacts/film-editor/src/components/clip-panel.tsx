import { useState } from "react";
import { useListFilmClips, useCreateFilmClip, useDeleteFilmClip, getListFilmClipsQueryKey } from "@workspace/api-client-react";
import { Plus, Film, Music, Image as ImageIcon, Type, Square, Scissors, Loader2, Trash2, Link, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";

interface FilmClip {
  id: number;
  name: string;
  type: string;
  durationMs: number;
  sourceUrl?: string | null;
}

interface ClipPanelProps {
  projectId: number;
  onSelectClip?: (clip: FilmClip | null) => void;
  selectedClipId?: number | null;
}

const CLIP_TYPES = ["video", "audio", "image", "text"] as const;

function ImportModal({ projectId, onClose, onSuccess }: {
  projectId: number;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const { toast } = useToast();
  const createClip = useCreateFilmClip();
  const [form, setForm] = useState({
    name: "",
    sourceUrl: "",
    type: "video" as typeof CLIP_TYPES[number],
    durationMs: 10000,
  });

  function set(k: string, v: string | number) {
    setForm(f => ({ ...f, [k]: v }));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    createClip.mutate(
      {
        id: projectId,
        data: {
          name: form.name || "Imported Clip",
          type: form.type,
          durationMs: form.durationMs,
          sourceUrl: form.sourceUrl || undefined,
        }
      },
      {
        onSuccess: () => {
          toast({ title: "Clip imported" });
          onSuccess();
          onClose();
        },
        onError: () => toast({ variant: "destructive", title: "Failed to import clip" }),
      }
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="bg-[#1a1a1a] border border-white/10 rounded-xl w-full max-w-md shadow-2xl">
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/10">
          <div className="flex items-center gap-2">
            <Link size={14} className="text-primary" />
            <span className="font-semibold text-sm text-white">Import Clip</span>
          </div>
          <button onClick={onClose} className="text-white/40 hover:text-white">
            <X size={14} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <p className="text-xs text-white/40">Paste a direct video or audio URL. MP4, WebM, MP3, and WAV links work in the preview player.</p>

          <div className="space-y-1.5">
            <label className="text-xs text-white/60 font-medium">Media URL</label>
            <input
              type="url"
              value={form.sourceUrl}
              onChange={e => set("sourceUrl", e.target.value)}
              placeholder="https://example.com/video.mp4"
              className="w-full px-3 py-2 text-sm rounded-lg border border-white/10 bg-white/5 text-white placeholder:text-white/25 focus:outline-none focus:ring-1 focus:ring-primary/50"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs text-white/60 font-medium">Clip Name</label>
              <input
                value={form.name}
                onChange={e => set("name", e.target.value)}
                placeholder="My Clip"
                className="w-full px-3 py-2 text-sm rounded-lg border border-white/10 bg-white/5 text-white placeholder:text-white/25 focus:outline-none focus:ring-1 focus:ring-primary/50"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs text-white/60 font-medium">Type</label>
              <select
                value={form.type}
                onChange={e => set("type", e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-lg border border-white/10 bg-[#1a1a1a] text-white focus:outline-none focus:ring-1 focus:ring-primary/50"
              >
                {CLIP_TYPES.map(t => <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
              </select>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs text-white/60 font-medium">Duration (seconds)</label>
            <input
              type="number"
              min="1"
              max="7200"
              value={form.durationMs / 1000}
              onChange={e => set("durationMs", parseFloat(e.target.value) * 1000 || 10000)}
              className="w-full px-3 py-2 text-sm rounded-lg border border-white/10 bg-white/5 text-white focus:outline-none focus:ring-1 focus:ring-primary/50"
            />
          </div>

          <div className="flex gap-2 pt-1">
            <Button type="button" variant="ghost" onClick={onClose} className="flex-1 text-white/60 hover:text-white border border-white/10">
              Cancel
            </Button>
            <Button type="submit" disabled={createClip.isPending} className="flex-1 gap-1.5">
              {createClip.isPending ? <Loader2 size={13} className="animate-spin" /> : <Plus size={13} />}
              Import
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function ClipPanel({ projectId, onSelectClip, selectedClipId }: ClipPanelProps) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [showImport, setShowImport] = useState(false);

  const { data: clips, isLoading } = useListFilmClips(projectId, {
    query: { enabled: !!projectId, queryKey: getListFilmClipsQueryKey(projectId) }
  });

  const deleteClip = useDeleteFilmClip();

  const handleDeleteClip = (id: number, e: React.MouseEvent) => {
    e.stopPropagation();
    deleteClip.mutate(
      { id: projectId, clipId: id },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListFilmClipsQueryKey(projectId) });
          if (selectedClipId === id) onSelectClip?.(null);
          toast({ title: "Clip deleted" });
        }
      }
    );
  };

  const getIcon = (type: string) => {
    switch (type) {
      case "video": return <Film className="w-4 h-4 text-blue-400" />;
      case "audio": return <Music className="w-4 h-4 text-green-400" />;
      case "image": return <ImageIcon className="w-4 h-4 text-orange-400" />;
      case "text": return <Type className="w-4 h-4 text-white" />;
      case "color": return <Square className="w-4 h-4 text-purple-400" />;
      case "transition": return <Scissors className="w-4 h-4 text-gray-400" />;
      default: return <Film className="w-4 h-4" />;
    }
  };

  return (
    <>
      <div className="flex flex-col h-full text-sm">
        <div className="h-10 shrink-0 border-b border-white/10 flex items-center px-4 justify-between bg-black/40">
          <span className="font-medium text-white/80">Media Bin</span>
          <button
            onClick={() => setShowImport(true)}
            className="flex items-center gap-1 text-[10px] text-white/50 hover:text-white border border-white/10 hover:border-white/30 rounded px-2 py-1 transition-colors"
          >
            <Link size={10} /> Import URL
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {isLoading ? (
            <div className="py-8 flex justify-center text-white/30">
              <Loader2 className="w-5 h-5 animate-spin" />
            </div>
          ) : clips?.length === 0 ? (
            <div className="py-8 px-4 text-center space-y-3">
              <p className="text-white/30 text-xs">No media yet.</p>
              <button
                onClick={() => setShowImport(true)}
                className="text-xs text-primary/70 hover:text-primary underline-offset-2 hover:underline"
              >
                Import from URL
              </button>
            </div>
          ) : (
            clips?.map(clip => (
              <div
                key={clip.id}
                onClick={() => onSelectClip?.(selectedClipId === clip.id ? null : clip as FilmClip)}
                className={`flex items-center gap-3 p-2 rounded cursor-pointer group transition-colors ${
                  selectedClipId === clip.id
                    ? "bg-primary/15 border border-primary/30"
                    : "hover:bg-white/5 border border-transparent"
                }`}
              >
                <div className="w-8 h-8 shrink-0 bg-black/50 rounded flex items-center justify-center">
                  {getIcon(clip.type)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="truncate text-white/90 text-xs">{clip.name}</div>
                  <div className="text-[10px] text-white/40 font-mono mt-0.5 flex items-center gap-1">
                    {(clip.durationMs / 1000).toFixed(1)}s
                    {(clip as FilmClip).sourceUrl && <span className="text-primary/50">· URL</span>}
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

      {showImport && (
        <ImportModal
          projectId={projectId}
          onClose={() => setShowImport(false)}
          onSuccess={() => queryClient.invalidateQueries({ queryKey: getListFilmClipsQueryKey(projectId) })}
        />
      )}
    </>
  );
}
