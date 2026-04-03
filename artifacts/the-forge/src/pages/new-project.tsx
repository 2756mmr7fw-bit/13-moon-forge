import { useState } from "react";
import { useLocation } from "wouter";
import { useCreateProject, useCreatePage, getListProjectsQueryKey, getGetDashboardSummaryQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { Anvil, Hammer, Briefcase, FileText, ShoppingCart, Rocket, Loader2, Plus, X, ArrowRight, ArrowLeft, Flame } from "lucide-react";

const templates = [
  { 
    id: "portfolio", name: "Portfolio", icon: Briefcase,
    description: "Showcase your work to the world.",
    defaultPages: ["Home", "Work", "About", "Contact"]
  },
  { 
    id: "business", name: "Business", icon: Hammer,
    description: "A solid foundation for your company.",
    defaultPages: ["Home", "Services", "About", "Contact"]
  },
  { 
    id: "blog", name: "Blog", icon: FileText,
    description: "Chronicle your thoughts and ideas.",
    defaultPages: ["Home", "Articles", "About", "Contact"]
  },
  { 
    id: "landing", name: "Landing Page", icon: Rocket,
    description: "One powerful page. One clear goal.",
    defaultPages: ["Home"]
  },
  { 
    id: "ecommerce", name: "E-Commerce", icon: ShoppingCart,
    description: "Sell your products to the world.",
    defaultPages: ["Home", "Products", "About", "Contact"]
  },
];

const slugify = (text: string) =>
  text.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

type Step = 1 | 2 | 3;

export default function NewProject() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [step, setStep] = useState<Step>(1);
  const [name, setName] = useState("");
  const [template, setTemplate] = useState("portfolio");
  const [pages, setPages] = useState<string[]>(["Home", "Work", "About", "Contact"]);
  const [newPage, setNewPage] = useState("");
  const [brief, setBrief] = useState("");

  const createProject = useCreateProject();
  const createPage = useCreatePage();

  const selectedTemplate = templates.find(t => t.id === template)!;

  const handleTemplateSelect = (id: string) => {
    setTemplate(id);
    const t = templates.find(t => t.id === id)!;
    setPages([...t.defaultPages]);
  };

  const handleAddPage = () => {
    const trimmed = newPage.trim();
    if (trimmed && !pages.includes(trimmed)) {
      setPages([...pages, trimmed]);
      setNewPage("");
    }
  };

  const handleRemovePage = (page: string) => {
    if (pages.length > 1) setPages(pages.filter(p => p !== page));
  };

  const handleSubmit = async () => {
    if (!name.trim()) return;

    try {
      const project = await new Promise<{ id: number }>((resolve, reject) => {
        createProject.mutate(
          { data: { name: name.trim(), description: brief.trim() || undefined, template } },
          { onSuccess: resolve, onError: reject }
        );
      });

      await Promise.all(
        pages.map((title, i) =>
          new Promise<void>((resolve, reject) => {
            createPage.mutate(
              { id: project.id, data: { title, slug: slugify(title), content: "", order: i } },
              { onSuccess: () => resolve(), onError: reject }
            );
          })
        )
      );

      queryClient.invalidateQueries({ queryKey: getListProjectsQueryKey() });
      queryClient.invalidateQueries({ queryKey: getGetDashboardSummaryQueryKey() });

      toast({ title: "Project forged!", description: `${name} is ready. Now describe it to Forge.` });
      setLocation(`/projects/${project.id}`);
    } catch {
      toast({ variant: "destructive", title: "Failed", description: "Something went wrong. Try again." });
    }
  };

  const isSubmitting = createProject.isPending || createPage.isPending;

  return (
    <div className="max-w-2xl mx-auto animate-in slide-in-from-bottom-4 duration-500">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 bg-primary/15 rounded-lg">
            <Anvil className="w-6 h-6 text-primary" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight">New Project</h1>
        </div>
        <p className="text-muted-foreground ml-[52px]">
          {step === 1 && "Name your creation and choose its form."}
          {step === 2 && "What pages will your site contain?"}
          {step === 3 && "Describe your vision — Forge will be waiting."}
        </p>
      </div>

      {/* Step indicator */}
      <div className="flex items-center gap-2 mb-8">
        {([1, 2, 3] as Step[]).map((s) => (
          <div key={s} className="flex items-center gap-2">
            <div className={cn(
              "w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold transition-colors",
              step === s ? "bg-primary text-primary-foreground" :
              step > s ? "bg-primary/30 text-primary" : "bg-muted text-muted-foreground"
            )}>
              {step > s ? "✓" : s}
            </div>
            {s < 3 && <div className={cn("h-px w-12 transition-colors", step > s ? "bg-primary/50" : "bg-border")} />}
          </div>
        ))}
        <span className="ml-2 text-sm text-muted-foreground">
          {step === 1 && "Template & Name"}
          {step === 2 && "Pages"}
          {step === 3 && "Site Brief"}
        </span>
      </div>

      {/* Step 1: Template + Name */}
      {step === 1 && (
        <div className="space-y-6 animate-in fade-in duration-300">
          <div className="space-y-2">
            <label className="text-sm font-medium">Project Name</label>
            <Input
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="e.g. Ember Studio, The Grand Emporium…"
              className="text-lg py-6 bg-card border-border"
              autoFocus
              onKeyDown={e => e.key === "Enter" && name.trim().length >= 2 && setStep(2)}
            />
          </div>

          <div className="space-y-3">
            <label className="text-sm font-medium">Template</label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {templates.map((t) => (
                <button
                  key={t.id}
                  onClick={() => handleTemplateSelect(t.id)}
                  className={cn(
                    "flex items-start gap-4 p-4 rounded-xl border-2 text-left transition-all",
                    template === t.id
                      ? "border-primary bg-primary/5 shadow-[0_0_20px_rgba(255,100,0,0.1)]"
                      : "border-border bg-card hover:border-primary/40"
                  )}
                >
                  <div className={cn(
                    "p-2.5 rounded-lg shrink-0",
                    template === t.id ? "bg-primary/20 text-primary" : "bg-muted text-muted-foreground"
                  )}>
                    <t.icon className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="font-semibold">{t.name}</div>
                    <div className="text-xs text-muted-foreground mt-0.5">{t.description}</div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <Button
              onClick={() => setStep(2)}
              disabled={name.trim().length < 2}
              className="bg-primary text-primary-foreground"
            >
              Next <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </div>
        </div>
      )}

      {/* Step 2: Pages */}
      {step === 2 && (
        <div className="space-y-6 animate-in fade-in duration-300">
          <div className="bg-card border border-border rounded-xl p-5 space-y-3">
            <div className="flex items-center justify-between mb-1">
              <span className="text-sm font-medium text-muted-foreground">Pages for {name}</span>
              <span className="text-xs text-muted-foreground">{pages.length} page{pages.length !== 1 ? "s" : ""}</span>
            </div>
            <div className="space-y-2">
              {pages.map((page) => (
                <div key={page} className="flex items-center justify-between bg-background rounded-lg px-3 py-2.5 border border-border group">
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-muted-foreground" />
                    <span className="font-medium">{page}</span>
                    <span className="text-xs text-muted-foreground font-mono">/{slugify(page)}</span>
                  </div>
                  <button
                    onClick={() => handleRemovePage(page)}
                    disabled={pages.length === 1}
                    className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive disabled:opacity-20 disabled:cursor-not-allowed"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
            <div className="flex gap-2 pt-1">
              <Input
                value={newPage}
                onChange={e => setNewPage(e.target.value)}
                placeholder="Add a page…"
                className="bg-background border-border"
                onKeyDown={e => e.key === "Enter" && handleAddPage()}
              />
              <Button variant="outline" size="icon" onClick={handleAddPage} disabled={!newPage.trim()}>
                <Plus className="w-4 h-4" />
              </Button>
            </div>
          </div>

          <p className="text-sm text-muted-foreground">
            These pages will be created in your project. Forge will generate content for each one.
          </p>

          <div className="flex justify-between pt-2">
            <Button variant="ghost" onClick={() => setStep(1)}>
              <ArrowLeft className="w-4 h-4 mr-2" /> Back
            </Button>
            <Button onClick={() => setStep(3)} className="bg-primary text-primary-foreground">
              Next <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </div>
        </div>
      )}

      {/* Step 3: Brief */}
      {step === 3 && (
        <div className="space-y-6 animate-in fade-in duration-300">
          <div className="rounded-xl border border-primary/30 bg-gradient-to-br from-primary/5 via-card to-card p-5">
            <div className="flex items-start gap-3 mb-4">
              <div className="p-2 bg-primary/15 rounded-lg shrink-0">
                <Flame className="w-4 h-4 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold">Site Brief for Forge</h3>
                <p className="text-sm text-muted-foreground mt-0.5">
                  Describe your site — purpose, audience, style, feel. The more vivid, the better Forge crafts it. You can also skip this and describe it on the project page.
                </p>
              </div>
            </div>
            <Textarea
              value={brief}
              onChange={e => setBrief(e.target.value)}
              placeholder={`Describe your ${selectedTemplate.name.toLowerCase()} — what it's for, who it's for, what feel you want. E.g. "A bold, dark portfolio for a motion designer targeting Netflix and Apple. Minimal text, visuals first, brutalist grid layout, deep navy and electric orange palette."`}
              className="min-h-[140px] bg-background/60 border-border resize-none"
              autoFocus
            />
          </div>

          <div className="bg-card border border-border rounded-xl p-4">
            <h4 className="text-sm font-medium mb-3 text-muted-foreground">Summary</h4>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Name</span>
                <span className="font-medium">{name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Template</span>
                <span className="font-medium capitalize">{template}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Pages</span>
                <span className="font-medium">{pages.join(", ")}</span>
              </div>
            </div>
          </div>

          <div className="flex justify-between pt-2">
            <Button variant="ghost" onClick={() => setStep(2)}>
              <ArrowLeft className="w-4 h-4 mr-2" /> Back
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="bg-primary text-primary-foreground min-w-[160px]"
            >
              {isSubmitting ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Creating…</>
              ) : (
                <><Hammer className="w-4 h-4 mr-2" /> Create Project</>
              )}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
