import { useMemo, useState } from "react";
import { Link } from "wouter";
import {
  MessagesSquare, Copy, CheckCircle2, Search, ChevronRight, Filter,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { AppFamily } from "@/components/app-family";

type Snippet = {
  id: string;
  question: string;
  category: "pricing" | "comparison" | "tech" | "open-source" | "solo" | "self-host" | "ai" | "platforms" | "roadmap";
  reply: string;
  notes: string;
};

const SNIPPETS: Snippet[] = [
  {
    id: "how-much",
    question: "How much does it cost? / What's your pricing?",
    category: "pricing",
    reply: "Right now Forge is free while I get it stable with early users. Long-term plan: a flat monthly tier — no per-seat, no per-build-minute, no metered AI tokens. Subscriptions are handled through thepeoplestownsq.com (my sister project) so the Forge itself stays purely a builder tool. If you self-host, you bring your own infrastructure costs and there's no platform fee — that's the whole point.",
    notes: "Don't promise a specific price you'll regret. 'Flat monthly tier' commits to the philosophy without locking in numbers.",
  },
  {
    id: "vs-replit",
    question: "Isn't this just Replit / Vercel / Cursor / Lovable?",
    category: "comparison",
    reply: "Fair question. The honest answer: I built Forge because those tools are all hosted-only and the meter never stops running. Forge is self-hostable — you run it on your own Docker host (Coolify, Hetzner, your own server, whatever) and own the data and the deploys. Replit and Vercel are great products; they're just not the same shape. If you'd rather rent your dev environment monthly forever, use them. If you'd rather own it, use Forge.",
    notes: "Acknowledge the competitor is good. Then differentiate on philosophy, not features.",
  },
  {
    id: "vs-cursor",
    question: "Why not just use Cursor with a self-hosted backend?",
    category: "comparison",
    reply: "Cursor is an editor. Forge is the whole environment — project management, secrets vault, app monitor, code editor, AI pair programming, and one-shot deploy to your own Coolify. You could rebuild that yourself by gluing Cursor + 1Password + UptimeRobot + GitHub Projects + your own deploy scripts. I just got tired of doing exactly that and consolidated it.",
    notes: "Position as integration, not replacement.",
  },
  {
    id: "stack",
    question: "What's the stack?",
    category: "tech",
    reply: "Express 5 on Node 24, React 19 + Vite + Tailwind + shadcn/ui on the frontend, Drizzle ORM on Postgres, Clerk for auth (planning to replace with self-hosted later). pnpm monorepo, single Docker image that serves both the API and the static frontend. AI calls run through the Replit AI Integrations proxy so I'm not managing OpenAI keys per-user. Streams responses via SSE.",
    notes: "Devs respect specifics. Don't lie about Clerk — be open about plans to swap it.",
  },
  {
    id: "open-source",
    question: "Is it open source?",
    category: "open-source",
    reply: "It's source-available — you can read the code, self-host it, and fork it for your own use. It's not OSI-open because I'm a solo founder and I need a license that keeps a competitor from taking the code, hosting it as a SaaS at a lower price, and ending me. If/when there's enough revenue to defend the project, I'll revisit the license. Honest tradeoff.",
    notes: "Don't claim 'open source' if your license isn't OSI-approved. Be honest about why.",
  },
  {
    id: "license-which",
    question: "Which license specifically?",
    category: "open-source",
    reply: "I'm finalizing the exact license text before the public repo opens — leaning toward an Elastic-License-style 'source-available, no competing hosted service' clause. I'll publish the full license alongside the public repo and link it here when it's locked in. If you have a strong opinion about which source-available license is least painful for users, I'm genuinely listening.",
    notes: "Don't pick a license under pressure in a Reddit thread. Promise transparency, ask for input.",
  },
  {
    id: "solo",
    question: "Are you really doing this solo?",
    category: "solo",
    reply: "Yes. One developer, no funding, no team. I write the code, run the infrastructure, answer the support emails, and write the marketing copy. It's slow and the bus factor is exactly one. The upside is every decision goes through my philosophy, not a quarterly board meeting.",
    notes: "Owning the limitations earns more trust than pretending to be a team.",
  },
  {
    id: "sustain",
    question: "How is this sustainable if you're solo?",
    category: "solo",
    reply: "Two things keep it sustainable: (1) zero external pressure — no investors, no growth targets, no runway clock. I can move slow. (2) The cost structure is honest. I'm not subsidizing free users with VC money I'll have to pay back later by jacking up the price. If users find this useful enough to pay for, it keeps going. If they don't, it goes back to being a personal tool. Either way I'm fine.",
    notes: "Address the death-of-solo-projects fear head-on.",
  },
  {
    id: "bus-factor",
    question: "What happens if you get hit by a bus?",
    category: "solo",
    reply: "Legitimate concern, and the reason it's self-hostable. If I disappear tomorrow, the Docker image on your server keeps running. The code is in your hands. The data is in your Postgres. You're not stranded waiting for a platform to maybe respond to your support ticket — you can keep building. That's the sovereignty promise: I'm not a single point of failure for your business.",
    notes: "Reframe the bus-factor risk as a feature of self-hosting.",
  },
  {
    id: "self-host-how",
    question: "How do I self-host it?",
    category: "self-host",
    reply: "One Docker container. Pull the image, point a docker-compose.yml at a Postgres database (or use the bundled one), set the env vars (API key for the AI proxy, your Clerk keys, a session secret, your DB URL), and it runs. I deploy it on Coolify myself, but anything that can run a container works. Full docker-compose example is in the README.",
    notes: "Keep it concrete. People want to know it's one command, not a Helm chart.",
  },
  {
    id: "self-host-prod",
    question: "Is it production-ready for self-hosting?",
    category: "self-host",
    reply: "Honest answer: it's production-ready for solo developers and small teams. I run my own work on it every day. It's NOT yet hardened for a 50-person engineering org — there's no SSO, no audit log export, no compliance certifications. If you're a solo or duo dev shop, you'll be fine. If you're a regulated enterprise, wait a quarter.",
    notes: "Honest scoping protects you from bad early users who'll write angry reviews.",
  },
  {
    id: "coolify",
    question: "Why Coolify specifically?",
    category: "self-host",
    reply: "Because Coolify is the closest thing to 'Vercel you can own.' It does git-based deploys, env management, webhooks, healthchecks — all the things hosted platforms do — but you run it on your own server. Forge's Coolify integration validates your connection via /api/v1/healthcheck, pulls env vars from all your apps into the encrypted vault, and one-clicks new app deploys. If you use a different platform (Dokploy, Caprover, raw Docker), the same patterns work — Coolify just happens to be the one I run.",
    notes: "Make it clear you're not locked into Coolify, just demoing with it.",
  },
  {
    id: "ai-which",
    question: "Which AI model does it use?",
    category: "ai",
    reply: "It runs through Replit's AI Integrations proxy, which is OpenAI-compatible — so under the hood it's currently routing to GPT-class models, with the option to swap providers via the proxy without me having to rewrite anything. I deliberately don't want users to have to manage their own OpenAI key for every install. Streams responses via SSE. The skill level a user picks (Just Starting → Pro) shapes the system prompt so explanations match their level.",
    notes: "Devs care about which model. Be specific without overcommitting to any one provider.",
  },
  {
    id: "ai-cost",
    question: "Doesn't the AI cost get expensive at scale?",
    category: "ai",
    reply: "Yes, eventually. Right now I'm absorbing the AI cost while figuring out usage patterns. Long-term options I'm comparing: (a) include a generous monthly token bucket in the flat-fee plan and a 'bring your own key' fallback for power users, (b) pure BYOK with my proxy as the routing layer. Either way I'm not going down the metered-AI-charges-per-token path that other tools have — it ruins the user experience.",
    notes: "Acknowledge the cost reality without committing to a specific pricing scheme.",
  },
  {
    id: "ai-skip",
    question: "Can I turn off the AI features?",
    category: "ai",
    reply: "Yep. The AI features are opt-in per workspace — if you don't use them, no AI calls happen. You can use Forge as a pure self-hosted dev environment (project mgmt, secrets vault, app monitor, code editor) without ever touching the AI side. That was a deliberate design choice.",
    notes: "Reassures the anti-AI crowd that they can use the rest.",
  },
  {
    id: "no-twitter",
    question: "Where do I follow you? (No Twitter/X?)",
    category: "platforms",
    reply: "I don't post on X — I cut that platform a while ago. I'm active on Substack (13moonforge.substack.com), Dev.to (@13moonforge), Hashnode (@thirteenmoonforge), Medium, LinkedIn, and Flipboard ('13 Moon Forge' magazine). Newsletter is the main one — that's where I put long-form thinking. Substack also handles RSS, so if you prefer reader apps that works too.",
    notes: "Owning the no-X stance is on-brand. Don't apologize for it.",
  },
  {
    id: "github",
    question: "Where's the GitHub?",
    category: "platforms",
    reply: "Primary repo lives on Forgejo at git.13moonforge.ai/Ezekiel/13-moon-forge — Forgejo is my source-of-truth because it's self-hosted and I don't want GitHub to be a single point of failure. I do mirror to GitHub at github.com/2756mmr7fw-bit/13-moon-forge for discoverability. Issues and contributions on Forgejo first, GitHub second.",
    notes: "Forgejo-first is intentional. Don't apologize for the mirror lag.",
  },
  {
    id: "tpts",
    question: "What's The People's Town Square?",
    category: "platforms",
    reply: "TPTS is my other app — a social platform with no algorithm. Chronological feed, community-set rules, no risk of deplatforming by a corporate moderation team. It's where the subscription billing for Forge runs through (the two share an account system). If you're following 13 Moon Forge for the sovereignty angle, TPTS is the social-side application of the same philosophy.",
    notes: "Connect TPTS to Forge by philosophy, not by saying 'and we also have...'",
  },
  {
    id: "mobile",
    question: "Is there a mobile app?",
    category: "platforms",
    reply: "Yes — Forge Mobile is an Expo / React Native companion app for monitoring your deployed apps, checking AI conversations on the go, and pushing quick updates. It's not a full editor on mobile (nobody enjoys coding on a phone), it's the 'check on my apps without opening my laptop' tool. Currently in TestFlight beta.",
    notes: "Set expectations. Mobile is companion, not full editor.",
  },
  {
    id: "roadmap",
    question: "What's on the roadmap?",
    category: "roadmap",
    reply: "Next 90 days, in order: (1) replace Clerk with a self-hostable auth option so the whole stack is sovereignty-pure, (2) launch the Forge Press distribution tool (AI-written press releases that auto-syndicate), (3) classified-network feature that cross-posts apps from Forge into TPTS's social feeds, (4) Forgejo Actions templates so users can one-click CI/CD inside their own infra. After that, public roadmap goes on the site so it's not a black box.",
    notes: "Be specific about the next 3 months. Vague long-term roadmaps signal you don't have a plan.",
  },
];

const CATEGORIES: { id: Snippet["category"] | "all"; label: string }[] = [
  { id: "all", label: "All 20" },
  { id: "pricing", label: "Pricing" },
  { id: "comparison", label: "Comparisons" },
  { id: "tech", label: "Tech stack" },
  { id: "open-source", label: "Open source / license" },
  { id: "solo", label: "Solo founder" },
  { id: "self-host", label: "Self-hosting" },
  { id: "ai", label: "AI features" },
  { id: "platforms", label: "Platforms / accounts" },
  { id: "roadmap", label: "Roadmap" },
];

export default function ReplySnippetsPage() {
  const { toast } = useToast();
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [activeCat, setActiveCat] = useState<Snippet["category"] | "all">("all");

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return SNIPPETS.filter((s) => {
      if (activeCat !== "all" && s.category !== activeCat) return false;
      if (!q) return true;
      return (
        s.question.toLowerCase().includes(q) ||
        s.reply.toLowerCase().includes(q) ||
        s.category.toLowerCase().includes(q)
      );
    });
  }, [search, activeCat]);

  async function copyReply(text: string, id: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(id);
      toast({ title: "Copied", description: "Paste into your reply box. Personalize the opening line." });
      setTimeout(() => setCopiedId(null), 2000);
    } catch {
      toast({
        title: "Couldn't copy automatically",
        description: "Select the reply text and copy it manually (Ctrl/Cmd + C).",
        variant: "destructive",
      });
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-950 to-slate-900 text-slate-100">
      <AppFamily />

      <div className="mx-auto max-w-5xl px-6 py-10">
        {/* Header */}
        <div className="mb-8">
          <div className="mb-2 flex items-center gap-2 text-sm text-slate-400">
            <Link href="/" className="hover:text-slate-200">Home</Link>
            <span>/</span>
            <Link href="/distribution-plan" className="hover:text-slate-200">Distribution Plan</Link>
            <span>/</span>
            <span>Reply Snippets</span>
          </div>
          <h1 className="flex items-center gap-3 text-3xl font-bold tracking-tight">
            <MessagesSquare className="h-7 w-7 text-emerald-400" />
            Saved Reply Snippets
          </h1>
          <p className="mt-2 max-w-3xl text-slate-400">
            The 20 questions you'll get within an hour of posting to HN, Indie Hackers, or Reddit. Each answer is written in your voice — solo founder, self-hosted, Forgejo-first, no Twitter/X. Tweak the opening line to match the specific commenter, but the substance is ready.
          </p>
        </div>

        {/* Filter bar */}
        <div className="mb-6 space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
            <Input
              placeholder="Search questions or answers..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 bg-slate-900/60 border-slate-800 text-slate-100 placeholder:text-slate-500"
              data-testid="input-search-snippets"
            />
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Filter className="h-3.5 w-3.5 text-slate-500" />
            {CATEGORIES.map((c) => (
              <button
                key={c.id}
                onClick={() => setActiveCat(c.id)}
                className={cn(
                  "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
                  activeCat === c.id
                    ? "border-emerald-500/60 bg-emerald-500/15 text-emerald-300"
                    : "border-slate-800 bg-slate-900/40 text-slate-400 hover:bg-slate-800/40 hover:text-slate-200",
                )}
                data-testid={`button-filter-${c.id}`}
              >
                {c.label}
              </button>
            ))}
          </div>
          <div className="text-xs text-slate-500">
            Showing {filtered.length} of {SNIPPETS.length} snippets
          </div>
        </div>

        {/* Snippets list */}
        <div className="space-y-4">
          {filtered.map((s, idx) => (
            <article
              key={s.id}
              className="rounded-lg border border-slate-800 bg-slate-900/40 p-5"
              id={s.id}
            >
              <div className="mb-3 flex items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-slate-500">Q{idx + 1}</span>
                    <span className="rounded-full border border-slate-700 bg-slate-800/60 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                      {s.category}
                    </span>
                  </div>
                  <h2 className="mt-1 text-lg font-semibold text-slate-100">
                    {s.question}
                  </h2>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => copyReply(s.reply, s.id)}
                  className="border-slate-700 bg-slate-900 hover:bg-slate-800 shrink-0"
                  data-testid={`button-copy-${s.id}`}
                >
                  {copiedId === s.id ? (
                    <><CheckCircle2 className="mr-1.5 h-3.5 w-3.5 text-emerald-400" /> Copied</>
                  ) : (
                    <><Copy className="mr-1.5 h-3.5 w-3.5" /> Copy reply</>
                  )}
                </Button>
              </div>

              <div className="rounded-md border border-slate-800 bg-slate-950/60 p-4">
                <pre className="whitespace-pre-wrap font-sans text-sm text-slate-200">{s.reply}</pre>
              </div>

              <p className="mt-2 text-xs italic text-slate-500">
                <span className="font-semibold not-italic text-slate-400">Tip:</span> {s.notes}
              </p>
            </article>
          ))}

          {filtered.length === 0 && (
            <div className="rounded-lg border border-slate-800 bg-slate-900/40 p-10 text-center text-sm text-slate-500">
              No snippets match that filter. Clear search or pick a different category.
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="mt-10 rounded-lg border border-slate-800 bg-slate-900/40 p-5 text-sm text-slate-300">
          <h3 className="mb-2 font-semibold">How to actually use these</h3>
          <ol className="ml-5 list-decimal space-y-1">
            <li>Open your launch post in one tab, this page in another.</li>
            <li>When a comment lands, copy the closest snippet, paste, and rewrite the FIRST LINE so it directly addresses what they said.</li>
            <li>Never paste a snippet verbatim — that reads like a bot. Personalize the opening 10 words, keep the substance.</li>
            <li>If a question is asked that's NOT in here, add it (write the answer in your voice and ping me to save it permanently).</li>
          </ol>
          <div className="mt-4 flex flex-wrap gap-2">
            <Button asChild size="sm" variant="outline" className="border-slate-700 bg-slate-900 hover:bg-slate-800">
              <Link href="/distribution-plan">
                Back to Distribution Plan <ChevronRight className="ml-1 h-3.5 w-3.5" />
              </Link>
            </Button>
            <Button asChild size="sm" variant="outline" className="border-slate-700 bg-slate-900 hover:bg-slate-800">
              <Link href="/reddit-map">
                Reddit Map <ChevronRight className="ml-1 h-3.5 w-3.5" />
              </Link>
            </Button>
            <Button asChild size="sm" variant="outline" className="border-slate-700 bg-slate-900 hover:bg-slate-800">
              <Link href="/haro-templates">
                HARO Templates <ChevronRight className="ml-1 h-3.5 w-3.5" />
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
