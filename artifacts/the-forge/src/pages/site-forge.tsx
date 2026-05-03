import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Globe, Download, Eye, Code2, CheckCircle2,
  ArrowRight, ExternalLink, Server, Zap,
  ChevronDown, ChevronRight, Sparkles, Layers, Tag,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@workspace/replit-auth-web";
import { Link } from "wouter";
import { HelpPanel } from "@/components/help-panel";

const HOSTING_PROVIDERS = [
  {
    category: "Free Static Hosting",
    subtitle: "Perfect for most business websites — no server, no bill",
    color: "border-emerald-500/30 bg-emerald-950/10",
    labelColor: "text-emerald-400 bg-emerald-400/10 border-emerald-400/30",
    providers: [
      {
        name: "Cloudflare Pages",
        price: "Free",
        note: "Unlimited bandwidth · 500 deploys/mo · HTTPS included",
        best: "Best overall",
        url: "https://pages.cloudflare.com",
      },
      {
        name: "Netlify",
        price: "Free",
        note: "100GB bandwidth/mo · Form submissions · Easy drag-and-drop upload",
        best: "Great for forms",
        url: "https://netlify.com",
      },
      {
        name: "Vercel",
        price: "Free",
        note: "100GB bandwidth/mo · Instant deploys · Fast global CDN",
        best: "Fastest CDN",
        url: "https://vercel.com",
      },
    ],
  },
  {
    category: "Budget VPS (You Control the Server)",
    subtitle: "Need bookings, e-commerce, or a database? Start here.",
    color: "border-blue-500/30 bg-blue-950/10",
    labelColor: "text-blue-400 bg-blue-400/10 border-blue-400/30",
    providers: [
      {
        name: "Hetzner",
        price: "From $4/mo",
        note: "CX11 — 2 vCPU, 2GB RAM, 20GB SSD · Best value on the market",
        best: "Best value",
        url: "https://hetzner.com/cloud",
      },
      {
        name: "Vultr",
        price: "From $2.50/mo",
        note: "1 vCPU, 512MB RAM, 10GB SSD · Cheapest entry-level server",
        best: "Cheapest VPS",
        url: "https://vultr.com",
      },
      {
        name: "DigitalOcean",
        price: "From $6/mo",
        note: "Droplets — 1 vCPU, 1GB RAM · Beginner-friendly dashboard",
        best: "Easiest to use",
        url: "https://digitalocean.com",
      },
      {
        name: "Linode (Akamai)",
        price: "From $5/mo",
        note: "Nanode — 1 vCPU, 1GB RAM, 25GB SSD · Solid reliability",
        best: "Reliable",
        url: "https://linode.com",
      },
    ],
  },
  {
    category: "Managed Shared Hosting",
    subtitle: "They manage the server for you — easier but less control",
    color: "border-amber-500/30 bg-amber-950/10",
    labelColor: "text-amber-400 bg-amber-400/10 border-amber-400/30",
    providers: [
      {
        name: "Namecheap Hosting",
        price: "From $1.98/mo",
        note: "Shared hosting with cPanel · Good for WordPress · First year promo price",
        best: "Cheapest managed",
        url: "https://namecheap.com/hosting/shared",
      },
      {
        name: "SiteGround",
        price: "From $2.99/mo",
        note: "Fast shared hosting · Great WordPress support · Free SSL",
        best: "WordPress friendly",
        url: "https://siteground.com",
      },
      {
        name: "GoDaddy",
        price: "From $5.99/mo",
        note: "Most recognized name · Easy setup · Watch for upsells at checkout",
        best: "Most recognized",
        url: "https://godaddy.com/hosting/web-hosting",
      },
    ],
  },
  {
    category: "Domain Names (you need this too)",
    subtitle: "Buy once a year — your address on the internet",
    color: "border-violet-500/30 bg-violet-950/10",
    labelColor: "text-violet-400 bg-violet-400/10 border-violet-400/30",
    providers: [
      {
        name: "Namecheap",
        price: "$8–12/yr",
        note: ".com domains · Free WhoisGuard privacy · No aggressive upsells",
        best: "Best for domains",
        url: "https://namecheap.com",
      },
      {
        name: "Cloudflare Registrar",
        price: "$8–10/yr",
        note: "At-cost pricing — no markup · Free privacy · Works with Cloudflare Pages",
        best: "No markup",
        url: "https://cloudflare.com/products/registrar",
      },
      {
        name: "GoDaddy",
        price: "$12–20/yr",
        note: "Very well known · First year often cheap — renews higher · Watch upsells",
        best: "Most popular",
        url: "https://godaddy.com/domains",
      },
    ],
  },
];

