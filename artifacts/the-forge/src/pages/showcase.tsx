import { useMemo, useState } from "react";
import { Sparkles, Globe, MonitorSmartphone, Plus, LayoutTemplate, Server, Megaphone } from "lucide-react";
import { useListShowcaseApps, getListShowcaseAppsQueryKey, useSubmitShowcaseApp } from "@workspace/api-client-react";
import type { ShowcaseApp, ShowcaseSubmission } from "@workspace/api-client-react/src/generated/api.schemas";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";

const formSchema = z.object({
  name: z.string().min(2, "App name is required").max(50),
  tagline: z.string().min(5, "Tagline is required").max(100),
  description: z.string().min(10, "Description is required").max(1000),
  websiteUrl: z.string().url("Must be a valid URL").optional().or(z.literal("")),
  iosUrl: z.string().url("Must be a valid URL").optional().or(z.literal("")),
  androidUrl: z.string().url("Must be a valid URL").optional().or(z.literal("")),
  logoUrl: z.string().url("Must be a valid URL").optional().or(z.literal("")),
  screenshotUrl: z.string().url("Must be a valid URL").optional().or(z.literal("")),
  category: z.string().min(1, "Category is required"),
  listingType: z.enum(["advertise", "hosted"]).default("advertise"),
  builderName: z.string().min(2, "Builder name is required").max(50),
});

