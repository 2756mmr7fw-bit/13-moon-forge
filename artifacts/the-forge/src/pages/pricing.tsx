import { Hammer, Sparkles, Users, Zap, RotateCcw, ExternalLink, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const TOWN_SQUARE_URL = "https://thepeoplestownsq.com/our-apps";

const moons = [
  {
    id: "forge",
    name: "Forge",
    role: "The Builder",
    price: 3,
    icon: Hammer,
    color: "border-primary",
    glow: true,
    description: "AI-powered building assistant. Turns ideas into real products, prototypes, and plans.",
    features: [
      "100 messages / month",
      "Invention & product planning",
      "Manufacturing & materials guidance",
      "Patent basics & IP advice",
      "Business planning for physical products",
      "3D printing & fabrication support",
    ],
  },
  {
    id: "flint",
    name: "Flint",
    role: "The Spark",
    price: 2,
    icon: Sparkles,
    color: "border-amber-500/50",
    glow: false,
    description: "The brainstorming engine. Helps you find the idea worth building before anyone picks up a tool.",
    features: [
      "100 messages / month",
      "Invention brainstorming",
      "Unique angle & market finding",
      "Problem reframing",
      "Naming & elevator pitches",
      "Wild ideas, zero judgment",
    ],
  },
];

const refillPacks = [
  { messages: 50,  price: 2.99 },
  { messages: 150, price: 6.99 },
  { messages: 500, price: 14.99 },
];

const competitors = [
  { name: "ChatGPT Plus",        price: "$20/mo",   note: "1 general AI" },
  { name: "ChatGPT Pro",         price: "$200/mo",  note: "1 general AI, unlimited" },
  { name: "Sintra AI",           price: "$97/mo",   note: "12 assistants, 250 credits" },
  { name: "Grammarly Premium",   price: "$30/mo",   note: "reads everything you type" },
  { name: "Us (Full Team)",      price: "$25/mo",   note: "all 13 Moons, 500 messages", highlight: true },
];

export default function Pricing() {
  return (
    <div className="max-w-4xl mx-auto animate-in fade-in duration-300 space-y-14">

      {/* Header */}
      <div className="text-center">
        <p className="text-xs uppercase tracking-widest text-primary font-semibold mb-3">13 Moon Forge · Pricing</p>
        <h1 className="text-4xl font-black tracking-tight mb-4">
          Pick the Moons<br className="hidden sm:block" /> you actually need
        </h1>
        <p className="text-muted-foreground text-lg max-w-xl mx-auto">
          Two AI characters live in this app. Subscribe to one or both — or grab the Full Team Bundle on the Town Square and unlock all 13.
        </p>
      </div>

      {/* Free tier banner */}
      <div className="flex items-center gap-4 border border-dashed border-border rounded-xl p-5 bg-card/40">
        <div className="bg-muted rounded-lg p-2.5 shrink-0">
          <Zap className="w-5 h-5 text-muted-foreground" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm">Free to try — no credit card needed</p>
          <p className="text-muted-foreground text-sm">Every new user gets <strong className="text-foreground">5 free messages</strong> shared across all Thirteen Moons apps. No commitment.</p>
        </div>
      </div>

      {/* Moon subscription cards */}
      <div>
        <h2 className="text-xl font-bold mb-5">Individual Moon Subscriptions</h2>
        <p className="text-sm text-muted-foreground mb-6">Turn on only what you need. Each Moon is an on/off switch — no bundles forced on you.</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {moons.map((moon) => {
            const Icon = moon.icon;
            return (
              <div
                key={moon.id}
                className={cn(
                  "relative rounded-xl border-2 bg-card p-6 flex flex-col",
                  moon.color,
                  moon.glow && "shadow-[0_0_40px_rgba(255,100,0,0.1)]"
                )}
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className={cn("p-2.5 rounded-lg", moon.glow ? "bg-primary/20" : "bg-amber-900/30")}>
                      <Icon className={cn("w-5 h-5", moon.glow ? "text-primary" : "text-amber-400")} />
                    </div>
                    <div>
                      <h3 className="font-bold text-lg leading-none">{moon.name}</h3>
                      <p className="text-xs text-muted-foreground mt-0.5">{moon.role}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-3xl font-black">${moon.price}</div>
                    <div className="text-xs text-muted-foreground">/month</div>
                  </div>
                </div>

                <p className="text-sm text-muted-foreground mb-5">{moon.description}</p>

                <ul className="space-y-2 mb-6 flex-1">
                  {moon.features.map((f) => (
                    <li key={f} className="flex items-start gap-2 text-sm">
                      <Check className={cn("w-4 h-4 mt-0.5 shrink-0", moon.glow ? "text-primary" : "text-amber-500")} />
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>

                <Button
                  className="w-full gap-2"
                  variant={moon.glow ? "default" : "outline"}
                  onClick={() => window.open(TOWN_SQUARE_URL, "_blank")}
                >
                  Subscribe to {moon.name} · ${moon.price}/mo
                  <ExternalLink className="w-3.5 h-3.5" />
                </Button>
                <p className="text-center text-xs text-muted-foreground mt-2">Managed at The People's Town Square</p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Full Team Bundle */}
      <div className="rounded-xl border border-amber-900/50 bg-gradient-to-br from-amber-950/30 to-card p-6 md:p-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-start gap-4">
            <div className="bg-amber-900/40 rounded-lg p-3 shrink-0">
              <Users className="w-6 h-6 text-amber-400" />
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <h3 className="text-xl font-black">Full Team Bundle</h3>
                <span className="text-xs font-semibold bg-amber-400 text-black px-2 py-0.5 rounded-full">Save $10/mo</span>
              </div>
              <p className="text-muted-foreground text-sm max-w-md">All 13 Moons. 500 messages shared per month. Every app in the ecosystem. One price.</p>
              <p className="text-sm mt-2">
                <span className="line-through text-muted-foreground mr-2">$35/mo individually</span>
                <strong className="text-amber-400 text-lg">$25/mo</strong>
              </p>
            </div>
          </div>
          <Button
            className="shrink-0 gap-2 bg-amber-400 hover:bg-amber-300 text-black font-bold"
            onClick={() => window.open(TOWN_SQUARE_URL, "_blank")}
          >
            Get All 13 Moons
            <ExternalLink className="w-3.5 h-3.5" />
          </Button>
        </div>

        <div className="mt-6 pt-5 border-t border-amber-900/40">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">First Month Trial</p>
          <p className="text-sm text-muted-foreground">
            Try all 13 Moons for <strong className="text-foreground">$20 your first month</strong> — 500 messages to explore everything. Keep what you love, shut off the rest.
          </p>
        </div>
      </div>

      {/* Message limits */}
      <div>
        <h2 className="text-xl font-bold mb-5">Monthly Message Limits</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            { label: "Individual Moon", limit: "100 messages", sub: "per Moon, per month", color: "border-border" },
            { label: "Full Team Bundle", limit: "500 messages", sub: "shared across all 13", color: "border-primary/40" },
            { label: "Free", limit: "5 messages", sub: "total, to try it out", color: "border-border" },
          ].map((tier) => (
            <div key={tier.label} className={cn("rounded-lg border bg-card p-4", tier.color)}>
              <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">{tier.label}</p>
              <p className="text-2xl font-black">{tier.limit}</p>
              <p className="text-xs text-muted-foreground mt-1">{tier.sub}</p>
            </div>
          ))}
        </div>
        <p className="text-xs text-muted-foreground mt-3 flex items-center gap-1.5">
          <RotateCcw className="w-3 h-3" />
          Messages reset on the 1st of every month.
        </p>
      </div>

      {/* Refill packs */}
      <div>
        <h2 className="text-xl font-bold mb-2">Refill Packs</h2>
        <p className="text-sm text-muted-foreground mb-5">Hit your limit early? Top up anytime. Unused refill messages <strong className="text-foreground">never expire</strong> and work across every app.</p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {refillPacks.map((pack) => (
            <div key={pack.messages} className="rounded-lg border border-border bg-card p-4 flex items-center justify-between">
              <div>
                <p className="font-bold text-lg">{pack.messages} messages</p>
                <p className="text-xs text-muted-foreground">carries over, never expires</p>
              </div>
              <div className="text-right">
                <p className="text-2xl font-black">${pack.price}</p>
                <Button
                  size="sm"
                  variant="outline"
                  className="mt-1 text-xs h-7"
                  onClick={() => window.open(TOWN_SQUARE_URL, "_blank")}
                >
                  Buy
                </Button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Competitor comparison */}
      <div>
        <h2 className="text-xl font-bold mb-5">How We Stack Up</h2>
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
                  <td className={cn("px-5 py-3 text-muted-foreground hidden sm:table-cell", c.highlight && "text-foreground")}>{c.note}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-xs text-muted-foreground mt-3">No data harvesting. No reading your files. Built for the people.</p>
      </div>

      {/* CTA footer */}
      <div className="text-center border border-dashed border-border rounded-xl p-8 bg-card/30">
        <h3 className="text-xl font-bold mb-2">All subscriptions managed at The People's Town Square</h3>
        <p className="text-sm text-muted-foreground mb-5 max-w-md mx-auto">
          Subscribe once, access everywhere. Your messages work across all 9 apps in the Sovereign Digital ecosystem.
        </p>
        <Button
          size="lg"
          className="gap-2 bg-amber-400 hover:bg-amber-300 text-black font-bold"
          onClick={() => window.open(TOWN_SQUARE_URL, "_blank")}
        >
          Manage Subscriptions at Town Square
          <ExternalLink className="w-4 h-4" />
        </Button>
      </div>

    </div>
  );
}
