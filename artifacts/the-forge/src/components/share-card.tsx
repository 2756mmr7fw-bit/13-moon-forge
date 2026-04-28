import { useState, useRef } from "react";
import { Share2, X, Copy, Check, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";

const MOON_STYLES: Record<string, { label: string; color: string; emoji: string }> = {
  forge:      { label: "Forge",      color: "#f97316", emoji: "⚒️" },
  hawk:       { label: "Hawk",       color: "#eab308", emoji: "🦅" },
  sage:       { label: "Sage",       color: "#22c55e", emoji: "📖" },
  flint:      { label: "Flint",      color: "#3b82f6", emoji: "🔧" },
  quill:      { label: "Quill",      color: "#a855f7", emoji: "✍️" },
  creed:      { label: "Creed",      color: "#ef4444", emoji: "⚔️" },
  brainstorm: { label: "Brainstorm", color: "#f59e0b", emoji: "💡" },
  legal:      { label: "Legal",      color: "#8b5cf6", emoji: "⚖️" },
  launch:     { label: "Launch",     color: "#3b82f6", emoji: "🚀" },
};

interface ShareCardProps {
  moonId: string;
  title: string;
  content: string;
  shareId?: string;
}

function CardPreview({ moonId, title, content }: Omit<ShareCardProps, "shareId">) {
  const style = MOON_STYLES[moonId] ?? { label: moonId, color: "#888", emoji: "🌑" };

  return (
    <div
      className="w-full rounded-2xl overflow-hidden select-none"
      style={{ background: `linear-gradient(135deg, #0a0a0a 0%, #111 60%, ${style.color}18 100%)`, border: `1px solid ${style.color}33` }}
    >
      {/* Top bar */}
      <div className="flex items-center justify-between px-5 py-3 border-b" style={{ borderColor: `${style.color}22` }}>
        <div className="flex items-center gap-2">
          <span className="text-lg">{style.emoji}</span>
          <span className="text-xs font-black tracking-widest uppercase" style={{ color: style.color }}>{style.label}</span>
        </div>
        <span className="text-[10px] text-muted-foreground font-medium tracking-wider">13moonforge.ai</span>
      </div>

      {/* Content */}
      <div className="px-6 py-5 space-y-3">
        <h2 className="text-base font-black leading-snug text-white line-clamp-2">{title}</h2>
        <p className="text-[13px] text-white/60 leading-relaxed line-clamp-5">{content}</p>
      </div>

      {/* Bottom accent */}
      <div className="px-5 pb-4 flex items-center justify-between">
        <div className="flex gap-1">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="w-1.5 h-1.5 rounded-full" style={{ background: style.color, opacity: 1 - i * 0.3 }} />
          ))}
        </div>
        <span className="text-[10px] font-bold tracking-wider" style={{ color: `${style.color}99` }}>
          Built with {style.label}
        </span>
      </div>
    </div>
  );
}

export function ShareCard({ moonId, title, content, shareId }: ShareCardProps) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const shareUrl = shareId ? `${window.location.origin}/share/${shareId}` : null;

  function copyLink() {
    if (!shareUrl) return;
    navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function copyText() {
    navigator.clipboard.writeText(`${title}\n\n${content}\n\n— Built with ${MOON_STYLES[moonId]?.label ?? moonId} on 13moonforge.ai`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <>
      <Button
        variant="ghost"
        size="sm"
        className="gap-1.5 text-xs text-muted-foreground hover:text-foreground"
        onClick={() => setOpen(true)}
      >
        <Share2 size={13} />
        Share
      </Button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm" onClick={() => setOpen(false)}>
          <div
            className="relative w-full max-w-md space-y-4 rounded-2xl border border-border bg-background p-6 shadow-2xl"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-1">
              <h3 className="font-black text-sm">Share this output</h3>
              <button onClick={() => setOpen(false)} className="text-muted-foreground hover:text-foreground">
                <X size={16} />
              </button>
            </div>

            <CardPreview moonId={moonId} title={title} content={content} />

            <div className="flex flex-col gap-2 pt-1">
              {shareUrl ? (
                <>
                  <div className="flex items-center gap-2 rounded-lg border border-border bg-muted/30 px-3 py-2 text-xs text-muted-foreground font-mono truncate">
                    <span className="truncate flex-1">{shareUrl}</span>
                  </div>
                  <div className="flex gap-2">
                    <Button className="flex-1 gap-2 text-xs" onClick={copyLink}>
                      {copied ? <Check size={13} /> : <Copy size={13} />}
                      {copied ? "Copied!" : "Copy link"}
                    </Button>
                    <a href={shareUrl} target="_blank" rel="noopener noreferrer">
                      <Button variant="outline" size="sm" className="gap-1.5 text-xs">
                        <ExternalLink size={12} />
                        Open
                      </Button>
                    </a>
                  </div>
                </>
              ) : (
                <Button className="gap-2 text-xs" onClick={copyText}>
                  {copied ? <Check size={13} /> : <Copy size={13} />}
                  {copied ? "Copied!" : "Copy as text"}
                </Button>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
