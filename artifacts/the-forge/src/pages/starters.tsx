import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Flame, BookOpen, Crosshair, Scale, Zap, Code2, Sparkles,
  ArrowRight, ChevronRight,
} from "lucide-react";

const API = import.meta.env.BASE_URL.replace(/\/$/, "");

interface StarterStep {
  moonId: string;
  moonLabel: string;
  icon: React.ComponentType<{ size: number; style?: React.CSSProperties }>;
  color: string;
  prompt: string;
  desc: string;
  href: string;
}

interface Starter {
  id: string;
  title: string;
  description: string;
  outcome: string;
  tags: string[];
  steps: StarterStep[];
}

const STARTERS: Starter[] = [
  {
    id: "business-plan",
    title: "Go From Idea to Business Plan",
    description: "Turn a rough idea into a structured business plan with competitive research and a pitch summary.",
    outcome: "A complete business plan in your Workspace",
    tags: ["Business", "Strategy", "Writing"],
    steps: [
      {
        moonId: "brainstorm", moonLabel: "Flint", icon: Sparkles, color: "#f59e0b", href: "/brainstorm",
        prompt: "I want to build a business around [your idea]. Help me stress-test this idea — what's the core value proposition, who's the real customer, and what are the three biggest risks?",
        desc: "Stress-test your idea with Flint",
      },
      {
        moonId: "hawk", moonLabel: "Hawk", icon: Crosshair, color: "#eab308", href: "/hawk",
        prompt: "Find the top 5 competitors for [your business idea], including their pricing, strengths, and biggest weaknesses. I'm targeting [your audience].",
        desc: "Research competitors with Hawk",
      },
      {
        moonId: "launch", moonLabel: "Creed", icon: Zap, color: "#3b82f6", href: "/launch",
        prompt: "Write a one-page business plan for [your business] targeting [your audience]. Include: problem, solution, revenue model, go-to-market strategy, and 90-day milestones.",
        desc: "Write the plan with Creed",
      },
    ],
  },
  {
    id: "launch-site",
    title: "Build & Launch a Landing Page",
    description: "Write the copy, build the page, and get it live — from scratch.",
    outcome: "Live landing page with converting copy",
    tags: ["Web", "Marketing", "Code"],
    steps: [
      {
        moonId: "brainstorm", moonLabel: "Flint", icon: Sparkles, color: "#f59e0b", href: "/brainstorm",
        prompt: "I'm building a landing page for [your product]. Help me nail the headline, subheadline, and three core value props for [your target customer].",
        desc: "Craft your messaging with Flint",
      },
      {
        moonId: "code-forge", moonLabel: "Flint", icon: Code2, color: "#ef4444", href: "/code-forge",
        prompt: "Write a complete HTML/Tailwind landing page for [your product]. Use these copy points: [paste from previous step]. Make it dark mode, modern, with a CTA button and email signup form.",
        desc: "Build the page with Code Forge",
      },
      {
        moonId: "launch", moonLabel: "Creed", icon: Zap, color: "#3b82f6", href: "/launch",
        prompt: "Write a 5-step pre-launch email sequence for [your product]. Audience: [your target]. Goals: build waitlist, create urgency, convert at launch.",
        desc: "Write the launch emails with Creed",
      },
    ],
  },
  {
    id: "learn-skill",
    title: "Learn Any Skill Deeply",
    description: "Go from zero to understanding a topic at a meaningful depth — with a study plan and resources.",
    outcome: "Personalized study plan + resource list",
    tags: ["Learning", "Education"],
    steps: [
      {
        moonId: "sage", moonLabel: "Sage", icon: BookOpen, color: "#22c55e", href: "/sage",
        prompt: "Explain [topic] to me like I'm a smart beginner. I know [what you already know]. I want to understand [specific goal]. Give me the mental model first, then the details.",
        desc: "Get the mental model from Sage",
      },
      {
        moonId: "hawk", moonLabel: "Hawk", icon: Crosshair, color: "#eab308", href: "/hawk",
        prompt: "Find the best 5 free or cheap resources to learn [topic] — include specific courses, YouTube channels, books, and practice projects. I'm a [beginner/intermediate/advanced].",
        desc: "Find the best resources with Hawk",
      },
      {
        moonId: "brainstorm", moonLabel: "Flint", icon: Sparkles, color: "#f59e0b", href: "/brainstorm",
        prompt: "Build me a 30-day study plan for [topic]. I have [X hours/week]. Make it concrete — what to do each week, what to build as a project, and how I'll know I've learned it.",
        desc: "Build your study plan with Flint",
      },
    ],
  },
  {
    id: "contract-review",
    title: "Review & Simplify Any Contract",
    description: "Understand exactly what you're signing — in plain English — and spot the risks.",
    outcome: "Plain-English summary + red flag list",
    tags: ["Legal", "Business"],
    steps: [
      {
        moonId: "legal", moonLabel: "Quill", icon: Scale, color: "#8b5cf6", href: "/legal",
        prompt: "I have a [contract type] I need to sign. Here are the key clauses: [paste relevant sections]. Summarize each clause in plain English and flag anything I should negotiate or refuse.",
        desc: "Decode the contract with Quill",
      },
      {
        moonId: "hawk", moonLabel: "Hawk", icon: Crosshair, color: "#eab308", href: "/hawk",
        prompt: "Find a qualified [type of attorney, e.g. contract/IP/employment] lawyer in [your city or state] who does free consultations, under $300/hour. I need someone who works with small businesses.",
        desc: "Find legal help with Hawk",
      },
    ],
  },
  {
    id: "code-project",
    title: "Go from Idea to Working App",
    description: "Plan, spec, and start building a real software project with AI support at every step.",
    outcome: "Project spec + starter code in Workspace",
    tags: ["Code", "Product", "Dev"],
    steps: [
      {
        moonId: "brainstorm", moonLabel: "Flint", icon: Sparkles, color: "#f59e0b", href: "/brainstorm",
        prompt: "I want to build [your app idea]. Who's the exact user, what's the one core problem it solves, and what's the MVP — the absolute minimum that's still useful?",
        desc: "Define the MVP with Flint",
      },
      {
        moonId: "code-forge", moonLabel: "Flint", icon: Code2, color: "#ef4444", href: "/code-forge",
        prompt: "Write a technical spec for [your app]. Include: tech stack recommendation, data models, API endpoints, and a file/folder structure. Keep it lean for a solo developer.",
        desc: "Write the spec with Code Forge",
      },
      {
        moonId: "code-forge", moonLabel: "Flint", icon: Code2, color: "#ef4444", href: "/code-forge",
        prompt: "Write the starter code for [your app] using [your tech stack from previous step]. Start with the core data model and one working feature. Include setup instructions.",
        desc: "Generate starter code",
      },
    ],
  },
  {
    id: "sourcing",
    title: "Find & Vet a Supplier",
    description: "Source a product or component, find reliable suppliers, and know what to ask before buying.",
    outcome: "Shortlist of vetted suppliers + negotiation script",
    tags: ["Sourcing", "Hardware", "Business"],
    steps: [
      {
        moonId: "hawk", moonLabel: "Hawk", icon: Crosshair, color: "#eab308", href: "/hawk",
        prompt: "I need to source [product/component] for a small business. I need [quantity], budget [your budget], and it needs to meet [your requirements]. Find me 5 real suppliers with names, websites, and notes on each.",
        desc: "Find suppliers with Hawk",
      },
      {
        moonId: "brainstorm", moonLabel: "Flint", icon: Sparkles, color: "#f59e0b", href: "/brainstorm",
        prompt: "I'm about to contact suppliers for [product]. What are the 10 most important questions to ask before placing a first order? What are the red flags that signal a bad supplier?",
        desc: "Prepare your questions with Flint",
      },
    ],
  },
];

