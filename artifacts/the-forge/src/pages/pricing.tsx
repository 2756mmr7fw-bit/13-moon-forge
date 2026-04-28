import { Flame, Zap, Rocket, Check, RotateCcw, ExternalLink, MonitorPlay, Monitor, Swords, Sparkles, Code2, GraduationCap, Scale, ArrowRight, Server, GitBranch, Package, KeyRound, ArrowRightLeft, Shield, Heart, Lock, Equal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Link } from "wouter";

const TOWN_SQUARE_BASE = "https://thepeoplestownsq.com";

const tiers = [
  {
    id: "free",
    name: "Free",
    tagline: "Always free — no strings",
    price: 0,
    period: "forever",
    icon: Zap,
    color: "border-border",
    iconBg: "bg-muted",
    iconColor: "text-muted-foreground",
    highlight: false,
    cta: "Start free — no card needed",
    ctaVariant: "outline" as const,
    messages: "30 messages / month",
    description: "Jump in, use the tools, save what you build, and take it with you whenever you want. No credit card. No commitment. Come back anytime.",
    features: [
      "30 AI messages per month",
      "Screen Coach (1 session)",
      "Computer Advisor",
      "Ask Hawk",
      "Your work is always yours to export",
      "Resets every month",
    ],
    note: null,
  },
  {
    id: "basic",
    name: "Forge Basic",
    tagline: "Personal tech assistant",
    price: 7,
    period: "/ month",
    icon: Flame,
    color: "border-primary/60",
    iconBg: "bg-primary/20",
    iconColor: "text-primary",
    highlight: false,
    cta: "Get Basic",
    ctaVariant: "outline" as const,
    messages: "150 messages / month",
    description: "Everything you need to replace Geek Squad for good. One person, unlimited tool access.",
    features: [
      "150 AI messages per month",
      "Screen Coach — screen share + voice",
      "Computer Advisor + PC comparison",
      "Game Studio + AI code help",
      "Ask Hawk, Learn with Sage",
      "Legal Decoder, Code Forge",
      "Brainstorm + Project Builder",
      "Resets every month",
    ],
    note: null,
  },
  {
    id: "pro",
    name: "Forge Pro",
    tagline: "Power users & families",
    price: 17,
    period: "/ month",
    icon: Rocket,
    color: "border-primary shadow-[0_0_50px_rgba(232,97,26,0.15)]",
    iconBg: "bg-primary/20",
    iconColor: "text-primary",
    highlight: true,
    cta: "Get Pro",
    ctaVariant: "default" as const,
    messages: "500 messages / month",
    description: "Heavy users, families, and anyone who uses Forge as their daily driver. Never hits the wall.",
    features: [
      "500 AI messages per month",
      "Everything in Basic",
      "Priority access to new tools",
      "Early access to beta features",
      "Rollover unused messages (up to 200)",
      "Resets every month",
    ],
    note: "Most popular",
  },
];

const tools = [
  { icon: MonitorPlay, label: "Screen Coach",       color: "text-orange-400" },
  { icon: Monitor,     label: "Computer Advisor",   color: "text-blue-400"   },
  { icon: Swords,      label: "Game Studio",        color: "text-purple-400" },
  { icon: Sparkles,    label: "Brainstorm",         color: "text-violet-400" },
  { icon: Code2,       label: "Code Forge",         color: "text-sky-400"    },
  { icon: GraduationCap, label: "Learn with Sage",  color: "text-green-400"  },
  { icon: Scale,       label: "Legal Decoder",      color: "text-amber-400"  },
  { icon: Zap,         label: "Ask Hawk",           color: "text-cyan-400"   },
];

const competitors = [
  { name: "Geek Squad (1 visit)",  price: "$100–200",  note: "one problem, one visit, no follow-up"        },
  { name: "ChatGPT Plus",          price: "$20/mo",    note: "1 general AI, no screen watching"            },
  { name: "Sintra AI",             price: "$97/mo",    note: "12 assistants, 250 credits"                  },
  { name: "Forge Host",            price: "$5/mo",     note: "self-hosting tools, no AI messages needed", highlight: true },
  { name: "Forge Basic",           price: "$7/mo",     note: "all 8 AI tools, 150 messages/mo",         highlight: true },
  { name: "Forge Pro",             price: "$17/mo",    note: "all 8 AI tools, 500 messages/mo",         highlight: true },
];

const refillPacks = [
  { messages: 50,  price: "2.99" },
  { messages: 150, price: "5.99" },
  { messages: 500, price: "12.99" },
];

