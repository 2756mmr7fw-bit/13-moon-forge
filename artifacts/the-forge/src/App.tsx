import { lazy, Suspense, useEffect, Component, type ReactNode, type ErrorInfo } from "react";
import { Switch, Route, Router as WouterRouter, useLocation } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useAuth } from "@workspace/replit-auth-web";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Layout } from "@/components/layout";
import { ProtectedRoute } from "@/components/protected-route";
import { WelcomeTour } from "@/components/welcome-tour";

// ── Eager — always needed immediately ──────────────────────────────────────
import Landing from "@/pages/landing";
import NotFound from "@/pages/not-found";

// ── Lazy — only loaded when the user navigates there ───────────────────────
const Dashboard        = lazy(() => import("@/pages/dashboard"));
const Projects         = lazy(() => import("@/pages/projects"));
const NewProject       = lazy(() => import("@/pages/new-project"));
const ProjectDetail    = lazy(() => import("@/pages/project-detail"));
const PageEditor       = lazy(() => import("@/pages/page-editor"));
const Pricing          = lazy(() => import("@/pages/payment-success").then(m => ({ default: m.default })).catch(() => import("@/pages/pricing")));
const PricingPage      = lazy(() => import("@/pages/pricing"));
const PaymentSuccess   = lazy(() => import("@/pages/payment-success"));
const Brainstorm       = lazy(() => import("@/pages/brainstorm"));
const CodeForge        = lazy(() => import("@/pages/code-forge"));
const ForgeTools       = lazy(() => import("@/pages/forge-tools"));
const GameDoc          = lazy(() => import("@/pages/game-doc"));
const SnippetVault     = lazy(() => import("@/pages/snippet-vault"));
const GameDesignTools  = lazy(() => import("@/pages/game-design-tools"));
const GameStudio       = lazy(() => import("@/pages/game-studio"));
const ComputerAdvisor  = lazy(() => import("@/pages/computer-advisor"));
const ScreenCoach      = lazy(() => import("@/pages/screen-coach"));
const LaunchKit        = lazy(() => import("@/pages/launch-kit"));
const LegalDecoder     = lazy(() => import("@/pages/legal-decoder"));
const LearnWithSage    = lazy(() => import("@/pages/learn-sage"));
const AskHawk          = lazy(() => import("@/pages/ask-hawk"));
const MigrationHub     = lazy(() => import("@/pages/migration-hub"));
const AppHub           = lazy(() => import("@/pages/app-hub"));
const MigrationWizard  = lazy(() => import("@/pages/migration-wizard"));
const Leaving          = lazy(() => import("@/pages/leaving"));
const SovereignStack   = lazy(() => import("@/pages/sovereign"));
const GitHubConnect    = lazy(() => import("@/pages/github-connect"));
const Registry         = lazy(() => import("@/pages/registry"));
const Account          = lazy(() => import("@/pages/account"));
const SecretsVault     = lazy(() => import("@/pages/secrets-vault"));
const AdminPanel       = lazy(() => import("@/pages/admin"));
const Connections      = lazy(() => import("@/pages/connections"));
const Monitor          = lazy(() => import("@/pages/monitor"));
const SiteForge        = lazy(() => import("@/pages/site-forge"));
const ComputerFix      = lazy(() => import("@/pages/computer-fix"));
const Download         = lazy(() => import("@/pages/download"));
const Workspace        = lazy(() => import("@/pages/workspace"));
const RemoteViewer     = lazy(() => import("@/pages/remote-viewer"));
const Antivirus        = lazy(() => import("@/pages/antivirus"));
const DiyCode          = lazy(() => import("@/pages/diy-code"));
const Mailbox          = lazy(() => import("@/pages/mailbox"));
const ShareView        = lazy(() => import("@/pages/share-view"));
const Starters         = lazy(() => import("@/pages/starters"));
const BuildWithMe      = lazy(() => import("@/pages/build-with-me"));
const Gallery          = lazy(() => import("@/pages/gallery"));
const Promise          = lazy(() => import("@/pages/promise"));
const TownSquare       = lazy(() => import("@/pages/town-square"));
const Academy          = lazy(() => import("@/pages/academy"));
const ForgeHosting     = lazy(() => import("@/pages/forge-hosting"));
const ForgeDrop        = lazy(() => import("@/pages/forge-drop"));
const MailScanner      = lazy(() => import("@/pages/mail-scanner"));
const DebugForge       = lazy(() => import("@/pages/debug-forge"));
const CodeFixTest      = lazy(() => import("@/pages/code-fix-test"));
const TraceReader      = lazy(() => import("@/pages/academy/TraceReader"));
const DryRun           = lazy(() => import("@/pages/academy/DryRun"));
const SqlDrill         = lazy(() => import("@/pages/academy/SqlDrill"));
const BigODrill        = lazy(() => import("@/pages/academy/BigODrill"));
const TypeFixer        = lazy(() => import("@/pages/academy/TypeFixer"));
const ApiArchitect     = lazy(() => import("@/pages/academy/ApiArchitect"));
const GitDrill         = lazy(() => import("@/pages/academy/GitDrill"));
const LogReader        = lazy(() => import("@/pages/academy/LogReader"));
const GymHub           = lazy(() => import("@/pages/gym/GymHub"));
const GymExercise      = lazy(() => import("@/pages/gym/ExercisePage"));

