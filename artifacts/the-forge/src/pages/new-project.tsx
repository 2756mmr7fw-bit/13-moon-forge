import { useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useCreateProject, getListProjectsQueryKey, getGetDashboardSummaryQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Anvil, Hammer, LayoutTemplate, Briefcase, FileText, ShoppingCart, Rocket, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

const formSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters").max(50, "Name is too long"),
  description: z.string().max(200, "Description must be less than 200 characters").optional(),
  template: z.enum(["portfolio", "business", "blog", "landing", "ecommerce"]),
});

const templates = [
  { id: "portfolio", name: "Portfolio", icon: Briefcase, description: "Showcase your finest work to the world." },
  { id: "business", name: "Business", icon: Hammer, description: "A sturdy foundation for your enterprise." },
  { id: "blog", name: "Blog", icon: FileText, description: "Chronicle your thoughts and adventures." },
  { id: "landing", name: "Landing Page", icon: Rocket, description: "Capture attention with a single, powerful strike." },
  { id: "ecommerce", name: "E-Commerce", icon: ShoppingCart, description: "Set up shop and trade your wares." },
];

export default function NewProject() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      description: "",
      template: "portfolio",
    },
  });

  const createProject = useCreateProject();

  function onSubmit(values: z.infer<typeof formSchema>) {
    createProject.mutate({ data: values }, {
      onSuccess: (project) => {
        toast({
          title: "Project Forged!",
          description: `${project.name} has been successfully created.`,
        });
        queryClient.invalidateQueries({ queryKey: getListProjectsQueryKey() });
        queryClient.invalidateQueries({ queryKey: getGetDashboardSummaryQueryKey() });
        setLocation(`/projects/${project.id}`);
      },
      onError: () => {
        toast({
          variant: "destructive",
          title: "Forging Failed",
          description: "There was an error shaping your project. Please try again.",
        });
      }
    });
  }

  return (
    <div className="max-w-3xl mx-auto animate-in slide-in-from-bottom-4 duration-500">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight text-foreground flex items-center">
          <Anvil className="mr-3 h-8 w-8 text-primary" />
          Strike a New Project
        </h1>
        <p className="text-muted-foreground mt-2 text-lg">
          The metal is hot. Tell the forge what you wish to create.
        </p>
      </div>

      <Card className="bg-card border-border">
        <CardContent className="pt-6">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
              
              <div className="space-y-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-base">Project Name</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g. The Grand Emporium" className="bg-background border-border text-lg py-6" {...field} />
                      </FormControl>
                      <FormDescription>
                        A strong name gives your creation purpose.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-base">Description (Optional)</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="What purpose does this artifact serve?" 
                          className="bg-background border-border resize-none" 
                          rows={3}
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="space-y-4 pt-4 border-t border-border">
                <div className="mb-4">
                  <h3 className="text-lg font-medium">Select a Template</h3>
                  <p className="text-sm text-muted-foreground">The mold from which your site will be cast.</p>
                </div>
                
                <FormField
                  control={form.control}
                  name="template"
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                          {templates.map((template) => (
                            <div
                              key={template.id}
                              className={cn(
                                "cursor-pointer rounded-lg border-2 p-4 flex flex-col items-center text-center space-y-3 transition-all",
                                field.value === template.id
                                  ? "border-primary bg-primary/5 shadow-[0_0_15px_rgba(255,100,0,0.1)]"
                                  : "border-border bg-background hover:border-muted-foreground/30 hover:bg-accent/10"
                              )}
                              onClick={() => field.onChange(template.id)}
                            >
                              <div className={cn(
                                "p-3 rounded-full",
                                field.value === template.id ? "bg-primary/20 text-primary" : "bg-muted text-muted-foreground"
                              )}>
                                <template.icon className="h-6 w-6" />
                              </div>
                              <div>
                                <div className="font-semibold">{template.name}</div>
                                <div className="text-xs text-muted-foreground mt-1 px-2">{template.description}</div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="flex justify-end pt-6 border-t border-border">
                <Button type="button" variant="ghost" className="mr-4" onClick={() => setLocation("/projects")}>
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  size="lg" 
                  className="bg-primary text-primary-foreground hover:bg-primary/90 min-w-[150px]"
                  disabled={createProject.isPending}
                >
                  {createProject.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                      Forging...
                    </>
                  ) : (
                    <>
                      <Hammer className="mr-2 h-5 w-5" />
                      Strike the Anvil
                    </>
                  )}
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}