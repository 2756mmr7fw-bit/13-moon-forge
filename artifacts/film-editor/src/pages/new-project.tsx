import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useCreateFilmProject, getListFilmProjectsQueryKey, getGetRecentFilmProjectsQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Loader2 } from "lucide-react";
import { Link } from "wouter";

const formSchema = z.object({
  title: z.string().min(1, "Title is required").max(100),
  description: z.string().max(500).optional(),
  aspectRatio: z.enum(["16:9", "9:16", "1:1", "4:3", "21:9"]),
  frameRate: z.coerce.number().min(24).max(120),
});

type FormValues = z.infer<typeof formSchema>;

export default function NewProject() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const createProject = useCreateFilmProject();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: "Untitled Project",
      description: "",
      aspectRatio: "16:9",
      frameRate: 24,
    },
  });

  function onSubmit(data: FormValues) {
    createProject.mutate(
      { data },
      {
        onSuccess: (project) => {
          queryClient.invalidateQueries({ queryKey: getListFilmProjectsQueryKey() });
          queryClient.invalidateQueries({ queryKey: getGetRecentFilmProjectsQueryKey() });
          toast({
            title: "Project created",
            description: "Opening editor...",
          });
          setLocation(`/projects/${project.id}`);
        },
        onError: () => {
          toast({
            variant: "destructive",
            title: "Error",
            description: "Failed to create project",
          });
        },
      }
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      <div>
        <Button variant="ghost" size="sm" asChild className="mb-4 -ml-3 text-muted-foreground">
          <Link href="/projects">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Projects
          </Link>
        </Button>
        <h1 className="text-3xl font-bold tracking-tight text-foreground">New Project</h1>
        <p className="text-muted-foreground mt-1">Set up your new film project</p>
      </div>

      <div className="bg-card/40 border border-border/40 p-8 rounded-xl backdrop-blur-sm">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Project Title</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g. Summer Documentary" className="bg-background/50" {...field} />
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
                      placeholder="Brief description of the project" 
                      className="resize-none bg-background/50 h-24"
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FormField
                control={form.control}
                name="aspectRatio"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Aspect Ratio</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger className="bg-background/50">
                          <SelectValue placeholder="Select aspect ratio" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="16:9">16:9 (Standard Widescreen)</SelectItem>
                        <SelectItem value="9:16">9:16 (Vertical / Mobile)</SelectItem>
                        <SelectItem value="21:9">21:9 (Cinematic Ultrawide)</SelectItem>
                        <SelectItem value="1:1">1:1 (Square)</SelectItem>
                        <SelectItem value="4:3">4:3 (Classic)</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormDescription>Determines the final export dimensions.</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="frameRate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Frame Rate (FPS)</FormLabel>
                    <Select onValueChange={(v) => field.onChange(parseInt(v, 10))} defaultValue={field.value.toString()}>
                      <FormControl>
                        <SelectTrigger className="bg-background/50">
                          <SelectValue placeholder="Select frame rate" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="24">24 (Cinematic standard)</SelectItem>
                        <SelectItem value="25">25 (PAL standard)</SelectItem>
                        <SelectItem value="30">30 (Broadcast standard)</SelectItem>
                        <SelectItem value="50">50 (High frame rate PAL)</SelectItem>
                        <SelectItem value="60">60 (High frame rate)</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormDescription>The timeline playback speed.</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="pt-4 flex justify-end">
              <Button type="submit" disabled={createProject.isPending} size="lg" className="w-full md:w-auto">
                {createProject.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating...
                  </>
                ) : (
                  "Create Project"
                )}
              </Button>
            </div>
          </form>
        </Form>
      </div>
    </div>
  );
}
