import { useState, useRef } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  Upload, FileImage, FileVideo, FileArchive, File, FileText,
  Flame, Users, GraduationCap, BookOpen, Wrench, Film,
  Shield, XCircle, Phone, Wallet, Scissors, PenLine, Tv,
  CheckCircle2, X, ArrowRight, Inbox, Clock, HardDrive,
  ChevronDown,
} from "lucide-react";

interface DropApp {
  id: string;
  name: string;
  shortName: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  color: string;
  bg: string;
  border: string;
  accepts: string[];
  status: "live" | "soon";
}

interface DroppedFile {
  id: string;
  name: string;
  size: number;
  type: string;
  destination: string;
  timestamp: string;
  status: "sent" | "pending";
}

const DROP_APPS: DropApp[] = [
  {
    id: "forge",
    name: "The Forge",
    shortName: "Forge",
    icon: Flame,
    color: "text-orange-400",
    bg: "bg-orange-500/10",
    border: "border-orange-500/30",
    accepts: ["zip", "pdf", "image", "doc"],
    status: "live",
  },
  {
    id: "academy",
    name: "Forge Academy",
    shortName: "Academy",
    icon: GraduationCap,
    color: "text-orange-400",
    bg: "bg-orange-500/10",
    border: "border-orange-500/30",
    accepts: ["zip", "pdf", "image", "doc"],
    status: "live",
  },
  {
    id: "town-square",
    name: "People's Town Square",
    shortName: "Town Square",
    icon: Users,
    color: "text-green-400",
    bg: "bg-green-500/10",
    border: "border-green-500/30",
    accepts: ["image", "doc", "pdf"],
    status: "live",
  },
  {
    id: "press-tv",
    name: "Town Square Press TV",
    shortName: "Press TV",
    icon: Tv,
    color: "text-red-400",
    bg: "bg-red-500/10",
    border: "border-red-500/30",
    accepts: ["video", "image", "doc"],
    status: "soon",
  },
  {
    id: "press",
    name: "Town Square Press",
    shortName: "Press",
    icon: BookOpen,
    color: "text-amber-400",
    bg: "bg-amber-500/10",
    border: "border-amber-500/30",
    accepts: ["pdf", "doc", "image"],
    status: "soon",
  },
  {
    id: "workshop",
    name: "Inventors Workshop",
    shortName: "Workshop",
    icon: Wrench,
    color: "text-cyan-400",
    bg: "bg-cyan-500/10",
    border: "border-cyan-500/30",
    accepts: ["pdf", "image", "zip", "doc"],
    status: "soon",
  },
  {
    id: "town-tv",
    name: "Town Square TV",
    shortName: "Town TV",
    icon: Film,
    color: "text-purple-400",
    bg: "bg-purple-500/10",
    border: "border-purple-500/30",
    accepts: ["video", "image"],
    status: "soon",
  },
  {
    id: "antivirus",
    name: "13 Moon Antivirus",
    shortName: "Antivirus",
    icon: Shield,
    color: "text-blue-400",
    bg: "bg-blue-500/10",
    border: "border-blue-500/30",
    accepts: ["zip", "doc"],
    status: "soon",
  },
  {
    id: "refusal",
    name: "13 Moon Refusal",
    shortName: "Refusal",
    icon: XCircle,
    color: "text-rose-400",
    bg: "bg-rose-500/10",
    border: "border-rose-500/30",
    accepts: ["image", "pdf", "doc"],
    status: "soon",
  },
  {
    id: "guardian",
    name: "Call Guardian",
    shortName: "Guardian",
    icon: Phone,
    color: "text-teal-400",
    bg: "bg-teal-500/10",
    border: "border-teal-500/30",
    accepts: ["doc", "pdf"],
    status: "soon",
  },
  {
    id: "ledger",
    name: "13 Moon Ledger",
    shortName: "Ledger",
    icon: Wallet,
    color: "text-emerald-400",
    bg: "bg-emerald-500/10",
    border: "border-emerald-500/30",
    accepts: ["pdf", "doc", "zip"],
    status: "soon",
  },
  {
    id: "editor",
    name: "13 Moon Film Editor",
    shortName: "Film Editor",
    icon: Scissors,
    color: "text-pink-400",
    bg: "bg-pink-500/10",
    border: "border-pink-500/30",
    accepts: ["video", "image"],
    status: "soon",
  },
  {
    id: "ezquill",
    name: "13 Moon EzQuill",
    shortName: "EzQuill",
    icon: PenLine,
    color: "text-violet-400",
    bg: "bg-violet-500/10",
    border: "border-violet-500/30",
    accepts: ["pdf", "doc"],
    status: "soon",
  },
];

