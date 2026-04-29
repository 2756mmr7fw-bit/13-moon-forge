import { useState, useEffect } from "react";
import { Flame, X, ArrowRight, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";

const TOUR_KEY = "forge:welcomed:v2";

const SLIDES = [
  {
    emoji: "🔥",
    title: "Welcome to 13 Moon Forge",
    subtitle: "For the small man. Not for the big corporation.",
    body: "You've got access to 6 AI specialists — each one a different Moon, each one built for a different job. They work together to take you from a rough idea to a deployed product.",
    cta: null,
  },
  {
    emoji: "🌑",
    title: "The 6 Moon Personas",
    subtitle: "Each Moon is a different expert.",
    body: null,
    moons: [
      { name: "Forge", color: "#e8611a", desc: "Builds your app — generates real working code." },
      { name: "Flint", color: "#f59e0b", desc: "Brainstorms with you — sparks ideas, tests angles." },
      { name: "Hawk", color: "#38bdf8", desc: "Finds anything — parts, tools, prices, suppliers." },
      { name: "Sage", color: "#a78bfa", desc: "Teaches you anything — explains it until it clicks." },
    ],
    cta: null,
  },
  {
    emoji: "📂",
    title: "Your Workspace",
    subtitle: "Your failsafe safe.",
    body: "The Workspace holds everything Forge creates for you — folders, plans, blueprints, documents. You can also upload PDFs and let Forge read them. Forward emails here and attachments land automatically. We never delete your work without you.",
    cta: { label: "Open Workspace", href: "/workspace" },
  },
  {
    emoji: "💡",
    title: "Start with Brainstorm",
    subtitle: "Don't know where to begin? Start here.",
    body: "Tell Flint your rough idea — even half-formed is fine. He'll stress-test it, help you name it, and find the angle worth building. When the idea is solid, Build With Me turns it into a step-by-step Moon plan.",
    cta: { label: "Go to Brainstorm", href: "/brainstorm" },
  },
  {
    emoji: "❓",
    title: "Sage Knows This App",
    subtitle: "Ask anything, anytime.",
    body: 'On every page you\'ll find a "How it works" button. And on the Sage page, you can ask "How do I use App Hub?" or "What\'s the difference between Starters and Build With Me?" and Sage will walk you through it.',
    cta: { label: "Ask Sage", href: "/sage" },
  },
];

export function WelcomeTour() {
  const [visible, setVisible] = useState(false);
  const [slide, setSlide] = useState(0);
  const [, navigate] = useLocation();

  useEffect(() => {
    const done = localStorage.getItem(TOUR_KEY);
    if (!done) {
      const timer = setTimeout(() => setVisible(true), 1200);
      return () => clearTimeout(timer);
    }
  }, []);

  function dismiss() {
    localStorage.setItem(TOUR_KEY, "1");
    setVisible(false);
  }

  function finish(href?: string) {
    dismiss();
    if (href) navigate(href);
  }

  if (!visible) return null;

  const current = SLIDES[slide];
  const isLast = slide === SLIDES.length - 1;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={dismiss} />
      <div className="relative z-10 w-full max-w-md bg-card border border-border rounded-2xl shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between px-5 pt-5 pb-0">
          <div className="flex items-center gap-2">
            <Flame size={16} className="text-primary" />
            <span className="text-xs font-bold uppercase tracking-widest text-primary">13 Moon Forge</span>
          </div>
          <button onClick={dismiss} className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground">
            <X size={14} />
          </button>
        </div>

        <div className="p-6">
          <div className="text-5xl mb-4 text-center">{current.emoji}</div>
          <h2 className="font-bold text-xl text-center mb-1">{current.title}</h2>
          <p className="text-sm text-primary text-center mb-5">{current.subtitle}</p>

          {current.body && (
            <p className="text-sm text-muted-foreground leading-relaxed text-center">{current.body}</p>
          )}

          {current.moons && (
            <div className="space-y-2.5">
              {current.moons.map(m => (
                <div key={m.name} className="flex items-start gap-3 px-3 py-2.5 rounded-xl bg-muted/50 border border-border">
                  <div className="w-2.5 h-2.5 rounded-full mt-1.5 shrink-0" style={{ backgroundColor: m.color }} />
                  <div>
                    <span className="text-sm font-bold">{m.name}</span>
                    <span className="text-xs text-muted-foreground ml-2">{m.desc}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="px-6 pb-6">
          <div className="flex items-center gap-3">
            {slide > 0 && (
              <button
                onClick={() => setSlide(s => s - 1)}
                className="p-2 rounded-lg hover:bg-muted text-muted-foreground"
              >
                <ArrowLeft size={16} />
              </button>
            )}

            <div className="flex-1 flex justify-center gap-1.5">
              {SLIDES.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setSlide(i)}
                  className={`w-1.5 h-1.5 rounded-full transition-all ${i === slide ? "bg-primary w-4" : "bg-muted-foreground/30"}`}
                />
              ))}
            </div>

            {isLast ? (
              <Button
                className="bg-primary text-white gap-1.5"
                size="sm"
                onClick={() => finish(current.cta?.href)}
              >
                {current.cta?.label ?? "Let's go"} <ArrowRight size={13} />
              </Button>
            ) : (
              <Button
                className="bg-primary text-white gap-1.5"
                size="sm"
                onClick={() => current.cta ? finish(current.cta.href) : setSlide(s => s + 1)}
              >
                {current.cta ? current.cta.label : "Next"} <ArrowRight size={13} />
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