export default function Pricing() {
  return (
    <div className="max-w-4xl mx-auto animate-in fade-in duration-300 space-y-16">

      {/* Header */}
      <div className="text-center space-y-4">
        <p className="text-xs uppercase tracking-widest text-primary font-semibold">13 Moon Forge · Pricing</p>
        <h1 className="text-4xl sm:text-5xl font-black tracking-tight">
          Replace Geek Squad.<br className="hidden sm:block" />
          <span className="text-primary">For $7 a month.</span>
        </h1>
        <p className="text-muted-foreground text-lg max-w-xl mx-auto leading-relaxed">
          Forge watches your screen, fixes your computer, builds your apps, and teaches you anything — right in your browser. No house calls. No hourly rates. No confusion.
        </p>
      </div>

      {/* Why these prices */}
      <div className="rounded-2xl border border-white/10 bg-white/2 p-8 space-y-5">
        <div className="text-center space-y-2">
          <p className="text-xs uppercase tracking-widest text-primary font-semibold">Why these prices</p>
          <h2 className="text-2xl font-bold tracking-tight">Honest. That's the whole reason.</h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-center">
          {[
            {
              label: "Geek Squad visit",
              price: "$100–200",
              note: "One problem. One visit. No follow-up.",
              ours: false,
            },
            {
              label: "ChatGPT Plus",
              price: "$20/mo",
              note: "One general AI. No specialists.",
              ours: false,
            },
            {
              label: "Forge Basic",
              price: "$7/mo",
              note: "Six specialists. Legal, code, research, teaching, and more.",
              ours: true,
            },
          ].map(c => (
            <div key={c.label} className={cn(
              "rounded-xl p-4 space-y-1 border",
              c.ours ? "border-primary/40 bg-primary/8" : "border-white/6 bg-white/2 opacity-70",
            )}>
              <p className="text-xs text-muted-foreground">{c.label}</p>
              <p className={cn("text-2xl font-black", c.ours ? "text-primary" : "text-foreground")}>{c.price}</p>
              <p className="text-[11px] text-muted-foreground leading-relaxed">{c.note}</p>
              {c.ours && <span className="inline-block text-[10px] font-bold px-2 py-0.5 rounded-full bg-primary/20 text-primary uppercase tracking-wide">That's us</span>}
            </div>
          ))}
        </div>
        <p className="text-center text-sm text-muted-foreground max-w-xl mx-auto leading-relaxed">
          We charge $7 because that's what's fair — not because that's all you're worth. The working person deserves the same AI tools that cost professionals hundreds of dollars an hour. Now they have them.
        </p>
        <div className="text-center">
          <Link href="/promise" className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline font-medium">
            Read the full Sovereign Promise <ArrowRight size={13} />
          </Link>
        </div>
      </div>

      {/* Pricing cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5 items-start">
        {tiers.map((tier) => {
          const Icon = tier.icon;
          return (
            <div
              key={tier.id}
              className={cn(
                "relative rounded-2xl border-2 bg-card p-6 flex flex-col",
                tier.color,
              )}
            >
              {tier.note && (
                <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
                  <span className="bg-primary text-white text-[11px] font-bold px-3 py-1 rounded-full uppercase tracking-wider whitespace-nowrap">
                    {tier.note}
                  </span>
                </div>
              )}

              <div className="flex items-center gap-3 mb-4">
                <div className={cn("p-2.5 rounded-xl shrink-0", tier.iconBg)}>
                  <Icon size={18} className={tier.iconColor} />
                </div>
                <div>
                  <h3 className="font-black text-base leading-none">{tier.name}</h3>
                  <p className="text-[11px] text-muted-foreground mt-0.5">{tier.tagline}</p>
                </div>
              </div>

              <div className="mb-4">
                <div className="flex items-end gap-1">
                  <span className="text-4xl font-black">${tier.price}</span>
                  <span className="text-sm text-muted-foreground mb-1.5">{tier.period}</span>
                </div>
                <p className="text-xs text-primary font-semibold mt-1">{tier.messages}</p>
              </div>

              <p className="text-sm text-muted-foreground leading-relaxed mb-5">{tier.description}</p>

              <ul className="space-y-2.5 mb-6 flex-1">
                {tier.features.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-sm">
                    <Check size={14} className="text-primary mt-0.5 shrink-0" />
                    <span>{f}</span>
                  </li>
                ))}
              </ul>

              <Button
                className="w-full gap-2"
                variant={tier.ctaVariant}
                size="lg"
                onClick={() =>
                  tier.id === "free"
                    ? window.location.href = "/sign-up"
                    : window.open(`${TOWN_SQUARE_BASE}/checkout/${tier.id}?ref=forge`, "_blank")
                }
              >
                {tier.cta}
                <ArrowRight size={14} />
              </Button>

              {tier.id !== "free" && (
                <p className="text-center text-[11px] text-muted-foreground mt-2">
                  Billed monthly · Cancel anytime
                </p>
              )}
            </div>
          );
        })}
      </div>

      {/* Hosting-only plan */}
      <div className="rounded-2xl border-2 border-emerald-500/40 bg-emerald-950/20 p-6 md:p-8">
        <div className="flex flex-col md:flex-row md:items-center gap-6">

          {/* Left: info */}
          <div className="flex-1 space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-emerald-500/20 shrink-0">
                <Server size={18} className="text-emerald-400" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-black text-lg leading-none">Forge Host</h3>
                  <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 uppercase tracking-wider">
                    No AI needed
                  </span>
                </div>
                <p className="text-sm text-muted-foreground mt-0.5">Just want to self-host your apps? This is your plan.</p>
              </div>
            </div>

            <p className="text-sm text-muted-foreground leading-relaxed">
              Full access to the Sovereign Stack tools — deploy apps, manage your registry, connect to your own server, and store secrets — without paying for AI credits you won't use.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {[
                { icon: ArrowRightLeft, label: "Migration Wizard — leave Replit/Heroku" },
                { icon: Package,        label: "App Hub — deploy to your own server"    },
                { icon: GitBranch,      label: "GitHub & Registry integration"          },
                { icon: KeyRound,       label: "Secrets Vault — encrypted key storage"  },
                { icon: Server,         label: "Sovereign Stack full guide"             },
                { icon: Monitor,        label: "App Health Monitor"                     },
              ].map(({ icon: Icon, label }) => (
                <div key={label} className="flex items-center gap-2 text-sm">
                  <Icon size={13} className="text-emerald-400 shrink-0" />
                  <span className="text-muted-foreground">{label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Right: price + CTA */}
          <div className="flex flex-col items-center gap-4 md:min-w-[180px] text-center">
            <div>
              <div className="flex items-end justify-center gap-1">
                <span className="text-5xl font-black text-emerald-400">$5</span>
                <span className="text-sm text-muted-foreground mb-2">/ month</span>
              </div>
              <p className="text-xs text-emerald-400 font-semibold">No AI messages included</p>
            </div>
            <Button
              className="w-full gap-2 border-emerald-500/50 text-emerald-400 hover:bg-emerald-500/10"
              variant="outline"
              onClick={() => window.open(`${TOWN_SQUARE_BASE}/checkout/host?ref=forge`, "_blank")}
            >
              Get Forge Host <ArrowRight size={14} />
            </Button>
            <p className="text-[11px] text-muted-foreground">Billed monthly · Cancel anytime</p>
          </div>

        </div>
      </div>

      {/* Everything included */}
      <div className="space-y-5">
        <div className="text-center">
          <h2 className="text-xl font-bold">Every paid plan includes all 8 tools</h2>
          <p className="text-sm text-muted-foreground mt-1">No tools locked behind higher tiers. Just more messages.</p>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {tools.map(({ icon: Icon, label, color }) => (
            <div key={label} className="flex items-center gap-2.5 p-3 rounded-xl border border-border bg-card">
              <Icon size={16} className={color} />
              <span className="text-sm font-medium">{label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Refill packs */}
      <div className="space-y-4">
        <div>
          <h2 className="text-xl font-bold">Need more messages?</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Hit your limit before the month resets? Top up anytime. Refill messages <strong className="text-foreground">never expire</strong> and stack on top of your plan.
          </p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {refillPacks.map((pack) => (
            <div key={pack.messages} className="rounded-xl border border-border bg-card p-4 flex items-center justify-between">
              <div>
                <p className="font-bold text-lg">{pack.messages} messages</p>
                <p className="text-xs text-muted-foreground">never expires · stacks on your plan</p>
              </div>
              <div className="text-right">
                <p className="text-2xl font-black">${pack.price}</p>
                <Button
                  size="sm"
                  variant="outline"
                  className="mt-1.5 text-xs h-7"
                  onClick={() => window.open(`${TOWN_SQUARE_BASE}/refills?ref=forge`, "_blank")}
                >
                  Buy
                </Button>
              </div>
            </div>
          ))}
        </div>
        <p className="text-xs text-muted-foreground flex items-center gap-1.5">
          <RotateCcw size={11} />
          Plan messages reset on the 1st of every month. Refill packs do not reset.
        </p>
      </div>

      {/* Competitor table */}
      <div className="space-y-4">
        <h2 className="text-xl font-bold">How we stack up</h2>
        <div className="rounded-xl border border-border overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/40">
                <th className="text-left px-5 py-3 font-semibold text-muted-foreground">Product</th>
                <th className="text-right px-5 py-3 font-semibold text-muted-foreground">Price</th>
                <th className="text-left px-5 py-3 font-semibold text-muted-foreground hidden sm:table-cell">What you get</th>
              </tr>
            </thead>
            <tbody>
              {competitors.map((c, i) => (
                <tr
                  key={c.name}
                  className={cn(
                    "border-b border-border last:border-0",
                    c.highlight
                      ? "bg-primary/8 font-semibold"
                      : i % 2 === 0 ? "bg-card" : "bg-muted/20"
                  )}
                >
                  <td className="px-5 py-3">
                    <span className={cn(c.highlight && "text-primary font-bold")}>{c.name}</span>
                  </td>
                  <td className="px-5 py-3 text-right font-mono font-bold whitespace-nowrap">
                    <span className={cn(c.highlight ? "text-primary" : "text-foreground")}>{c.price}</span>
                  </td>
                  <td className={cn("px-5 py-3 text-muted-foreground hidden sm:table-cell", c.highlight && "text-foreground")}>
                    {c.note}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-xs text-muted-foreground">No data harvesting. No reading your files. Built for the people, by Sovereign Digital LLC.</p>
      </div>

      {/* Town Square note */}
      <div className="rounded-xl border border-dashed border-border bg-card/30 p-6 flex flex-col sm:flex-row sm:items-center gap-5">
        <div className="flex-1">
          <h3 className="font-bold mb-1">Part of a bigger family</h3>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Forge is one app in the Sovereign Digital ecosystem. Visit The People's Town Square to manage all your subscriptions, access the other 12 Moons, and get the Full Team Bundle for everything at once.
          </p>
        </div>
        <Button
          variant="outline"
          className="gap-2 shrink-0"
          onClick={() => window.open(TOWN_SQUARE_BASE, "_blank")}
        >
          Visit Town Square <ExternalLink size={13} />
        </Button>
      </div>

      {/* Our Promise */}
      <div className="rounded-2xl border-2 border-primary/20 bg-primary/4 p-8 space-y-6">
        <div className="text-center">
          <p className="text-xs uppercase tracking-widest text-primary font-bold mb-2">Our Promise to You</p>
          <h2 className="text-2xl font-black">We don't hold your things for ransom.</h2>
          <p className="text-muted-foreground text-sm mt-2 max-w-lg mx-auto leading-relaxed">
            Everything you build, write, and save here belongs to you. Always. We mean that.
          </p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            {
              title: "Free to save",
              body: "Create a free account and your work is saved. Plans, documents, blueprints, code — stored and ready whenever you come back.",
            },
            {
              title: "Your failsafe safe",
              body: "We hold onto everything in case you lose it locally. Crashed laptop, deleted file, accidental close — we've got it. It's yours until you decide to delete it.",
            },
            {
              title: "Free to take",
              body: "Download everything as a ZIP anytime. Clean markdown files, organized by your folders. Nothing locked, nothing held back.",
            },
            {
              title: "Free to leave",
              body: "If you're done with us, we hold the door open. Take your files, cancel with one click, and know you're always welcome back.",
            },
          ].map(({ title, body }) => (
            <div key={title} className="rounded-xl border border-primary/15 bg-card p-5 space-y-2">
              <p className="font-bold text-sm text-primary">{title}</p>
              <p className="text-xs text-muted-foreground leading-relaxed">{body}</p>
            </div>
          ))}
        </div>
        <p className="text-center text-xs text-muted-foreground">
          No dark patterns. No data harvesting. We never delete your work without your say-so. Built by people, for people.
        </p>
      </div>

      {/* Bottom CTA */}
      <div className="text-center space-y-4 pb-4">
        <h3 className="text-2xl font-black">Ready to get started?</h3>
        <p className="text-muted-foreground">Free account, no card, your work yours forever. Upgrade if you ever need more — downgrade or leave anytime.</p>
        <Link href="/sign-up">
          <Button size="lg" className="gap-2 px-10">
            Start for free <ArrowRight size={15} />
          </Button>
        </Link>
        <p className="text-xs text-muted-foreground">Come back whenever you need us. The door's always open.</p>
      </div>

    </div>
  );
}