const RECENT_DROPS: DroppedFile[] = [
  { id: "1", name: "project-brief.pdf",    size: 245000,  type: "pdf",   destination: "Forge Academy",         timestamp: "Today, 9:14am",  status: "sent" },
  { id: "2", name: "logo-assets.zip",      size: 4200000, type: "zip",   destination: "The Forge",             timestamp: "Today, 8:51am",  status: "sent" },
  { id: "3", name: "intro-video.mp4",      size: 82000000,type: "video", destination: "Town Square Press TV",  timestamp: "Yesterday",      status: "sent" },
];

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function fileIcon(type: string) {
  switch (type) {
    case "image": return <FileImage size={16} className="text-blue-400" />;
    case "video": return <FileVideo size={16} className="text-purple-400" />;
    case "zip":   return <FileArchive size={16} className="text-orange-400" />;
    case "pdf":   return <FileText size={16} className="text-red-400" />;
    default:      return <File size={16} className="text-zinc-400" />;
  }
}

function detectType(name: string): string {
  const ext = name.split(".").pop()?.toLowerCase() ?? "";
  if (["jpg","jpeg","png","gif","webp","svg"].includes(ext)) return "image";
  if (["mp4","mov","avi","webm","mkv"].includes(ext))         return "video";
  if (["zip","tar","gz","rar","7z"].includes(ext))            return "zip";
  if (["pdf"].includes(ext))                                   return "pdf";
  if (["doc","docx","txt","md","rtf"].includes(ext))          return "doc";
  return "file";
}

