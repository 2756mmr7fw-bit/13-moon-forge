import {
  Shield, Heart, FileDown, Lock, MessageSquare, TrendingUp, Equal,
  ArrowRight, Flame, Check,
} from "lucide-react";
import { Button } from "@/components/ui/button";

const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

const PROMISES = [
  {
    icon: Heart,
    color: "#ef4444",
    title: "The free tier is real.",
    body: "Not a demo. Not a 7-day trial. Not a crippled version to frustrate you into paying. The free tier exists because some people need to see it work before they can trust it — and that's fair. You can use Forge for free, save what you build, and leave anytime with everything you made.",
  },
  {
    icon: FileDown,
    color: "#f59e0b",
    title: "Your work belongs to you. Always.",
    body: "Every word, every plan, every piece of code you create in Forge is yours. Download it, copy it, take it to any other platform. We will never hold your own work ransom. The moment you make something, it's already yours.",
  },
  {
    icon: Lock,
    color: "#22c55e",
    title: "No lock-in. Ever.",
    body: "Cancel your subscription and your data doesn't disappear. We don't punish you for leaving. You walk out the same way you walked in — with everything you built. There are no 'export fees' or 'account holds' here.",
  },
  {
    icon: MessageSquare,
    color: "#3b82f6",
    title: "Plain language. Always.",
    body: "No fine print designed to confuse. No terms that mean something different than what they say. If something about Forge changes — pricing, features, data handling — we'll tell you in plain English, before it happens.",
  },
  {
    icon: TrendingUp,
    color: "#8b5cf6",
    title: "We tell you the truth, even when it hurts.",
    body: "If your idea has a problem, the Moons will tell you. If the code won't work, Forge says so. If the contract is bad for you, Creed flags it. Real help means honest help. We're not here to make you feel good — we're here to make you successful.",
  },
  {
    icon: Shield,
    color: "#f97316",
    title: "The price will never quietly change.",
    body: "If anything costs more, you'll know before it does. No surprise charges. No 'starting at' prices that turn into something else after you sign up. What we say it costs is what it costs.",
  },
  {
    icon: Equal,
    color: "#ec4899",
    title: "The same tools for everyone.",
    body: "A $7/month subscriber gets the same AI that costs lawyers $400/hour. The same tools a marketing agency charges $5,000/month to use. The same research capability a firm hires analysts to perform. What you pay determines how many messages you get — not how good the AI is. Everyone gets the real thing.",
  },
];

export default function Promise() {
  return (
    <div className="max-w-3xl mx-auto animate-in fade-in duration-300 space-y-12 pb-16">

      {/* Header */}
      <div className="text-center space-y-5 pt-4">
        <div className="flex items-center justify-center">
          <div className="w-14 h-14 rounded-full bg-primary/15 flex items-center justify-center">
            <Flame size={24} className="text-primary" />
          </div>
        </div>

        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-primary/30 bg-primary/10 text-primary text-xs font-semibold">
          By Sovereign Digital LLC
        </div>

        <h1 className="text-4xl sm:text-5xl font-black tracking-tight leading-tight">
          The Sovereign Promise.
        </h1>

        <p className="text-lg text-muted-foreground max-w-xl mx-auto leading-relaxed">
          My father told me you can tell a big man by how he treats a little man.
          <br /><br />
          This is what that means for everyone who uses Forge.
        </p>

        <blockquote className="border-l-2 border-primary pl-5 text-left max-w-lg mx-auto">
          <p className="text-base leading-relaxed italic text-foreground/80">
            "I want a world where the working class wins. Not by taking from anyone — but by giving power to those who never had it."
          </p>
          <footer className="text-xs text-muted-foreground mt-2">— Ezekiel Evans, Founder, Sovereign Digital LLC</footer>
        </blockquote>
      </div>

      {/* Promises */}
      <div className="space-y-4">
        {PROMISES.map((p, i) => {
          const Icon = p.icon;
          return (
            <div
              key={p.title}
              className="flex gap-5 p-6 rounded-2xl border border-border bg-card hover:border-border/80 transition-colors"
              style={{ animationDelay: `${i * 60}ms` }}
            >
              <div
                className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0 mt-0.5"
                style={{ background: `${p.color}18` }}
              >
                <Icon size={20} style={{ color: p.color }} />
              </div>
              <div className="space-y-1.5">
                <div className="flex items-center gap-2">
                  <Check size={13} style={{ color: p.color }} />
                  <h3 className="font-bold text-base leading-snug">{p.title}</h3>
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed">{p.body}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Bottom CTA */}
      <div className="border border-white/8 rounded-2xl py-12 px-8 text-center space-y-6 bg-white/2">
        <h2 className="text-2xl font-black tracking-tight">
          Built by the people.<br />For the people.
        </h2>
        <p className="text-muted-foreground text-sm leading-relaxed max-w-md mx-auto">
          The People's Town Square is an ecosystem of products and communities built for working people. Forge is the AI workshop. Everything starts free. Everything you build is yours.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Button size="lg" className="gap-2" asChild>
            <a href={`${basePath}/sign-up`}>Start free — no card needed <ArrowRight size={14} /></a>
          </Button>
          <Button size="lg" variant="outline" asChild>
            <a href="https://thepeoplestownsq.com" target="_blank" rel="noopener noreferrer">
              Visit The People's Town Square
            </a>
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">
          Free to start · Your work is always yours · No lock-in · Cancel anytime
        </p>
      </div>
    </div>
  );
}
