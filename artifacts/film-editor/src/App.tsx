import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useEffect } from "react";
import NotFound from "@/pages/not-found";
import Dashboard from "@/pages/dashboard";
import Projects from "@/pages/projects";
import NewProject from "@/pages/new-project";
import Editor from "@/pages/editor";
import ProjectSettings from "@/pages/project-settings";
import { Layout } from "@/components/layout";

const queryClient = new QueryClient();

function Router() {
  return (
    <Switch>
      <Route path="/" component={() => <Layout><Dashboard /></Layout>} />
      <Route path="/projects" component={() => <Layout><Projects /></Layout>} />
      <Route path="/projects/new" component={() => <Layout><NewProject /></Layout>} />
      <Route path="/projects/:id" component={Editor} />
      <Route path="/projects/:id/settings" component={() => <Layout><ProjectSettings /></Layout>} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  // Force dark mode for cinematic feel
  useEffect(() => {
    document.documentElement.classList.add("dark");
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <Router />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
