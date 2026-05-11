import { Switch, Route, Router as WouterRouter, Redirect } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useEffect, useState } from "react";
import NotFound from "@/pages/not-found";
import Dashboard from "@/pages/dashboard";
import Projects from "@/pages/projects";
import NewProject from "@/pages/new-project";
import Editor from "@/pages/editor";
import ProjectSettings from "@/pages/project-settings";
import Landing from "@/pages/landing";
import { Layout } from "@/components/layout";

const queryClient = new QueryClient();
const API_BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

function useAuthStatus() {
  const [state, setState] = useState<"loading" | "authed" | "guest">("loading");
  useEffect(() => {
    fetch(`${API_BASE}/api/me`, { credentials: "include" })
      .then(r => setState(r.ok ? "authed" : "guest"))
      .catch(() => setState("guest"));
  }, []);
  return state;
}

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const auth = useAuthStatus();
  if (auth === "loading") return (
    <div className="h-screen flex items-center justify-center bg-[#080808]">
      <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
    </div>
  );
  if (auth === "guest") return <Redirect to="/sign-in" />;
  return <>{children}</>;
}

function Router() {
  return (
    <Switch>
      <Route path="/" component={Landing} />
      <Route path="/dashboard" component={() => (
        <ProtectedRoute><Layout><Dashboard /></Layout></ProtectedRoute>
      )} />
      <Route path="/projects" component={() => (
        <ProtectedRoute><Layout><Projects /></Layout></ProtectedRoute>
      )} />
      <Route path="/projects/new" component={() => (
        <ProtectedRoute><Layout><NewProject /></Layout></ProtectedRoute>
      )} />
      <Route path="/projects/:id" component={() => (
        <ProtectedRoute><Editor /></ProtectedRoute>
      )} />
      <Route path="/projects/:id/settings" component={() => (
        <ProtectedRoute><Layout><ProjectSettings /></Layout></ProtectedRoute>
      )} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
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
