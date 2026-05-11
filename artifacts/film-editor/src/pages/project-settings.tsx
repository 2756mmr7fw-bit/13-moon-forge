import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useGetFilmProject, useUpdateFilmProject, useDeleteFilmProject, getGetFilmProjectQueryKey, getListFilmProjectsQueryKey, useGetFilmProjectStats, getGetFilmProjectStatsQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useLocation, useParams } from "wouter";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Loader2, Trash2 } from "lucide-react";
import { Link } from "wouter";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const formSchema = z.object({
  title: z.string().min(1, "Title is required").max(100),
  description: z.string().max(500).optional(),
  aspectRatio: z.enum(["16:9", "9:16", "1:1", "4:3", "21:9"]),
  frameRate: z.coerce.number().min(24).max(120),
  status: z.enum(["draft", "in_progress", "complete", "exported"]),
});

type FormValues = z.infer<typeof formSchema>;

function formatDuration(ms: number) {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  if (hours > 0) return `${hours}h ${minutes % 60}m`;
  return `${minutes}m ${seconds % 60}s`;
}

export default function ProjectSettings() {
  const params = useParams();
  const projectId = parseInt(params.id || "0", 10);
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const { data: project, isLoading: isProjectLoading } = useGetFilmProject(projectId, {
    query: { enabled: !!projectId, queryKey: getGetFilmProjectQueryKey(projectId) }
  });

  const { data: stats, isLoading: isStatsLoading } = useGetFilmProjectStats(projectId, {
    query: { enabled: !!projectId, queryKey: getGetFilmProjectStatsQueryKey(projectId) }
  });

  const updateProject = useUpdateFilmProject();
  const deleteProject = useDeleteFilmProject();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: "",
      description: "",
      aspectRatio: "16:9",
      frameRate: 24,
      status: "draft",
    },
  });

  useEffect(() => {
    if (project) {
      form.reset({
        title: project.title,
        description: project.description || "",
        aspectRatio: project.aspectRatio,
        frameRate: project.frameRate,
        status: project.status,
      });
    }
  }, [project, form]);

  function onSubmit(data: FormValues) {
    updateProject.mutate(
      { id: projectId, data },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getGetFilmProjectQueryKey(projectId) });
          queryClient.invalidateQueries({ queryKey: getListFilmProjectsQueryKey() });
          toast({ title: "Settings saved" });
        },
        onError: () => {
          toast({ variant: "destructive", title: "Error", description: "Failed to update project" });
        },
      }
    );
  }

  function handleDelete() {
    deleteProject.mutate(
      { id: projectId },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListFilmProjectsQueryKey() });
          toast({ title: "Project deleted" });
          setLocation("/projects");
        },
        onError: () => {
          toast({ variant: "destructive", title: "Error", description: "Failed to delete project" });
        },
      }
    );
  }

  if (isProjectLoading || isStatsLoading) {
    return <div className="p-8 text-muted-foreground animate-pulse">Loading settings...</div>;
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div>
        <Button variant="ghost" size="sm" asChild className="mb-4 -ml-3 text-muted-foreground">
          <Link href="/projects">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Projects
          </Link>
        </Button>
        <h1 className="text-3xl font-bold tracking-tight text-foreground">Project Settings</h1>
        <p className="text-muted-foreground mt-1">Manage configuration for {project?.title}</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 bg-card/40 border border-border/40 p-8 rounded-xl backdrop-blur-sm">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Project Title</FormLabel>
                    <FormControl>
                      <Input className="bg-background/50" {...field} />
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
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger className="bg-background/50">
                            <SelectValue />
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
                      <Select onValueChange={(v) => field.onChange(parseInt(v, 10))} value={field.value.toString()}>
                        <FormControl>
                          <SelectTrigger className="bg-background/50">
                            <SelectValue />
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
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Status</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger className="bg-background/50 w-full md:w-1/2">
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="draft">Draft</SelectItem>
                        <SelectItem value="in_progress">In Progress</SelectItem>
                        <SelectItem value="complete">Complete</SelectItem>
                        <SelectItem value="exported">Exported</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="pt-4 flex justify-between items-center border-t border-border/40 mt-8">
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="destructive" type="button">
                      <Trash2 className="w-4 h-4 mr-2" />
                      Delete Project
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This action cannot be undone. This will permanently delete your film project
                        and remove all associated clips and data from our servers.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                        Delete Project
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>

                <Button type="submit" disabled={updateProject.isPending} size="lg">
                  {updateProject.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    "Save Settings"
                  )}
                </Button>
              </div>
            </form>
          </Form>
        </div>

        <div className="space-y-6">
          <Card className="bg-card/40 border-border/40">
            <CardHeader>
              <CardTitle className="text-lg">Project Stats</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground text-sm">Total Duration</span>
                <span className="font-medium">{stats ? formatDuration(stats.totalDurationMs) : '0s'}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground text-sm">Total Clips</span>
                <span className="font-medium">{stats?.clipCount || 0}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground text-sm">Video Clips</span>
                <span className="font-medium">{stats?.videoClips || 0}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground text-sm">Audio Clips</span>
                <span className="font-medium">{stats?.audioClips || 0}</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