const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");
const API_BASE = basePath;
const REFERRAL_CLAIMED_KEY = "forge:referral:claimed";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: false, refetchOnWindowFocus: false },
  },
});

// Minimal spinner shown while a lazy page chunk loads
function PageLoader() {
  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
    </div>
  );
}

// Catches chunk-load failures and any other render errors
interface EBState { error: Error | null }
class ErrorBoundary extends Component<{ children: ReactNode }, EBState> {
  state: EBState = { error: null };

  static getDerivedStateFromError(error: Error): EBState {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("[ErrorBoundary]", error, info);
  }

  render() {
    if (this.state.error) {
      return (
        <div
          className="flex flex-col items-center justify-center min-h-screen gap-4 px-6 text-center bg-background"
          onClick={() => window.location.reload()}
        >
          <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center">
            <span className="text-2xl">🔥</span>
          </div>
          <p className="font-bold text-lg">Something didn't load right.</p>
          <p className="text-sm text-muted-foreground max-w-xs leading-relaxed">
            Tap anywhere to reload. Your work is safe — nothing was lost.
          </p>
        </div>
      );
    }
    return this.props.children;
  }
}

function ReferralClaimHandler() {
  const { isAuthenticated } = useAuth();

  useEffect(() => {
    if (!isAuthenticated) return;
    try {
      if (localStorage.getItem(REFERRAL_CLAIMED_KEY)) return;
      const params = new URLSearchParams(window.location.search);
      const ref = params.get("ref");
      if (!ref) return;
      (async () => {
        try {
          await fetch(`${API_BASE}/api/referral/claim`, {
            method: "POST",
            credentials: "include",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ code: ref }),
          });
          localStorage.setItem(REFERRAL_CLAIMED_KEY, "1");
        } catch { /* silent */ }
      })();
    } catch { /* silent */ }
  }, [isAuthenticated]);

  return null;
}

function SignInPage() {
  useEffect(() => {
    window.location.href = `/api/auth/login?returnTo=${encodeURIComponent(basePath || "/")}`;
  }, []);
  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
    </div>
  );
}

function SignUpPage() {
  useEffect(() => {
    window.location.href = `/api/auth/login?returnTo=${encodeURIComponent(basePath || "/")}`;
  }, []);
  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
    </div>
  );
}

