import { Flame, Zap, Rocket, Check, RotateCcw, ExternalLink, MonitorPlay, Monitor, Swords, Sparkles, Code2, GraduationCap, Scale, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Link } from "wouter";

const TOWN_SQUARE_BASE = "https://thepeoplestownsq.com";

const tiers = [
  {
    id: "free",
    name: "Free",
    tagline: "Try it out",
    price: 0,
    period: "forever",
    icon: Zap,
    color: "border-border",
    iconBg: "bg-muted",
    iconColor: "text-muted-foreground",
    highlight: false,
    cta: "Start for free",
    ctaVariant: "outline" as const,
    messages: "10 messages / month",
    description: "Enough to run one real Screen Coach session and see what Forge can do. No credit card, no commitment.",
    features: [
      "10 AI messages per month",
      "Screen Coach (1 session)",
      "Computer Advisor",
      "Ask Hawk",
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
  { name: "Geek Squad (1 visit)",  price: "$100–200",  note: "one problem, one visit, no follow-up" },
  { name: "ChatGPT Plus",          price: "$20/mo",    note: "1 general AI, no screen watching"     },
  { name: "Sintra AI",             price: "$97/mo",    note: "12 assistants, 250 credits"           },
  { name: "Forge Basic",           price: "$7/mo",     note: "all 8 tools, 150 messages/mo",   highlight: true },
  { name: "Forge Pro",             price: "$17/mo",    note: "all 8 tools, 500 messages/mo",   highlight: true },
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

      {/* Bottom CTA */}
      <div className="text-center space-y-4 pb-4">
        <h3 className="text-2xl font-black">Ready to ditch Geek Squad?</h3>
        <p className="text-muted-foreground">Start free. No credit card. Upgrade when you're ready.</p>
        <Link href="/sign-up">
          <Button size="lg" className="gap-2 px-10">
            Start for free <ArrowRight size={15} />
          </Button>
        </Link>
      </div>

    </div>
  );
}