export default function ForgeDrop() {
  const [selectedApp, setSelectedApp] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [queuedFiles, setQueuedFiles] = useState<{ name: string; size: number; type: string }[]>([]);
  const [sent, setSent] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const selectedAppData = DROP_APPS.find(a => a.id === selectedApp);

  const handleFiles = (files: FileList | null) => {
    if (!files) return;
    const arr = Array.from(files).map(f => ({
      name: f.name,
      size: f.size,
      type: detectType(f.name),
    }));
    setQueuedFiles(prev => [...prev, ...arr]);
    setSent(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    handleFiles(e.dataTransfer.files);
  };

  const removeFile = (i: number) => {
    setQueuedFiles(prev => prev.filter((_, idx) => idx !== i));
  };

  const handleSend = () => {
    if (!selectedApp || queuedFiles.length === 0) return;
    setSent(true);
    setQueuedFiles([]);
    setTimeout(() => setSent(false), 3000);
  };

  const canSend = selectedApp && queuedFiles.length > 0;

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      <div className="max-w-6xl mx-auto px-4 py-10 sm:px-6">

        {/* Header */}
        <div className="mb-10">
          <div className="flex items-center gap-2 mb-2">
            <Upload size={16} className="text-orange-400" />
            <span className="text-xs font-bold text-orange-400 tracking-widest uppercase">Forge Drop</span>
          </div>
          <h1 className="text-3xl font-black text-white mb-2">Send Files Anywhere in the Ecosystem</h1>
          <p className="text-zinc-400 max-w-2xl">
            Upload a file — a zip, a photo, a video, a PDF, anything — and send it directly to any app in the Town Square.
            No email. No third-party storage. Stays in your ecosystem, on your server.
          </p>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">

          {/* Left — Drop Zone + Queue */}
          <div className="lg:col-span-2 space-y-5">

            {/* Drop Zone */}
            <div
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={cn(
                "relative rounded-2xl border-2 border-dashed p-10 text-center cursor-pointer transition-all duration-200",
                dragOver
                  ? "border-orange-500 bg-orange-500/10"
                  : "border-zinc-700 bg-zinc-900/40 hover:border-zinc-600 hover:bg-zinc-900/60"
              )}
            >
              <input
                ref={fileInputRef}
                type="file"
                multiple
                className="hidden"
                onChange={e => handleFiles(e.target.files)}
              />
              <div className="w-14 h-14 rounded-2xl bg-zinc-800 flex items-center justify-center mx-auto mb-4">
                <Upload size={24} className={dragOver ? "text-orange-400" : "text-zinc-500"} />
              </div>
              <p className="text-base font-bold text-zinc-200 mb-1">
                {dragOver ? "Drop it here" : "Drop files here or click to browse"}
              </p>
              <p className="text-sm text-zinc-500">
                ZIP, PDF, images, videos, documents — any file type accepted
              </p>
              <div className="mt-4 flex items-center justify-center gap-4 text-xs text-zinc-600">
                <span className="flex items-center gap-1.5"><FileArchive size={12} /> ZIP</span>
                <span className="flex items-center gap-1.5"><FileText size={12} /> PDF</span>
                <span className="flex items-center gap-1.5"><FileImage size={12} /> Images</span>
                <span className="flex items-center gap-1.5"><FileVideo size={12} /> Video</span>
                <span className="flex items-center gap-1.5"><File size={12} /> Docs</span>
              </div>
            </div>

            {/* File Queue */}
            {queuedFiles.length > 0 && (
              <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40">
                <div className="px-5 py-4 border-b border-zinc-800 flex items-center justify-between">
                  <p className="text-sm font-bold text-zinc-300">{queuedFiles.length} file{queuedFiles.length !== 1 ? "s" : ""} ready to send</p>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setQueuedFiles([])}
                    className="text-xs text-zinc-500 hover:text-zinc-300 h-7"
                  >
                    Clear all
                  </Button>
                </div>
                <div className="divide-y divide-zinc-800">
                  {queuedFiles.map((file, i) => (
                    <div key={i} className="flex items-center gap-3 px-5 py-3">
                      {fileIcon(file.type)}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-zinc-200 truncate">{file.name}</p>
                        <p className="text-xs text-zinc-500">{formatBytes(file.size)}</p>
                      </div>
                      <button
                        onClick={() => removeFile(i)}
                        className="text-zinc-600 hover:text-zinc-300 transition-colors"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Send Button */}
            {queuedFiles.length > 0 && (
              <div className="flex gap-3">
                <Button
                  onClick={handleSend}
                  disabled={!canSend}
                  className={cn(
                    "flex-1 font-bold gap-2 h-11",
                    canSend
                      ? "bg-orange-500 hover:bg-orange-400 text-white"
                      : "bg-zinc-800 text-zinc-500 cursor-not-allowed"
                  )}
                >
                  {!selectedApp
                    ? "Pick a destination first"
                    : `Send to ${selectedAppData?.shortName}`}
                  {canSend && <ArrowRight size={16} />}
                </Button>
              </div>
            )}

            {sent && (
              <div className="rounded-xl border border-green-500/30 bg-green-500/10 p-4 flex items-center gap-3">
                <CheckCircle2 size={18} className="text-green-400 shrink-0" />
                <div>
                  <p className="text-sm font-bold text-green-400">Files sent</p>
                  <p className="text-xs text-zinc-400">Your files are on their way to {selectedAppData?.name}.</p>
                </div>
              </div>
            )}

            {/* Recent Drops */}
            <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40">
              <div className="px-5 py-4 border-b border-zinc-800 flex items-center gap-2">
                <Clock size={14} className="text-zinc-500" />
                <p className="text-sm font-bold text-zinc-300">Recent Drops</p>
              </div>
              <div className="divide-y divide-zinc-800">
                {RECENT_DROPS.map(drop => (
                  <div key={drop.id} className="flex items-center gap-3 px-5 py-3">
                    {fileIcon(drop.type)}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-zinc-200 truncate">{drop.name}</p>
                      <p className="text-xs text-zinc-500">{formatBytes(drop.size)} · {drop.timestamp}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-xs text-zinc-400">{drop.destination}</p>
                      <Badge className="bg-green-500/15 text-green-400 border-green-500/30 text-[10px] h-4 border mt-1">Sent</Badge>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right — Destination Picker */}
          <div>
            <div className="sticky top-6">
              <h2 className="text-sm font-bold text-zinc-400 uppercase tracking-widest mb-4">Send To</h2>
              <div className="space-y-2">
                {DROP_APPS.map((app) => {
                  const Icon = app.icon;
                  const isSelected = selectedApp === app.id;
                  const isDisabled = app.status === "soon";
                  return (
                    <button
                      key={app.id}
                      onClick={() => !isDisabled && setSelectedApp(isSelected ? null : app.id)}
                      disabled={isDisabled}
                      className={cn(
                        "w-full text-left rounded-xl border p-3 transition-all duration-150",
                        isSelected
                          ? cn("border", app.border, app.bg)
                          : isDisabled
                          ? "border-zinc-800 bg-zinc-900/20 opacity-40 cursor-not-allowed"
                          : "border-zinc-800 bg-zinc-900/40 hover:border-zinc-600"
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <div className={cn(
                          "w-8 h-8 rounded-lg flex items-center justify-center shrink-0",
                          isSelected ? app.bg : "bg-zinc-800"
                        )}>
                          <Icon size={15} className={isSelected ? app.color : "text-zinc-500"} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className={cn("text-xs font-semibold truncate", isSelected ? "text-white" : "text-zinc-300")}>
                            {app.shortName}
                          </p>
                          {isDisabled && (
                            <p className="text-[10px] text-zinc-600">Coming soon</p>
                          )}
                        </div>
                        {isSelected && <CheckCircle2 size={14} className={app.color} />}
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Storage note */}
              <div className="mt-5 rounded-xl border border-zinc-800 bg-zinc-900/40 p-4">
                <div className="flex items-center gap-2 mb-2">
                  <HardDrive size={13} className="text-zinc-500" />
                  <p className="text-xs font-bold text-zinc-400">Stored on your server</p>
                </div>
                <p className="text-[11px] text-zinc-600 leading-relaxed">
                  All files route through your MinIO storage on forge-server-1.
                  Nothing goes to a third-party platform. Your files stay yours.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