function StarterCard({ starter }: { starter: Starter }) {
  const [, navigate] = useLocation();

  function launchStep(step: StarterStep) {
    localStorage.setItem("forge:workspace:pending", JSON.stringify({
      content: step.prompt,
      filename: `${starter.title} — ${step.desc}`,
    }));
    navigate(step.href);
  }

  const firstStep = starter.steps[0];

  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden hover:border-primary/30 transition-colors group">
      <div className="p-5 space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="font-bold text-sm leading-tight">{starter.title}</h3>
            <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{starter.description}</p>
          </div>
        </div>

        <div className="flex flex-wrap gap-1">
          {starter.tags.map(t => (
            <Badge key={t} variant="secondary" className="text-[10px] px-1.5 py-0">{t}</Badge>
          ))}
        </div>

        {/* Steps */}
        <div className="space-y-1.5">
          {starter.steps.map((step, i) => {
            const Icon = step.icon;
            return (
              <div key={i} className="flex items-center gap-2 text-xs text-muted-foreground">
                <div
                  className="w-5 h-5 rounded-full flex items-center justify-center shrink-0"
                  style={{ background: `${step.color}22` }}
                >
                  <Icon size={10} style={{ color: step.color }} />
                </div>
                <span className="flex-1 truncate">{step.desc}</span>
                {i < starter.steps.length - 1 && (
                  <ChevronRight size={10} className="text-muted-foreground/30" />
                )}
              </div>
            );
          })}
        </div>

        <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground/60 pt-1 border-t border-border">
          <span className="font-medium text-primary/70">→ Outcome:</span>
          {starter.outcome}
        </div>
      </div>

      <div className="px-5 pb-4">
        <Button
          className="w-full gap-2 text-sm"
          onClick={() => launchStep(firstStep)}
        >
          Start Now
          <ArrowRight size={14} />
        </Button>
      </div>
    </div>
  );
}

export default function Starters() {
  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div>
        <h1 className="text-3xl font-black tracking-tight">Forge Starters</h1>
        <p className="text-muted-foreground mt-1.5">
          Pre-built Moon workflows. Pick one, start the first step, follow the chain.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
        {STARTERS.map(s => <StarterCard key={s.id} starter={s} />)}
      </div>
    </div>
  );
}