const API_BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

const BUSINESS_TYPES = [
  "Restaurant / Food",
  "Contractor / Trades",
  "Salon / Beauty",
  "Retail Shop",
  "Service Business",
  "Medical / Dental",
  "Real Estate",
  "Landscaping / Lawn Care",
  "Auto Repair",
  "Cleaning Service",
  "Gym / Fitness",
  "Photography / Creative",
  "Law Firm",
  "Accounting / Finance",
  "Other",
];

const CTA_OPTIONS = [
  "Contact Us",
  "Call Us",
  "Book an Appointment",
  "Request a Quote",
  "Get a Free Estimate",
  "Order Online",
  "Schedule a Visit",
  "Shop Now",
];

const STYLE_OPTIONS = [
  "Clean & Professional",
  "Bold & Modern",
  "Warm & Friendly",
  "Minimal & Elegant",
  "Dark & Powerful",
];

type Phase = "form" | "generating" | "done" | "error";

const LOADING_MESSAGES = [
  "Reading your business details…",
  "Designing your homepage…",
  "Writing your story…",
  "Styling your brand…",
  "Building your services section…",
  "Crafting your call to action…",
  "Optimizing for mobile…",
  "Adding the finishing touches…",
  "Almost done…",
];

export default function SiteForge() {
  
  const [phase, setPhase] = useState<Phase>("form");
  const [loadingMsg, setLoadingMsg] = useState(0);
  const [generatedHtml, setGeneratedHtml] = useState("");
  const [activeTab, setActiveTab] = useState<"preview" | "code">("preview");
  const [openGuide, setOpenGuide] = useState<string | null>("cloudflare");
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const [form, setForm] = useState({
    businessName: "",
    type: "Service Business",
    location: "",
    phone: "",
    email: "",
    cta: "Contact Us",
    style: "Clean & Professional",
    color: "#7c3aed",
    currentUrl: "",
    extra: "",
  });

  const set =
    (k: string) =>
    (
      e: React.ChangeEvent<
        HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
      >,
    ) =>
      setForm((prev) => ({ ...prev, [k]: e.target.value }));

  useEffect(() => {
    if (phase === "generating") {
      intervalRef.current = setInterval(() => {
        setLoadingMsg((prev) => (prev + 1) % LOADING_MESSAGES.length);
      }, 2400);
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [phase]);

  async function generate() {
    if (!form.businessName.trim()) return;
    setPhase("generating");
    setGeneratedHtml("");
    setLoadingMsg(0);

    try {
      
      const res = await fetch(`${API_BASE}/api/site-forge/generate`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(form),
      });

      if (!res.ok || !res.body) throw new Error("Request failed");

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let accumulated = "";

      outer: while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const text = decoder.decode(value, { stream: true });
        const lines = text.split("\n\n");
        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const data = line.slice(6).trim();
          if (data === "[DONE]") {
            setGeneratedHtml(accumulated);
            setPhase("done");
            break outer;
          }
          try {
            const parsed = JSON.parse(data) as {
              choices?: { delta?: { content?: string } }[];
              error?: string;
            };
            if (parsed.error) throw new Error(parsed.error);
            const delta = parsed.choices?.[0]?.delta?.content ?? "";
            if (delta) {
              accumulated += delta;
              if (accumulated.length % 600 < 30)
                setGeneratedHtml(accumulated);
            }
          } catch {
            /* ignore partial chunk parse errors */
          }
        }
      }

      if (accumulated && phase !== "done") {
        setGeneratedHtml(accumulated);
        setPhase("done");
      }
    } catch (err) {
      console.error(err);
      setPhase("error");
    }
  }

  function downloadHtml() {
    const blob = new Blob([generatedHtml], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${form.businessName.toLowerCase().replace(/\s+/g, "-")}-website.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  return (
    <div className="max-w-5xl mx-auto space-y-8 p-4 md:p-6">
      {/* Header */}
      <div className="space-y-3">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-violet-500/20 shrink-0">
            <Globe size={22} className="text-violet-400" />
          </div>
          <div className="flex-1">
            <h1 className="text-2xl font-black">Site Forge</h1>
            <p className="text-sm text-muted-foreground">
              Build a professional business website in 60 seconds. You own it
              forever.
            </p>
          </div>
          <HelpPanel
            config={{
              title: "Site Forge",
              moon: { name: "Orion · Moon #3", color: "#8b5cf6", tagline: "Own your corner of the internet." },
              what: "Site Forge builds you a complete, real business website from a short description. It generates the full HTML/CSS code — you download it and host it free with Cloudflare Pages, GitHub Pages, or any static host. No monthly fees, no lock-in.",
              when: "Use Site Forge if you need a professional online presence for your business and don't want to pay $30–80/month forever just to rent a website. You own the output.",
              examples: [
                "A local plumbing company in Atlanta — residential and light commercial work, family owned",
                "A freelance logo and brand design studio, primarily for small businesses and startups",
                "A mobile pet grooming service — dogs and cats, appointment-based, Dallas/Fort Worth area",
              ],
              tips: [
                "Fill in every field — the more detail you give, the more professional the result",
                "After generating, click Download and host free with Cloudflare Pages (5 minute setup)",
                "The code is yours — edit it in any code editor or hand it to a developer",
              ],
            }}
          />
        </div>

        {phase === "form" && (
          <div className="rounded-xl bg-violet-500/10 border border-violet-500/20 p-4 text-sm text-violet-300 leading-relaxed">
            <strong className="text-violet-200">
              Tired of paying $30–80/month to companies who hold your site
              hostage?
            </strong>{" "}
            Tell us about your business and we'll build you a complete, real
            website you download and own outright. Host it free with Cloudflare
            — no monthly ransom, no lock-in, no asking permission to change your
            own content.
          </div>
        )}
      </div>

      {/* ─── HOSTING COMPARISON ───────────────────────────────────────────────── */}
      {phase === "form" && (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Tag size={15} className="text-muted-foreground" />
            <h2 className="font-black text-base">Step 1 — Pick Your Host</h2>
            <span className="text-xs text-muted-foreground">(open any link, sign up, come back and build your site)</span>
          </div>

          <div className="space-y-4">
            {HOSTING_PROVIDERS.map((group) => (
              <div key={group.category} className={cn("rounded-xl border p-4 space-y-3", group.color)}>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-bold text-sm">{group.category}</h3>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">{group.subtitle}</p>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                  {group.providers.map((p) => (
                    <a
                      key={p.name}
                      href={p.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex flex-col gap-1.5 rounded-lg border border-border/50 bg-background/60 hover:bg-background p-3 transition-colors group"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <span className="font-semibold text-sm leading-tight">{p.name}</span>
                        <ExternalLink size={11} className="text-muted-foreground shrink-0 mt-0.5 group-hover:text-foreground transition-colors" />
                      </div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-base font-black text-foreground">{p.price}</span>
                        <span className={cn("text-[10px] font-bold px-1.5 py-0.5 rounded-full border", group.labelColor)}>
                          {p.best}
                        </span>
                      </div>
                      <p className="text-[11px] text-muted-foreground leading-snug">{p.note}</p>
                    </a>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ─── FORM ──────────────────────────────────────────────────────────────── */}
      {phase === "form" && (
        <div className="space-y-6">
          <div className="flex items-center gap-2">
            <Globe size={15} className="text-muted-foreground" />
            <h2 className="font-black text-base">Step 2 — Tell Us About Your Business</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2 space-y-1.5">
              <Label htmlFor="bname" className="text-sm font-semibold">
                Business Name{" "}
                <span className="text-red-400">*</span>
              </Label>
              <Input
                id="bname"
                placeholder="e.g. Martinez Landscaping"
                value={form.businessName}
                onChange={set("businessName")}
                className="text-base"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-sm font-semibold">
                Type of Business
              </Label>
              <select
                value={form.type}
                onChange={set("type")}
                className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                {BUSINESS_TYPES.map((t) => (
                  <option key={t}>{t}</option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="loc" className="text-sm font-semibold">
                City &amp; State
              </Label>
              <Input
                id="loc"
                placeholder="e.g. Austin, TX"
                value={form.location}
                onChange={set("location")}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="phone" className="text-sm font-semibold">
                Phone Number
              </Label>
              <Input
                id="phone"
                placeholder="(555) 123-4567"
                value={form.phone}
                onChange={set("phone")}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-sm font-semibold">
                Email Address
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="you@yourbusiness.com"
                value={form.email}
                onChange={set("email")}
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-sm font-semibold">
                What should visitors do?
              </Label>
              <select
                value={form.cta}
                onChange={set("cta")}
                className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                {CTA_OPTIONS.map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-sm font-semibold">Design Style</Label>
              <select
                value={form.style}
                onChange={set("style")}
                className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                {STYLE_OPTIONS.map((s) => (
                  <option key={s}>{s}</option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="color" className="text-sm font-semibold">
                Brand Color
              </Label>
              <div className="flex items-center gap-2">
                <input
                  id="color"
                  type="color"
                  value={form.color}
                  onChange={set("color")}
                  className="w-10 h-10 rounded-md border border-input bg-background cursor-pointer p-1 shrink-0"
                />
                <Input
                  value={form.color}
                  onChange={set("color")}
                  className="font-mono text-sm"
                  placeholder="#7c3aed"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="curl" className="text-sm font-semibold">
                Current Website{" "}
                <span className="text-muted-foreground font-normal">
                  (optional)
                </span>
              </Label>
              <Input
                id="curl"
                placeholder="https://youroldsite.com"
                value={form.currentUrl}
                onChange={set("currentUrl")}
              />
              <p className="text-xs text-muted-foreground">
                We'll help you break free from it.
              </p>
            </div>

            <div className="md:col-span-2 space-y-1.5">
              <Label htmlFor="extra" className="text-sm font-semibold">
                Anything special to highlight?{" "}
                <span className="text-muted-foreground font-normal">
                  (optional)
                </span>
              </Label>
              <Textarea
                id="extra"
                placeholder="e.g. Family owned since 1998, award-winning BBQ, 24/7 emergency service, veteran-owned, free estimates…"
                rows={3}
                value={form.extra}
                onChange={set("extra")}
              />
            </div>
          </div>

          <Button
            size="lg"
            onClick={generate}
            disabled={!form.businessName.trim()}
            className="w-full gap-2 bg-violet-600 hover:bg-violet-500 text-white font-bold text-base h-12"
          >
            <Sparkles size={16} />
            Build My Site
            <ArrowRight size={16} />
          </Button>
        </div>
      )}

      {/* ─── GENERATING ────────────────────────────────────────────────────────── */}
      {phase === "generating" && (
        <div className="flex flex-col items-center justify-center gap-6 py-20">
          <div className="w-16 h-16 rounded-2xl bg-violet-500/20 flex items-center justify-center">
            <Globe size={28} className="text-violet-400 animate-pulse" />
          </div>
          <div className="text-center space-y-2">
            <p className="text-lg font-bold">{LOADING_MESSAGES[loadingMsg]}</p>
            <p className="text-sm text-muted-foreground">
              Building a real, professional website — this takes about 30
              seconds
            </p>
          </div>
          <div className="flex gap-1.5">
            {[...Array(6)].map((_, i) => (
              <div
                key={i}
                className="w-2 h-2 rounded-full bg-violet-400 animate-bounce"
                style={{ animationDelay: `${i * 120}ms` }}
              />
            ))}
          </div>
          {generatedHtml.length > 100 && (
            <p className="text-xs text-muted-foreground">
              {generatedHtml.length.toLocaleString()} characters written so
              far…
            </p>
          )}
        </div>
      )}

      {/* ─── ERROR ─────────────────────────────────────────────────────────────── */}
      {phase === "error" && (
        <div className="text-center py-12 space-y-4">
          <p className="text-red-400 font-semibold">
            Something went wrong generating your site. Please try again.
          </p>
          <Button variant="outline" onClick={() => setPhase("form")}>
            Try Again
          </Button>
        </div>
      )}

      {/* ─── DONE ──────────────────────────────────────────────────────────────── */}
      {phase === "done" && (
        <div className="space-y-6">
          {/* Success banner */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-4 rounded-xl bg-violet-500/10 border border-violet-500/30 p-4">
            <div className="flex items-center gap-3 flex-1">
              <CheckCircle2
                size={20}
                className="text-violet-400 shrink-0"
              />
              <div>
                <p className="font-bold text-sm">Your site is ready.</p>
                <p className="text-xs text-muted-foreground">
                  Download it and follow the guide below to host it free —
                  you own it forever.
                </p>
              </div>
            </div>
            <div className="flex gap-2 shrink-0">
              <Button
                size="sm"
                onClick={downloadHtml}
                className="gap-1.5 bg-violet-600 hover:bg-violet-500 text-white"
              >
                <Download size={13} /> Download HTML
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setPhase("form")}
              >
                Build Another
              </Button>
            </div>
          </div>

          {/* Preview / Code tabs */}
          <div className="rounded-xl border border-border overflow-hidden">
            <div className="flex border-b border-border bg-muted/30">
              <button
                onClick={() => setActiveTab("preview")}
                className={cn(
                  "flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium transition-colors",
                  activeTab === "preview"
                    ? "bg-background text-foreground border-b-2 border-violet-400"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                <Eye size={14} /> Preview
              </button>
              <button
                onClick={() => setActiveTab("code")}
                className={cn(
                  "flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium transition-colors",
                  activeTab === "code"
                    ? "bg-background text-foreground border-b-2 border-violet-400"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                <Code2 size={14} /> HTML Code
              </button>
            </div>

            {activeTab === "preview" ? (
              <iframe
                srcDoc={generatedHtml}
                sandbox="allow-forms allow-scripts"
                className="w-full"
                style={{ height: "560px", border: "none" }}
                title="Website preview"
              />
            ) : (
              <pre className="p-4 text-xs overflow-auto bg-muted/20 h-[560px] text-muted-foreground leading-relaxed whitespace-pre-wrap break-all">
                {generatedHtml}
              </pre>
            )}
          </div>

          {/* Hosting guide */}
          <div className="space-y-3">
            <h2 className="font-black text-lg flex items-center gap-2">
              <Zap size={16} className="text-yellow-400" />
              What's Next — Get It Live for Free
            </h2>

            <GuideSection
              id="cloudflare"
              open={openGuide === "cloudflare"}
              onToggle={() =>
                setOpenGuide(
                  openGuide === "cloudflare" ? null : "cloudflare",
                )
              }
              icon={<Globe size={16} className="text-orange-400" />}
              title="Host free with Cloudflare Pages"
              badge="Recommended"
              badgeColor="text-orange-400 bg-orange-400/10 border-orange-400/30"
            >
              <ol className="space-y-3 text-sm text-muted-foreground list-decimal list-inside">
                <li>
                  Go to{" "}
                  <a
                    href="https://pages.cloudflare.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-orange-400 hover:underline"
                  >
                    pages.cloudflare.com
                  </a>{" "}
                  and create a free account
                </li>
                <li>
                  Click{" "}
                  <strong className="text-foreground">
                    Create a project
                  </strong>{" "}
                  →{" "}
                  <strong className="text-foreground">
                    Direct Upload
                  </strong>
                </li>
                <li>Upload your downloaded HTML file</li>
                <li>
                  Your site goes live instantly at{" "}
                  <code className="bg-muted px-1 rounded text-xs">
                    yourbusiness.pages.dev
                  </code>{" "}
                  — for free, forever
                </li>
                <li>
                  To update your site later, just upload a new HTML file —
                  no FTP, no code editor needed
                </li>
              </ol>
              <div className="mt-3 p-3 rounded-lg bg-orange-400/5 border border-orange-400/20 text-xs text-muted-foreground">
                Cloudflare Pages is genuinely free for static sites — no
                credit card required, no trial period, no catch. Unlimited
                bandwidth, 500 deployments per month.
              </div>
            </GuideSection>

            <GuideSection
              id="domain"
              open={openGuide === "domain"}
              onToggle={() =>
                setOpenGuide(openGuide === "domain" ? null : "domain")
              }
              icon={<CheckCircle2 size={16} className="text-green-400" />}
              title="Connect your own domain"
              badge="yourbusiness.com"
              badgeColor="text-green-400 bg-green-400/10 border-green-400/30"
            >
              <ol className="space-y-3 text-sm text-muted-foreground list-decimal list-inside">
                <li>
                  In Cloudflare Pages, open your project → click{" "}
                  <strong className="text-foreground">
                    Custom Domains
                  </strong>{" "}
                  →{" "}
                  <strong className="text-foreground">
                    Set up a custom domain
                  </strong>
                </li>
                <li>
                  Type in your domain (e.g.{" "}
                  <code className="bg-muted px-1 rounded text-xs">
                    yourbusiness.com
                  </code>
                  )
                </li>
                <li>
                  Cloudflare shows you exactly what DNS records to add at
                  your registrar (GoDaddy, Namecheap, Google Domains, etc.)
                </li>
                <li>
                  Make the change — typically goes live in 5–30 minutes
                </li>
                <li>
                  HTTPS (the padlock) is automatic — Cloudflare handles it
                  for free
                </li>
              </ol>
              <div className="mt-3 p-3 rounded-lg bg-green-400/5 border border-green-400/20 text-xs text-muted-foreground">
                Don't have a domain yet? Namecheap.com has most .com domains
                for $8–12/year. That's your only ongoing cost for the whole
                site.
              </div>
            </GuideSection>

            <GuideSection
              id="more"
              open={openGuide === "more"}
              onToggle={() =>
                setOpenGuide(openGuide === "more" ? null : "more")
              }
              icon={<Server size={16} className="text-emerald-400" />}
              title="Need bookings, a menu system, or e-commerce?"
              badge="VPS option"
              badgeColor="text-emerald-400 bg-emerald-400/10 border-emerald-400/30"
            >
              <p className="text-sm text-muted-foreground mb-3">
                A static HTML site is perfect for most local businesses. But
                if you need online booking, a restaurant ordering portal, an
                online store, or anything with a database — you'll need a
                small server.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm mb-3">
                <div className="p-3 rounded-lg bg-muted/20 border border-border space-y-1">
                  <p className="font-semibold text-foreground">
                    Hetzner VPS
                  </p>
                  <p className="text-muted-foreground text-xs">
                    Starting at $4/month — the best value server on the
                    market. We'll help you set it up from scratch.
                  </p>
                  <a
                    href="https://hetzner.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-emerald-400 hover:underline flex items-center gap-1"
                  >
                    hetzner.com <ExternalLink size={10} />
                  </a>
                </div>
                <div className="p-3 rounded-lg bg-muted/20 border border-border space-y-1">
                  <p className="font-semibold text-foreground">
                    DigitalOcean
                  </p>
                  <p className="text-muted-foreground text-xs">
                    $6–12/month, beginner-friendly dashboard. Good first
                    choice for people new to servers.
                  </p>
                  <a
                    href="https://digitalocean.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-emerald-400 hover:underline flex items-center gap-1"
                  >
                    digitalocean.com <ExternalLink size={10} />
                  </a>
                </div>
              </div>
              <div className="flex gap-2 flex-wrap">
                <Link href="/app-hub">
                  <Button size="sm" variant="outline" className="gap-1.5 text-xs">
                    <Layers size={12} /> Deploy Apps
                  </Button>
                </Link>
                <Link href="/wizard">
                  <Button size="sm" variant="outline" className="gap-1.5 text-xs">
                    Move My App
                  </Button>
                </Link>
              </div>
            </GuideSection>
          </div>
        </div>
      )}
    </div>
  );
}

function GuideSection({
  open,
  onToggle,
  icon,
  title,
  badge,
  badgeColor,
  children,
}: {
  id: string;
  open: boolean;
  onToggle: () => void;
  icon: React.ReactNode;
  title: string;
  badge: string;
  badgeColor: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        "rounded-xl border transition-colors",
        open ? "border-border/80 bg-muted/10" : "border-border/40",
      )}
    >
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between gap-3 p-4 text-left hover:bg-muted/10 rounded-xl transition-colors"
      >
        <div className="flex items-center gap-3 flex-wrap">
          {icon}
          <span className="font-semibold text-sm">{title}</span>
          <span
            className={cn(
              "text-[11px] font-bold px-2 py-0.5 rounded-full border",
              badgeColor,
            )}
          >
            {badge}
          </span>
        </div>
        {open ? (
          <ChevronDown
            size={14}
            className="text-muted-foreground shrink-0"
          />
        ) : (
          <ChevronRight
            size={14}
            className="text-muted-foreground shrink-0"
          />
        )}
      </button>
      {open && <div className="px-4 pb-4">{children}</div>}
    </div>
  );
}