export default function ShowcasePage() {
  const { data: apps, isLoading } = useListShowcaseApps();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [isSubmitOpen, setIsSubmitOpen] = useState(false);

  const submitMutation = useSubmitShowcaseApp();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      tagline: "",
      description: "",
      websiteUrl: "",
      iosUrl: "",
      androidUrl: "",
      logoUrl: "",
      screenshotUrl: "",
      category: "",
      listingType: "advertise",
      builderName: "",
    },
  });

  const onSubmit = (values: z.infer<typeof formSchema>) => {
    submitMutation.mutate(
      { data: values as ShowcaseSubmission },
      {
        onSuccess: () => {
          toast({
            title: "App Submitted",
            description: "Your app has been submitted for review. We'll approve it shortly.",
          });
          queryClient.invalidateQueries({ queryKey: getListShowcaseAppsQueryKey() });
          setIsSubmitOpen(false);
          form.reset();
        },
        onError: () => {
          toast({
            title: "Submission Failed",
            description: "There was an error submitting your app. Please try again.",
            variant: "destructive",
          });
        },
      }
    );
  };

  const featured = apps?.featured ?? [];
  const rawCommunity = apps?.community ?? [];

  const community = useMemo(() => {
    return [...rawCommunity].sort(() => Math.random() - 0.5);
  }, [rawCommunity]);

  return (
    <div className="space-y-16 pb-24 max-w-5xl mx-auto">

      {/* Hero */}
      <section className="text-center space-y-6 pt-12 pb-4 px-4">
        <div className="inline-flex items-center justify-center p-3 bg-primary/10 rounded-2xl mb-2">
          <Sparkles className="w-8 h-8 text-primary" />
        </div>
        <h1 className="text-4xl md:text-5xl font-serif font-bold tracking-tight">
          The Forge Showcase
        </h1>
        <p className="text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
          A public bulletin board for apps built and broadcast by Forge builders.
          No algorithm, no pay-to-play ranking — every app gets its fair shot on the town square board.
        </p>

        {/* Tier cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-2xl mx-auto pt-2 text-left">
          <div className="bg-card border rounded-2xl p-5 space-y-2">
            <div className="flex items-center gap-2 font-semibold text-sm">
              <Megaphone className="w-4 h-4 text-primary" />
              Advertise Only
            </div>
            <p className="text-sm text-muted-foreground">
              List your app on the Showcase board. Bring your own hosting — we just broadcast your link to the community.
            </p>
          </div>
          <div className="bg-card border border-primary/30 rounded-2xl p-5 space-y-2">
            <div className="flex items-center gap-2 font-semibold text-sm">
              <Server className="w-4 h-4 text-primary" />
              Host + Advertise
            </div>
            <p className="text-sm text-muted-foreground">
              Host your app on Forge infrastructure and get automatic Showcase placement. Same price, everything included.
            </p>
          </div>
        </div>

        <div className="pt-4">
          <Dialog open={isSubmitOpen} onOpenChange={setIsSubmitOpen}>
            <DialogTrigger asChild>
              <Button size="lg" className="rounded-full px-8 shadow-md">
                <Plus className="w-4 h-4 mr-2" />
                Submit Your App
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[620px] max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Submit to the Showcase</DialogTitle>
                <DialogDescription>
                  Choose whether you want to advertise your app, or host it with Forge and get automatic listing. Both tiers are the same price.
                </DialogDescription>
              </DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5 pt-4">

                  {/* Listing type */}
                  <FormField
                    control={form.control}
                    name="listingType"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Listing Type</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Choose a tier" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="advertise">Advertise Only — broadcast my app, I host it myself</SelectItem>
                            <SelectItem value="hosted">Host + Advertise — host on Forge infrastructure</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>App Name</FormLabel>
                          <FormControl>
                            <Input placeholder="My Awesome App" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="category"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Category</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select a category" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="productivity">Productivity</SelectItem>
                              <SelectItem value="social">Social</SelectItem>
                              <SelectItem value="media">Media</SelectItem>
                              <SelectItem value="education">Education</SelectItem>
                              <SelectItem value="tools">Tools</SelectItem>
                              <SelectItem value="games">Games</SelectItem>
                              <SelectItem value="finance">Finance</SelectItem>
                              <SelectItem value="health">Health</SelectItem>
                              <SelectItem value="creative">Creative</SelectItem>
                              <SelectItem value="other">Other</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="tagline"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Tagline</FormLabel>
                        <FormControl>
                          <Input placeholder="A short, catchy description" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Description</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="What does your app do? Who is it for?"
                            className="min-h-[90px]"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="builderName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Your Name / Studio</FormLabel>
                          <FormControl>
                            <Input placeholder="Jane Doe" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="websiteUrl"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Website URL (optional)</FormLabel>
                          <FormControl>
                            <Input placeholder="https://..." {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="iosUrl"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>iOS App Store URL (optional)</FormLabel>
                          <FormControl>
                            <Input placeholder="https://apps.apple.com/..." {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="androidUrl"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Play Store URL (optional)</FormLabel>
                          <FormControl>
                            <Input placeholder="https://play.google.com/..." {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="logoUrl"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Logo URL (optional)</FormLabel>
                          <FormControl>
                            <Input placeholder="https://..." {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="screenshotUrl"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Screenshot URL (optional)</FormLabel>
                          <FormControl>
                            <Input placeholder="https://..." {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="pt-4 flex justify-end gap-3 border-t">
                    <Button variant="ghost" type="button" onClick={() => setIsSubmitOpen(false)}>
                      Cancel
                    </Button>
                    <Button type="submit" disabled={submitMutation.isPending}>
                      {submitMutation.isPending ? "Submitting..." : "Submit App"}
                    </Button>
                  </div>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>
      </section>

      {/* The Forge & 13 Moons — always pinned at the top */}
      <section className="space-y-6">
        <div className="flex items-center gap-3 px-2 border-b pb-3">
          <div className="w-8 h-8 rounded-full bg-primary/15 flex items-center justify-center">
            <Sparkles className="w-4 h-4 text-primary" />
          </div>
          <div>
            <h2 className="text-2xl font-serif font-bold leading-tight">The Forge &amp; 13 Moons</h2>
            <p className="text-xs text-muted-foreground mt-0.5">Our family of apps — always here</p>
          </div>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-56 bg-card rounded-2xl border animate-pulse" />
            ))}
          </div>
        ) : featured.length === 0 ? (
          <div className="text-center py-12 bg-card/50 rounded-2xl border border-dashed">
            <Sparkles className="w-8 h-8 mx-auto text-muted-foreground mb-3 opacity-50" />
            <p className="text-muted-foreground">Featured apps will appear here.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {featured.map((app) => (
              <AppCard key={app.id} app={app} variant="featured" />
            ))}
          </div>
        )}
      </section>

      {/* Community Board */}
      <section className="space-y-6">
        <div className="flex items-center gap-3 px-2 border-b pb-3">
          <div className="w-8 h-8 rounded-full bg-secondary/50 flex items-center justify-center">
            <LayoutTemplate className="w-4 h-4 text-secondary-foreground" />
          </div>
          <div>
            <h2 className="text-2xl font-serif font-bold leading-tight">Community Board</h2>
            <p className="text-xs text-muted-foreground mt-0.5">Shuffled fresh on every visit — no ranking, no favourites</p>
          </div>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="h-56 bg-card rounded-xl border animate-pulse" />
            ))}
          </div>
        ) : community.length === 0 ? (
          <div className="text-center py-20 bg-card rounded-2xl border border-dashed">
            <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
              <Globe className="w-8 h-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-medium mb-2">No community apps yet</h3>
            <p className="text-muted-foreground max-w-md mx-auto mb-6">
              Be the first builder to claim your spot on the town square board.
            </p>
            <Button onClick={() => setIsSubmitOpen(true)} variant="outline" className="rounded-full">
              Submit Your App
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {community.map((app) => (
              <AppCard key={app.id} app={app} variant="community" />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function AppCard({ app, variant }: { app: ShowcaseApp; variant: "featured" | "community" }) {
  const getInitials = (name: string) => name.substring(0, 2).toUpperCase();
  const isFeatured = variant === "featured";

  return (
    <div className={`flex flex-col group overflow-hidden rounded-2xl border transition-all duration-300 hover:shadow-lg ${
      isFeatured
        ? "bg-card border-primary/30 shadow-md hover:border-primary/60"
        : "bg-card/50 hover:bg-card hover:border-border/80"
    }`}>
      {app.screenshotUrl && (
        <div className="h-36 w-full overflow-hidden border-b bg-muted relative">
          <img
            src={app.screenshotUrl}
            alt={`Screenshot of ${app.name}`}
            className="w-full h-full object-cover object-top transition-transform duration-700 group-hover:scale-105"
            onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
        </div>
      )}

      <div className="p-5 flex-1 flex flex-col">
        <div className="flex items-start gap-3 mb-3">
          <div className={`shrink-0 w-12 h-12 rounded-xl overflow-hidden border flex items-center justify-center ${
            app.logoUrl ? "bg-white" : "bg-muted"
          }`}>
            {app.logoUrl ? (
              <img
                src={app.logoUrl}
                alt={`${app.name} logo`}
                className="w-full h-full object-cover"
                onError={(e) => {
                  const t = e.target as HTMLElement;
                  t.style.display = "none";
                  (t.nextElementSibling as HTMLElement | null)?.style.setProperty("display", "flex");
                }}
              />
            ) : null}
            <div className={`w-full h-full flex items-center justify-center font-bold text-base text-muted-foreground ${app.logoUrl ? "hidden" : "flex"}`}>
              {getInitials(app.name)}
            </div>
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <h3 className="font-semibold text-base truncate text-foreground leading-snug">{app.name}</h3>
              <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium uppercase tracking-wider shrink-0 ${
                isFeatured ? "bg-primary/20 text-primary" : "bg-secondary text-secondary-foreground"
              }`}>
                {app.category}
              </span>
            </div>
            <p className="text-xs text-foreground/70 mt-0.5 line-clamp-1">{app.tagline}</p>
          </div>
        </div>

        <p className="text-sm text-muted-foreground leading-relaxed flex-1 line-clamp-3 mb-4">
          {app.description}
        </p>

        <div className="mt-auto pt-3 border-t flex flex-wrap items-center justify-between gap-y-2">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded-full bg-muted flex items-center justify-center text-[9px] font-medium text-muted-foreground">
              {app.builderName ? getInitials(app.builderName) : "??"}
            </div>
            <span className="text-xs text-muted-foreground">{app.builderName ?? "Anonymous"}</span>
            {app.listingType === "hosted" && (
              <Badge variant="secondary" className="text-[9px] px-1.5 py-0 h-4 font-medium">
                Hosted
              </Badge>
            )}
          </div>

          <div className="flex items-center gap-1">
            {app.websiteUrl && (
              <a
                href={app.websiteUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="p-1.5 bg-secondary hover:bg-secondary/80 rounded-md transition-colors text-secondary-foreground inline-flex items-center"
                title="Visit Website"
              >
                <Globe className="w-3.5 h-3.5" />
              </a>
            )}
            {app.iosUrl && (
              <a
                href={app.iosUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="p-1.5 bg-secondary hover:bg-secondary/80 rounded-md transition-colors text-secondary-foreground inline-flex items-center"
                title="iOS App Store"
              >
                <MonitorSmartphone className="w-3.5 h-3.5" />
              </a>
            )}
            {app.androidUrl && (
              <a
                href={app.androidUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="p-1.5 bg-secondary hover:bg-secondary/80 rounded-md transition-colors text-secondary-foreground inline-flex items-center"
                title="Google Play Store"
              >
                <MonitorSmartphone className="w-3.5 h-3.5" />
              </a>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
