import { useState } from "react";
import { ExternalLink, Search, Database, Cpu, Shield, Mail, HardDrive, CreditCard, Code2, Zap, Globe, Server } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface Service {
  name: string;
  tagline: string;
  description: string;
  url: string;
  pricing: string;
  badge?: string;
  badgeColor?: string;
  recommended?: boolean;
}

interface Category {
  id: string;
  label: string;
  icon: React.ComponentType<{ size: number; className?: string }>;
  color: string;
  services: Service[];
}

const CATEGORIES: Category[] = [
  {
    id: "infra",
    label: "Servers & VPS",
    icon: Server,
    color: "text-orange-400",
    services: [
      { name: "Hetzner Cloud", tagline: "Best value VPS in Europe", description: "Excellent performance at the lowest price on the market. CX22 (4GB RAM, 2 vCPU) is €4.35/mo. Ideal for 99% of projects. Data centers in Germany, Finland, and the US.", url: "https://hetzner.com/cloud", pricing: "from €3.79/mo", badge: "Best Value", badgeColor: "bg-orange-500/15 text-orange-400", recommended: true },
      { name: "DigitalOcean", tagline: "Beginner-friendly with great docs", description: "Industry-standard docs and a polished dashboard. The best choice if you're just starting with self-hosting and want hand-holding.", url: "https://digitalocean.com", pricing: "from $6/mo" },
      { name: "Vultr", tagline: "Fast global network, 32 locations", description: "Competitive pricing, great network performance, and a clean API. High-frequency compute plans available for demanding workloads.", url: "https://vultr.com", pricing: "from $2.50/mo" },
      { name: "Linode / Akamai", tagline: "Rock-solid reliability since 2003", description: "One of the oldest VPS providers. Extremely reliable, great support, and a loyal community. Good for teams that need stability above all.", url: "https://linode.com", pricing: "from $5/mo" },
      { name: "Contabo", tagline: "Maximum RAM for minimum cost", description: "Unusually high specs for the price. Great for memory-intensive workloads like databases or ML. Trade-off: slower network and support.", url: "https://contabo.com", pricing: "from €4.99/mo", badge: "Budget Pick", badgeColor: "bg-zinc-500/15 text-zinc-400" },
      { name: "OVHcloud", tagline: "European dedicated servers", description: "The go-to for dedicated servers in Europe. Bare metal at reasonable prices. Excellent for high-traffic production workloads.", url: "https://ovhcloud.com", pricing: "from €4.99/mo" },
    ],
  },
  {
    id: "databases",
    label: "Databases",
    icon: Database,
    color: "text-blue-400",
    services: [
      { name: "Neon", tagline: "Serverless Postgres with branching", description: "The modern way to run Postgres. Scale to zero when idle, instant branching for each environment, and a generous free tier. Connects directly to your apps with a standard PostgreSQL URL.", url: "https://neon.tech", pricing: "Free tier + from $19/mo", badge: "Recommended", badgeColor: "bg-blue-500/15 text-blue-400", recommended: true },
      { name: "Supabase", tagline: "Postgres + Auth + Storage in one", description: "An open-source Firebase alternative. You get a full Postgres database, authentication, file storage, and realtime subscriptions — all from one dashboard.", url: "https://supabase.com", pricing: "Free tier + from $25/mo" },
      { name: "PlanetScale", tagline: "Serverless MySQL at scale", description: "Built on Vitess (the same tech that scales YouTube). Non-blocking schema changes, instant branching, and a developer-friendly workflow.", url: "https://planetscale.com", pricing: "Free tier + from $39/mo" },
      { name: "Railway", tagline: "Any database, zero config", description: "Deploy Postgres, MySQL, Redis, or MongoDB in one click. Pairs perfectly with Railway's app hosting for a simple stack.", url: "https://railway.app", pricing: "from $5/mo" },
      { name: "MongoDB Atlas", tagline: "The cloud document database", description: "Managed MongoDB with global clusters, full-text search, vector search for AI apps, and a generous free tier. Best for flexible document-style data.", url: "https://mongodb.com/atlas", pricing: "Free tier + usage-based" },
      { name: "Redis Cloud", tagline: "Managed Redis for caching & queues", description: "Run Redis without managing infrastructure. Essential for session storage, job queues, rate limiting, and pub/sub. 30MB free forever.", url: "https://redis.com/cloud", pricing: "Free tier + from $7/mo" },
      { name: "Turso", tagline: "SQLite at the edge", description: "Edge-native SQLite with microsecond latency. Perfect for apps that need blazing fast reads close to users. 500 databases free.", url: "https://turso.tech", pricing: "Free tier + from $29/mo" },
    ],
  },
  {
    id: "ai",
    label: "AI APIs",
    icon: Zap,
    color: "text-violet-400",
    services: [
      { name: "OpenAI", tagline: "GPT-4, DALL-E, Whisper & more", description: "The industry standard. GPT-4o for text, DALL-E 3 for images, Whisper for transcription, and TTS for voice. Most third-party libraries support OpenAI's API format.", url: "https://platform.openai.com", pricing: "Pay per token", recommended: true },
      { name: "Anthropic", tagline: "Claude — thoughtful, safe AI", description: "Claude models excel at analysis, writing, and following complex instructions. Claude 3.5 Sonnet is widely considered the best coding model available.", url: "https://anthropic.com", pricing: "Pay per token", badge: "Top for Code", badgeColor: "bg-violet-500/15 text-violet-400" },
      { name: "Google Gemini", tagline: "Multimodal AI from Google", description: "Native vision, audio, and text in one model. Gemini 1.5 Pro has a 1M token context window — useful for analyzing huge documents or codebases.", url: "https://ai.google.dev", pricing: "Free tier + pay per token" },
      { name: "Groq", tagline: "Fastest inference on the planet", description: "Run Llama, Mistral, and Gemma at 300-500 tokens/second. Use Groq when you need real-time streaming without delays. OpenAI-compatible API.", url: "https://groq.com", pricing: "Free tier + pay per token", badge: "Fastest", badgeColor: "bg-green-500/15 text-green-400" },
      { name: "Together AI", tagline: "Open-source models at scale", description: "Run 100+ open models (Llama, Mistral, DeepSeek, SDXL) through one OpenAI-compatible API. Great for experimenting without hitting vendor lock-in.", url: "https://together.ai", pricing: "Pay per token" },
      { name: "Replicate", tagline: "Run any AI model via API", description: "10,000+ models in one place — Stable Diffusion, Flux, Whisper, custom LoRAs. Pay per second of compute. Perfect for image/video generation.", url: "https://replicate.com", pricing: "Pay per compute second" },
      { name: "ElevenLabs", tagline: "Voice AI that sounds human", description: "Text-to-speech and voice cloning that sounds indistinguishable from a real person. Used by top podcasters, game devs, and content creators.", url: "https://elevenlabs.io", pricing: "Free tier + from $5/mo" },
      { name: "Fal.ai", tagline: "Real-time image generation", description: "Generate images in 200ms with Flux and SDXL. Faster and cheaper than Replicate for high-volume image generation workloads.", url: "https://fal.ai", pricing: "Pay per compute" },
    ],
  },
  {
    id: "auth",
    label: "Authentication",
    icon: Shield,
    color: "text-green-400",
    services: [
      { name: "Clerk", tagline: "Drop-in auth with beautiful UI", description: "Complete user management with pre-built React components. Email, OAuth (Google, GitHub, Apple), MFA, organizations, and more. What Forge uses.", url: "https://clerk.com", pricing: "Free tier + from $25/mo", badge: "Used by Forge", badgeColor: "bg-orange-500/15 text-orange-400", recommended: true },
      { name: "Auth0", tagline: "Enterprise-grade identity", description: "The gold standard for large organizations. SOC 2, HIPAA, and FedRAMP compliant. If you're building for enterprise customers, this is the safe choice.", url: "https://auth0.com", pricing: "Free tier + from $23/mo" },
      { name: "Supabase Auth", tagline: "Open-source auth built in", description: "Free built-in auth with Supabase's database. Email, magic links, OAuth, and phone auth. Self-host for zero cost and full control.", url: "https://supabase.com/auth", pricing: "Free with Supabase" },
      { name: "Better Auth", tagline: "TypeScript-first self-hosted auth", description: "The modern open-source auth library for TypeScript. Sessions, OAuth, 2FA, organizations — zero vendor lock-in. Run it yourself.", url: "https://better-auth.com", pricing: "Free / Open Source", badge: "Self-Host", badgeColor: "bg-zinc-500/15 text-zinc-400" },
      { name: "WorkOS", tagline: "SSO and SCIM for enterprise", description: "Add enterprise SSO (SAML, OIDC) to your app in hours instead of months. If you're selling to enterprise and need single sign-on, this is it.", url: "https://workos.com", pricing: "Free up to 1M MAU" },
    ],
  },
  {
    id: "email",
    label: "Email & Messaging",
    icon: Mail,
    color: "text-sky-400",
    services: [
      { name: "Resend", tagline: "Email API built for developers", description: "The cleanest email API on the market. React Email templates, excellent deliverability, and a dashboard that actually makes sense. Free 3,000 emails/mo.", url: "https://resend.com", pricing: "Free tier + from $20/mo", badge: "Recommended", badgeColor: "bg-sky-500/15 text-sky-400", recommended: true },
      { name: "SendGrid", tagline: "The industry standard email API", description: "Battle-tested at massive scale. 100 emails/day free forever. Best for transactional AND marketing email in one platform.", url: "https://sendgrid.com", pricing: "Free tier + from $20/mo" },
      { name: "Postmark", tagline: "Obsessed with deliverability", description: "The go-to for teams where email actually landing in the inbox matters. Premium pricing, but the best deliverability rates in the industry.", url: "https://postmarkapp.com", pricing: "from $15/mo" },
      { name: "Mailgun", tagline: "Flexible email for high volume", description: "Built by developers for developers. Good logs, excellent routing rules, and webhook support for bounces and complaints.", url: "https://mailgun.com", pricing: "Free tier + pay per email" },
      { name: "Twilio", tagline: "SMS, voice, WhatsApp, video", description: "The complete communications platform. Send SMS, make calls, use WhatsApp Business, and build real-time video — all from one API.", url: "https://twilio.com", pricing: "Pay per use" },
      { name: "Vonage / Nexmo", tagline: "Global SMS at scale", description: "Strong alternative to Twilio. Better pricing in some regions (especially Europe and Asia). Good for international SMS at high volume.", url: "https://vonage.com", pricing: "Pay per use" },
      { name: "Plivo", tagline: "Cost-effective SMS & voice", description: "Often 30-50% cheaper than Twilio. Good coverage in North America and India. Reliable for high-volume SMS campaigns.", url: "https://plivo.com", pricing: "Pay per use", badge: "Budget Pick", badgeColor: "bg-zinc-500/15 text-zinc-400" },
    ],
  },
  {
    id: "storage",
    label: "Storage & CDN",
    icon: HardDrive,
    color: "text-amber-400",
    services: [
      { name: "Cloudflare R2", tagline: "S3-compatible with zero egress fees", description: "Store anything. The killer feature: NO egress fees. S3 charges you for every byte you serve — Cloudflare doesn't. 10GB free forever.", url: "https://cloudflare.com/r2", pricing: "Free tier + $0.015/GB", badge: "Best Value", badgeColor: "bg-amber-500/15 text-amber-400", recommended: true },
      { name: "Backblaze B2", tagline: "S3-compatible at $0.006/GB", description: "The cheapest reputable object storage available. S3 is 3x the price. Free egress to Cloudflare CDN. Perfect for media files and backups.", url: "https://backblaze.com/b2", pricing: "from $0.006/GB" },
      { name: "Wasabi", tagline: "1/5th the cost of AWS S3", description: "S3-compatible, fixed pricing, no egress fees. Simple and predictable billing. Great for storing large files you serve infrequently.", url: "https://wasabi.com", pricing: "$7/TB/month" },
      { name: "UploadThing", tagline: "File uploads for your Next.js app", description: "The easiest way to add file uploads. Pre-built React components, automatic type-safety, and S3 under the hood. No CDN config needed.", url: "https://uploadthing.com", pricing: "Free tier + from $10/mo" },
      { name: "Bunny CDN", tagline: "Fast CDN with storage", description: "One of the fastest and cheapest CDNs available. Built-in storage, image optimization, and video streaming. 14-day free trial.", url: "https://bunny.net", pricing: "from $1/mo" },
      { name: "Cloudflare", tagline: "DNS + CDN + DDoS protection", description: "Put your entire site behind Cloudflare for free. Best DNS, instant CDN, automatic HTTPS, and DDoS protection out of the box. Non-negotiable for production.", url: "https://cloudflare.com", pricing: "Free tier forever" },
    ],
  },
  {
    id: "payments",
    label: "Payments",
    icon: CreditCard,
    color: "text-emerald-400",
    services: [
      { name: "Stripe", tagline: "The complete payments platform", description: "The definitive choice for most apps. Subscriptions, one-time payments, invoicing, Connect for marketplaces — everything. Best docs in the industry.", url: "https://stripe.com", pricing: "2.9% + $0.30/transaction", recommended: true },
      { name: "Square", tagline: "In-person + online payments", description: "Best if you have a physical business or brick-and-mortar component. Free POS hardware available. Good for local businesses.", url: "https://squareup.com", pricing: "2.6% + $0.10 in-person" },
      { name: "Lemon Squeezy", tagline: "SaaS billing without the complexity", description: "Merchant of record — they handle sales tax in 150+ countries automatically. Perfect for indie developers selling digital products or SaaS subscriptions.", url: "https://lemonsqueezy.com", pricing: "5% + $0.50/transaction", badge: "Great for Indie", badgeColor: "bg-emerald-500/15 text-emerald-400" },
      { name: "Paddle", tagline: "Global SaaS revenue platform", description: "Handles VAT, GST, and sales tax globally as the merchant of record. Stronger than Lemon Squeezy for international SaaS with complex pricing.", url: "https://paddle.com", pricing: "5% per transaction" },
      { name: "Stripe Climate", tagline: "Remove CO₂ with every payment", description: "Route a fraction of every payment to verified carbon removal projects. Simple to add — just toggle it on in the Stripe dashboard.", url: "https://stripe.com/climate", pricing: "Any % of revenue" },
    ],
  },
  {
    id: "devtools",
    label: "Dev Tools & Infra",
    icon: Code2,
    color: "text-pink-400",
    services: [
      { name: "GitHub", tagline: "Where code lives", description: "The world's code platform. Actions for CI/CD, Packages for Docker images, Codespaces for cloud dev environments. Your code should be here.", url: "https://github.com", pricing: "Free tier + from $4/mo", recommended: true },
      { name: "GitLab", tagline: "Complete DevOps platform", description: "Everything GitHub does, plus built-in CI/CD pipelines, container registry, and security scanning. Better for teams that want everything in one place.", url: "https://gitlab.com", pricing: "Free tier + from $29/mo" },
      { name: "Cloudflare Workers", tagline: "Serverless at the edge", description: "Run JavaScript at 300+ edge locations with zero cold starts. Handle API requests, redirects, A/B tests, and auth — all without a server.", url: "https://workers.cloudflare.com", pricing: "Free tier + from $5/mo" },
      { name: "Railway", tagline: "Deploy anything in minutes", description: "One of the best developer experiences for hosting. Connect a GitHub repo and it just works. Good free tier. Great for side projects.", url: "https://railway.app", pricing: "Free tier + $5/mo" },
      { name: "Sentry", tagline: "Error tracking & performance", description: "Know the moment something breaks in production. Full stack error tracking with stack traces, user context, and performance monitoring.", url: "https://sentry.io", pricing: "Free tier + from $26/mo" },
      { name: "Upstash", tagline: "Serverless Redis & Kafka", description: "Redis and Kafka that scale to zero. Perfect for rate limiting, caching, and job queues in serverless environments. Per-request pricing.", url: "https://upstash.com", pricing: "Free tier + pay per request" },
      { name: "LogSnag", tagline: "Event tracking for your app", description: "Track what users actually do in your app — signups, payments, errors — and get notified in real-time via Slack, Discord, or email.", url: "https://logsnag.com", pricing: "Free tier + from $9/mo" },
      { name: "Doppler", tagline: "Secrets management done right", description: "Sync environment variables across all your environments and services. Never copy-paste .env files again. Integrates with Vercel, Railway, and Docker.", url: "https://doppler.com", pricing: "Free for individuals" },
    ],
  },
  {
    id: "domains",
    label: "Domains & DNS",
    icon: Globe,
    color: "text-teal-400",
    services: [
      { name: "Cloudflare Registrar", tagline: "Domains at cost — no markup", description: "The only registrar that charges exactly what ICANN charges with zero markup. Move your domains here to save 15-30% annually.", url: "https://cloudflare.com/registrar", pricing: "At cost (e.g. .com = $9.15/yr)", badge: "Cheapest", badgeColor: "bg-teal-500/15 text-teal-400", recommended: true },
      { name: "Namecheap", tagline: "Great domains, great support", description: "Popular, beginner-friendly registrar with 24/7 live chat support. Good prices on first-year registrations and a clean interface.", url: "https://namecheap.com", pricing: "from $8.88/yr" },
      { name: "Porkbun", tagline: "Cheap domains with free extras", description: "Very competitive pricing plus free WHOIS privacy, SSL certificates, and email forwarding on every domain. Good for bulk purchases.", url: "https://porkbun.com", pricing: "from $9.73/yr", badge: "Value", badgeColor: "bg-zinc-500/15 text-zinc-400" },
    ],
  },
];

