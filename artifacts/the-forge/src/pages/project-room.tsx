import { useState } from "react";
import { Link } from "wouter";
import {
  Layers, Plus, Trash2, ChevronRight, Clock, DollarSign,
  Compass, Eye, PenLine, Receipt, Dumbbell, Megaphone, Flame,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { useProjects, useLedger } from "@/hooks/use-projects";
import type { MoonKey, Project } from "@/hooks/use-projects";

// ── Moon definitions ──────────────────────────────────────────────────────────

const MOONS: { id: MoonKey; name: string; moon: string; icon: string; color: string; href: string; description: string }[] = [
  { id: "forge",  name: "Forge",  moon: "Worm Moon",     icon: "🔥", color: "text-orange-400",  href: "/forge-coder",  description: "The builder — writes complete code for anything you describe" },
  { id: "sage",   name: "Sage",   moon: "Buck Moon",     icon: "🌿", color: "text-emerald-400", href: "/moons/sage",   description: "The planner — figures out what you're actually building and why" },
  { id: "scout",  name: "Scout",  moon: "Hunter's Moon", icon: "🦅", color: "text-amber-400",   href: "/moons/scout",  description: "The researcher — finds what already exists before you build it" },
  { id: "quill",  name: "Quill",  moon: "Flower Moon",   icon: "🪶", color: "text-purple-400",  href: "/moons/quill",  description: "The writer — names, copy, pitches, docs, brainstorms" },
  { id: "ledger", name: "Ledger", moon: "Pink Moon",     icon: "📒", color: "text-blue-400",    href: "/moons/ledger", description: "The tracker — time and money, always visible, never a surprise" },
  { id: "grit",   name: "Grit",   moon: "Harvest Moon",  icon: "💪", color: "text-red-400",     href: "/moons/grit",   description: "The push — gets you moving again when you've hit the wall" },
  { id: "herald", name: "Herald", moon: "Beaver Moon",   icon: "📣", color: "text-yellow-400",  href: "/moons/herald", description: "The launcher — plans and executes the moment your work goes live" },
];

const MOON_MAP = Object.fromEntries(MOONS.map(m => [m.id, m]));

const PHASE_LABELS: Record<Project["phase"], string> = {
  planning: "Planning", building: "Building", testing: "Testing", launched: "Launched",
};

const PHASE_COLORS: Record<Project["phase"], string> = {
  planning: "bg-blue-500/10 text-blue-400 border-blue-500/30",
  building: "bg-orange-500/10 text-orange-400 border-orange-500/30",
  testing: "bg-yellow-500/10 text-yellow-400 border-yellow-500/30",
  launched: "bg-emerald-500/10 text-emerald-400 border-emerald-500/30",
};

const DEFAULT_CREW: MoonKey[] = ["sage", "forge", "scout", "quill", "ledger"];

// ── New Project Form ──────────────────────────────────────────────────────────

function NewProjectForm({ onDone }: { onDone: () => void }) {
  const { createProject } = useProjects();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [crew, setCrew] = useState<MoonKey[]>(DEFAULT_CREW);

  const toggle = (id: MoonKey) =>
    setCrew(c => c.includes(id) ? c.filter(m => m !== id) : [...c, id]);

  const submit = () => {
    if (!name.trim()) return;
    createProject(name.trim(), description.trim(), crew);
    onDone();
  };

  return (
    <div className="space-y-5">
      <div className="space-y-2">
        <label className="text-sm font-medium">Project name</label>
        <Input
          value={name}
          onChange={e => setName(e.target.value)}
          placeholder="What are you building?"
          autoFocus
        />
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium">What is this project? <span className="text-muted-foreground font-normal">(optional)</span></label>
        <Textarea
          value={description}
          onChange={e => setDescription(e.target.value)}
          placeholder="Brief description — one or two sentences is plenty"
          rows={2}
          className="resize-none"
        />
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium">Assemble your crew</label>
        <p className="text-xs text-muted-foreground">Pick the moons you'll need. You can change this later.</p>
        <div className="grid grid-cols-2 gap-2">
          {MOONS.map(moon => (
            <button
              key={moon.id}
              onClick={() => toggle(moon.id)}
              className={cn(
                "flex items-center gap-2 px-3 py-2 rounded-lg border text-left text-sm transition-all",
                crew.includes(moon.id)
                  ? "border-primary/50 bg-primary/10 text-foreground"
                  : "border-border text-muted-foreground hover:border-border/80 hover:text-foreground"
              )}
            >
              <span className="text-base">{moon.icon}</span>
              <div>
                <div className={cn("font-medium text-xs", crew.includes(moon.id) && moon.color)}>{moon.name}</div>
                <div className="text-[10px] text-muted-foreground">{moon.moon}</div>
              </div>
            </button>
          ))}
        </div>
      </div>

      <div className="flex gap-3">
        <Button onClick={submit} disabled={!name.trim()} className="flex-1">
          <Plus size={16} className="mr-2" /> Create project
        </Button>
        <Button variant="ghost" onClick={onDone}>Cancel</Button>
      </div>
    </div>
  );
}

// ── Project Card ──────────────────────────────────────────────────────────────

function ProjectCard({ project, onDelete }: { project: Project; onDelete: () => void }) {
  const { entries, totalTime, totalCost } = useLedger(project.id);

  return (
    <div className="border border-border rounded-xl p-5 hover:border-primary/30 transition-all group bg-card/50 space-y-4">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold truncate">{project.name}</h3>
          {project.description && (
            <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{project.description}</p>
          )}
        </div>
        <span className={cn("text-[10px] px-2 py-0.5 rounded-full border font-medium shrink-0", PHASE_COLORS[project.phase])}>
          {PHASE_LABELS[project.phase]}
        </span>
      </div>

      {/* Crew */}
      <div className="flex flex-wrap gap-1.5">
        {project.crew.map(id => {
          const moon = MOON_MAP[id];
          if (!moon) return null;
          return (
            <Link key={id} href={moon.href}>
              <span
                title={`${moon.name} — ${moon.description}`}
                className={cn(
                  "inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full border cursor-pointer",
                  "border-border hover:border-primary/40 bg-muted/50 hover:bg-muted transition-colors",
                )}
              >
                {moon.icon} {moon.name}
              </span>
            </Link>
          );
        })}
      </div>

      {/* Stats */}
      {entries.length > 0 && (
        <div className="flex gap-4 text-xs text-muted-foreground">
          {totalTime > 0 && (
            <span className="flex items-center gap-1">
              <Clock size={11} /> {totalTime}h logged
            </span>
          )}
          {totalCost > 0 && (
            <span className="flex items-center gap-1">
              <DollarSign size={11} /> ${totalCost.toFixed(2)} spent
            </span>
          )}
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center justify-between pt-1">
        <Link href={`/moons/sage?project=${project.id}`}>
          <Button size="sm" variant="secondary" className="text-xs gap-1.5">
            Open in Sage <ChevronRight size={12} />
          </Button>
        </Link>
        <button
          onClick={e => { e.stopPropagation(); onDelete(); }}
          className="opacity-0 group-hover:opacity-100 p-1.5 rounded hover:bg-destructive/10 hover:text-destructive transition-all"
          title="Delete project"
        >
          <Trash2 size={13} />
        </button>
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function ProjectRoom() {
  const { projects, deleteProject } = useProjects();
  const [creating, setCreating] = useState(false);

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center">
              <Layers size={20} className="text-primary" />
            </div>
            <h1 className="text-2xl font-bold">The Project Room</h1>
          </div>
          <p className="text-muted-foreground text-sm">
            Your projects. Your crew. Build the right thing with the right moons.
          </p>
        </div>
        <Button onClick={() => setCreating(true)} className="shrink-0 gap-2">
          <Plus size={16} /> New Project
        </Button>
      </div>

      {/* New project form */}
      {creating && (
        <div className="border border-primary/30 bg-primary/5 rounded-xl p-6">
          <h2 className="font-semibold mb-4">Start a new project</h2>
          <NewProjectForm onDone={() => setCreating(false)} />
        </div>
      )}

      {/* The Moons roster */}
      <div>
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-widest mb-3">The Moons</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
          {MOONS.map(moon => (
            <Link key={moon.id} href={moon.href}>
              <div className="border border-border rounded-xl p-4 hover:border-primary/30 transition-all cursor-pointer bg-card/30 hover:bg-card/60 space-y-2">
                <div className="flex items-center gap-2">
                  <span className="text-2xl">{moon.icon}</span>
                  <div>
                    <div className={cn("font-semibold text-sm", moon.color)}>{moon.name}</div>
                    <div className="text-[10px] text-muted-foreground">{moon.moon}</div>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">{moon.description}</p>
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* Projects */}
      <div>
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-widest mb-3">
          Your Projects {projects.length > 0 && <span className="normal-case font-normal">({projects.length})</span>}
        </h2>

        {projects.length === 0 ? (
          <div className="border border-dashed border-border rounded-xl p-12 text-center space-y-3">
            <p className="text-2xl">🌑</p>
            <p className="font-medium">No projects yet</p>
            <p className="text-sm text-muted-foreground max-w-sm mx-auto">
              Create a project to keep your moons working as a team — shared context, shared memory, shared history.
            </p>
            <Button variant="secondary" onClick={() => setCreating(true)} className="gap-2 mt-2">
              <Plus size={15} /> Start your first project
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {projects.map(p => (
              <ProjectCard key={p.id} project={p} onDelete={() => deleteProject(p.id)} />
            ))}
          </div>
        )}
      </div>

      {/* How it works */}
      <div className="border border-border/50 rounded-xl p-6 bg-muted/20">
        <h2 className="font-semibold mb-3">How the crew works</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm text-muted-foreground">
          {[
            { icon: "🌿", title: "Monday morning — Sage", body: "Before you touch a line of code, sit with Sage. What are you building this week, why, and what would make it a win?" },
            { icon: "🦅", title: "Research first — Scout", body: "Before you build something, send Scout to find out what already exists. Avoid the traps others already fell into." },
            { icon: "🔥", title: "Tuesday–Friday — Forge", body: "Once the plan is clear and the research is done, Forge builds. Complete code, narrated in real time." },
            { icon: "📒", title: "Friday — Ledger", body: "15 minutes. What did this week cost in time and money? Invisible bleeding kills projects. Ledger keeps it visible." },
          ].map((s, i) => (
            <div key={i} className="flex gap-3">
              <span className="text-xl shrink-0">{s.icon}</span>
              <div>
                <div className="font-medium text-foreground text-sm">{s.title}</div>
                <div className="text-xs mt-0.5">{s.body}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
