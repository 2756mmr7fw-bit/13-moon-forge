import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Layout } from "@/components/layout";
import NotFound from "@/pages/not-found";
import Dashboard from "@/pages/dashboard";
import Projects from "@/pages/projects";
import NewProject from "@/pages/new-project";
import ProjectDetail from "@/pages/project-detail";
import PageEditor from "@/pages/page-editor";
import Pricing from "@/pages/pricing";
import PaymentSuccess from "@/pages/payment-success";
import Brainstorm from "@/pages/brainstorm";
import CodeForge from "@/pages/code-forge";
import ForgeTools from "@/pages/forge-tools";
import GameDoc from "@/pages/game-doc";
import SnippetVault from "@/pages/snippet-vault";
import GameDesignTools from "@/pages/game-design-tools";
import LaunchKit from "@/pages/launch-kit";
import LegalDecoder from "@/pages/legal-decoder";
import LearnWithSage from "@/pages/learn-sage";
import AskHawk from "@/pages/ask-hawk";
import MigrationHub from "@/pages/migration-hub";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
      refetchOnWindowFocus: false,
    },
  },
});

function Router() {
  return (
    <Layout>
      <Switch>
        <Route path="/" component={Dashboard} />
        <Route path="/projects" component={Projects} />
        <Route path="/projects/new" component={NewProject} />
        <Route path="/projects/:id" component={ProjectDetail} />
        <Route path="/projects/:id/editor" component={PageEditor} />
        <Route path="/pricing" component={Pricing} />
        <Route path="/payment/success" component={PaymentSuccess} />
        <Route path="/brainstorm" component={Brainstorm} />
        <Route path="/code-forge" component={CodeForge} />
        <Route path="/tools" component={ForgeTools} />
        <Route path="/game-doc" component={GameDoc} />
        <Route path="/snippets" component={SnippetVault} />
        <Route path="/game-tools" component={GameDesignTools} />
        <Route path="/launch" component={LaunchKit} />
        <Route path="/legal" component={LegalDecoder} />
        <Route path="/sage" component={LearnWithSage} />
        <Route path="/hawk" component={AskHawk} />
        <Route path="/migration" component={MigrationHub} />
        <Route component={NotFound} />
      </Switch>
    </Layout>
  );
}

function App() {
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