function ServiceCard({ service }: { service: Service }) {
  return (
    <a
      href={service.url}
      target="_blank"
      rel="noopener noreferrer"
      className="group block rounded-xl border border-border bg-card p-4 hover:border-primary/40 hover:bg-card/80 transition-all duration-200"
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-semibold text-sm text-foreground group-hover:text-primary transition-colors">{service.name}</span>
          {service.badge && (
            <span className={cn("text-[10px] font-semibold px-1.5 py-0.5 rounded border border-transparent", service.badgeColor)}>
              {service.badge}
            </span>
          )}
        </div>
        <ExternalLink size={13} className="text-muted-foreground/40 group-hover:text-primary/60 transition-colors shrink-0 mt-0.5" />
      </div>
      <p className="text-xs text-muted-foreground mb-2 font-medium">{service.tagline}</p>
      <p className="text-xs text-muted-foreground/70 leading-relaxed line-clamp-3">{service.description}</p>
      <div className="mt-3 pt-3 border-t border-border/50">
        <span className="text-[11px] font-semibold text-primary/80">{service.pricing}</span>
      </div>
    </a>
  );
}

export default function ServicesPage() {
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState<string | null>(null);

  const query = search.trim().toLowerCase();

  const filtered = CATEGORIES.map(cat => ({
    ...cat,
    services: cat.services.filter(s =>
      !query ||
      s.name.toLowerCase().includes(query) ||
      s.tagline.toLowerCase().includes(query) ||
      s.description.toLowerCase().includes(query)
    ),
  })).filter(cat => {
    if (activeCategory && cat.id !== activeCategory) return false;
    return cat.services.length > 0;
  });

  const totalResults = filtered.reduce((sum, c) => sum + c.services.length, 0);

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-8">
      {/* Header */}
      <div>
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <Zap size={20} className="text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Service Marketplace</h1>
            <p className="text-sm text-muted-foreground">Every service a builder needs — curated, explained, and linked.</p>
          </div>
        </div>
        <p className="text-sm text-muted-foreground/70 max-w-2xl mt-3 leading-relaxed">
          Stop Googling "best database for my app." These are the tools used by thousands of production apps, organized by what they do, with honest descriptions of who each one is best for.
        </p>
      </div>

      {/* Search + Filter */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground/50" />
          <Input
            placeholder="Search services..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9 h-9 text-sm"
          />
        </div>
        <div className="flex items-center gap-1.5 flex-wrap">
          <button
            onClick={() => setActiveCategory(null)}
            className={cn("px-3 py-1.5 rounded-lg text-xs font-medium transition-colors border",
              !activeCategory ? "bg-primary/10 text-primary border-primary/30" : "border-border text-muted-foreground hover:text-foreground hover:bg-muted"
            )}
          >
            All
          </button>
          {CATEGORIES.map(cat => {
            const Icon = cat.icon;
            return (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(activeCategory === cat.id ? null : cat.id)}
                className={cn("flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors border",
                  activeCategory === cat.id ? "bg-primary/10 text-primary border-primary/30" : "border-border text-muted-foreground hover:text-foreground hover:bg-muted"
                )}
              >
                <Icon size={12} className={cat.color} />
                {cat.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Results count when searching */}
      {query && (
        <p className="text-sm text-muted-foreground">
          Found <span className="text-foreground font-semibold">{totalResults}</span> services matching "{search}"
        </p>
      )}

      {/* Categories */}
      {filtered.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-muted-foreground">No services found matching your search.</p>
        </div>
      ) : (
        <div className="space-y-10">
          {filtered.map(cat => {
            const Icon = cat.icon;
            return (
              <div key={cat.id}>
                <div className="flex items-center gap-2 mb-4">
                  <Icon size={18} className={cat.color} />
                  <h2 className="text-base font-bold">{cat.label}</h2>
                  <Badge variant="outline" className="text-[10px]">{cat.services.length}</Badge>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {cat.services.map(service => (
                    <ServiceCard key={service.name} service={service} />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div className="rounded-xl border border-border bg-muted/30 p-5 text-center">
        <p className="text-sm text-muted-foreground">
          Missing a service you rely on?{" "}
          <a href="mailto:hello@13moonforge.ai" className="text-primary hover:underline">Let us know</a>
          {" "}and we'll add it.
        </p>
      </div>
    </div>
  );
}