function Router() {
  return (
    <ErrorBoundary>
    <Suspense fallback={<PageLoader />}>
      <Switch>
        <Route path="/sign-in/*?" component={SignInPage} />
        <Route path="/sign-up/*?" component={SignUpPage} />
        <Route path="/share/:id" component={ShareView} />
        <Route path="/" component={Landing} />
        <Route>
          <Layout>
            <Switch>
              {/* ── Public routes ── */}
              <Route path="/pricing" component={PricingPage} />
              <Route path="/promise" component={Promise} />
              <Route path="/academy" component={Academy} />
              <Route path="/payment/success" component={PaymentSuccess} />
              <Route path="/download" component={Download} />
              <Route path="/remote/:sessionId" component={RemoteViewer} />

              {/* ── Protected routes ── */}
              <Route>
                <ProtectedRoute>
                  <Switch>
                    <Route path="/dashboard"              component={Dashboard} />
                    <Route path="/projects"               component={Projects} />
                    <Route path="/projects/new"           component={NewProject} />
                    <Route path="/projects/:id"           component={ProjectDetail} />
                    <Route path="/projects/:id/editor"    component={PageEditor} />
                    <Route path="/brainstorm"             component={Brainstorm} />
                    <Route path="/code-forge"             component={CodeForge} />
                    <Route path="/tools"                  component={ForgeTools} />
                    <Route path="/game-doc"               component={GameDoc} />
                    <Route path="/snippets"               component={SnippetVault} />
                    <Route path="/game-tools"             component={GameDesignTools} />
                    <Route path="/game-studio"            component={GameStudio} />
                    <Route path="/computer-advisor"       component={ComputerAdvisor} />
                    <Route path="/screen-coach"           component={ScreenCoach} />
                    <Route path="/launch"                 component={LaunchKit} />
                    <Route path="/legal"                  component={LegalDecoder} />
                    <Route path="/sage"                   component={LearnWithSage} />
                    <Route path="/hawk"                   component={AskHawk} />
                    <Route path="/migration"              component={MigrationHub} />
                    <Route path="/app-hub"                component={AppHub} />
                    <Route path="/wizard"                 component={MigrationWizard} />
                    <Route path="/leaving"                component={Leaving} />
                    <Route path="/sovereign"              component={SovereignStack} />
                    <Route path="/github"                 component={GitHubConnect} />
                    <Route path="/registry"               component={Registry} />
                    <Route path="/account"                component={Account} />
                    <Route path="/secrets"                component={SecretsVault} />
                    <Route path="/connections"            component={Connections} />
                    <Route path="/monitor"                component={Monitor} />
                    <Route path="/site-forge"             component={SiteForge} />
                    <Route path="/fix"                    component={ComputerFix} />
                    <Route path="/workspace"              component={Workspace} />
                    <Route path="/admin"                  component={AdminPanel} />
                    <Route path="/antivirus"              component={Antivirus} />
                    <Route path="/diy-code"               component={DiyCode} />
                    <Route path="/mailbox"                component={Mailbox} />
                    <Route path="/starters"              component={Starters} />
                    <Route path="/build-with-me"         component={BuildWithMe} />
                    <Route path="/gallery"               component={Gallery} />
                    <Route path="/town-square"           component={TownSquare} />
                    <Route path="/forge-hosting"         component={ForgeHosting} />
                    <Route path="/forge-drop"            component={ForgeDrop} />
                    <Route path="/mail-scanner"          component={MailScanner} />
                    <Route path="/debug-forge"           component={DebugForge} />
                    <Route path="/code-fix-test"         component={CodeFixTest} />
                    <Route path="/trace-reader"           component={TraceReader} />
                    <Route path="/dry-run"                component={DryRun} />
                    <Route path="/sql-drill"              component={SqlDrill} />
                    <Route path="/big-o"                  component={BigODrill} />
                    <Route path="/type-fixer"             component={TypeFixer} />
                    <Route path="/api-architect"          component={ApiArchitect} />
                    <Route path="/git-drill"              component={GitDrill} />
                    <Route path="/log-reader"             component={LogReader} />
                    <Route path="/gym/:id"                component={GymExercise} />
                    <Route path="/gym"                    component={GymHub} />
                    <Route component={NotFound} />
                  </Switch>
                </ProtectedRoute>
              </Route>
            </Switch>
          </Layout>
        </Route>
      </Switch>
    </Suspense>
    </ErrorBoundary>
  );
}

function App() {
  return (
    <WouterRouter base={basePath}>
      <QueryClientProvider client={queryClient}>
        <ReferralClaimHandler />
        <WelcomeTour />
        <TooltipProvider>
          <Router />
          <Toaster />
        </TooltipProvider>
      </QueryClientProvider>
    </WouterRouter>
  );
}

export default App;
