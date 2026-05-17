import { lazy, Suspense, useEffect, Component, type ReactNode, type ErrorInfo } from "react";
import { Switch, Route, Router as WouterRouter, useLocation, Redirect } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ClerkProvider } from "@clerk/clerk-react";
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
const Showcase         = lazy(() => import("@/pages/showcase"));
const Starters         = lazy(() => import("@/pages/starters"));
const BuildWithMe      = lazy(() => import("@/pages/build-with-me"));
const Gallery          = lazy(() => import("@/pages/gallery"));
const Promise          = lazy(() => import("@/pages/promise"));
const TownSquare       = lazy(() => import("@/pages/town-square"));
const Academy          = lazy(() => import("@/pages/academy"));
const ForgeHosting     = lazy(() => import("@/pages/forge-hosting"));
const ForgeDrop        = lazy(() => import("@/pages/forge-drop"));
const ForgeUptime      = lazy(() => import("@/pages/forge-uptime"));
const ForgeStorage     = lazy(() => import("@/pages/forge-storage"));
const ForgeEmail       = lazy(() => import("@/pages/forge-email"));
const ForgeAi          = lazy(() => import("@/pages/forge-ai"));
const ForgeMarketplace = lazy(() => import("@/pages/forge-marketplace"));
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
const VaultPage        = lazy(() => import("@/pages/vault"));
const ActivityPage     = lazy(() => import("@/pages/activity"));
const DeploysPage      = lazy(() => import("@/pages/deploys"));
const MigratePage      = lazy(() => import("@/pages/migrate"));
const GetForgePage     = lazy(() => import("@/pages/get-forge"));
const ForgeCoderPage   = lazy(() => import("@/pages/forge-coder"));
const ProjectRoomPage  = lazy(() => import("@/pages/project-room"));
const MoonPage         = lazy(() => import("@/pages/moon-page"));
const LedgerPage       = lazy(() => import("@/pages/moons/ledger"));
const AppInspectorPage  = lazy(() => import("@/pages/app-inspector"));
const BugCheckerPage    = lazy(() => import("@/pages/bug-checker"));
const AppHealthPage     = lazy(() => import("@/pages/app-health"));
const FreedomCenter     = lazy(() => import("@/pages/freedom-center"));
const ClerkCallbackPage = lazy(() => import("@/pages/clerk-callback"));
const ClerkSignInPage      = lazy(() => import("@/pages/sign-in"));
const ClerkSignUpPage      = lazy(() => import("@/pages/sign-up"));
const InspectionPublicPage = lazy(() => import("@/pages/inspection-public"));
const DomainHub            = lazy(() => import("@/pages/domain-hub"));
const CodeVaultPage        = lazy(() => import("@/pages/code-vault-page"));
const AppLogsPage          = lazy(() => import("@/pages/app-logs-page"));
const AgentBridgePage      = lazy(() => import("@/pages/agent-bridge-page"));
const ReferralPage         = lazy(() => import("@/pages/referral"));
const ChangelogPage        = lazy(() => import("@/pages/changelog"));
const UsageDashboard       = lazy(() => import("@/pages/usage-dashboard"));
const NotificationsPage    = lazy(() => import("@/pages/notifications-page"));
const AnalyticsPage        = lazy(() => import("@/pages/analytics-page"));
const EnvManagerPage       = lazy(() => import("@/pages/env-manager"));
const BuilderProfilePage   = lazy(() => import("@/pages/builder-profile"));
const CronJobsPage         = lazy(() => import("@/pages/cron-jobs"));
const BackupRestorePage    = lazy(() => import("@/pages/backup-restore"));
const DatabaseManagerPage  = lazy(() => import("@/pages/database-manager"));
const TeamCollaborationPage = lazy(() => import("@/pages/team-collaboration"));
const ServicesPage          = lazy(() => import("@/pages/services"));
const AdminHostingPage      = lazy(() => import("@/pages/admin-hosting"));
const AdminPaymentFunnel    = lazy(() => import("@/pages/admin-payment-funnel"));
const BrandScoutPage        = lazy(() => import("@/pages/brand-scout"));
const ForgePressPage        = lazy(() => import("@/pages/forge-press"));
const BuildMySitePage       = lazy(() => import("@/pages/build-my-site"));
const LaunchKitPage         = lazy(() => import("@/pages/launch-kit"));
const DistributionPlanPage  = lazy(() => import("@/pages/distribution-plan"));
const AccountsPage          = lazy(() => import("@/pages/accounts"));
const PrivacyPage           = lazy(() => import("@/pages/privacy"));
const TermsPage             = lazy(() => import("@/pages/terms"));
const MobileSubmissionPage  = lazy(() => import("@/pages/mobile-submission"));
const DiscoverPage          = lazy(() => import("@/pages/discover"));
const PressHubPage          = lazy(() => import("@/pages/press-hub"));
const PressArticlePage      = lazy(() => import("@/pages/press-article"));

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

function AuthSpinner() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
    </div>
  );
}

// Handles the OAuth callback when Replit redirects back to /x-auth/callback.
// The CDN serves index.html for this GET, so the SPA mounts, reads the code
// from the URL, and POSTs it to Express to complete the exchange.
function AuthCallback() {
  const [, navigate] = useLocation();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get("code");
    const state = params.get("state");
    const iss = params.get("iss");

    if (!code) {
      navigate("/sign-in");
      return;
    }

    // Read the PKCE verifier stored in sessionStorage during client-side login.
    // If login was server-side, the verifier lives in a cookie and the server
    // reads it from there; sending null is harmless.
    let verifier: string | null = null;
    try {
      verifier = sessionStorage.getItem("oidc_verifier");
      sessionStorage.removeItem("oidc_verifier");
      sessionStorage.removeItem("oidc_state");
      sessionStorage.removeItem("oidc_nonce");
      sessionStorage.removeItem("oidc_return_to");
    } catch {
      /* private browsing may deny sessionStorage access */
    }

    fetch("/x-auth/callback", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code, state, iss, ...(verifier ? { verifier } : {}) }),
    })
      .then((res) => res.json())
      .then((data: { returnTo?: string; error?: string }) => {
        if (data.error) {
          navigate("/sign-in");
        } else {
          window.location.href = data.returnTo ?? "/";
        }
      })
      .catch(() => navigate("/sign-in"));
  }, [navigate]);

  return <AuthSpinner />;
}

function Router() {
  return (
    <ErrorBoundary>
    <Suspense fallback={<PageLoader />}>
      <Switch>
        <Route path="/x-auth/callback" component={AuthCallback} />
        <Route path="/x-auth/clerk-callback" component={ClerkCallbackPage} />
        <Route path="/sign-in/*?" component={ClerkSignInPage} />
        <Route path="/sign-up/*?" component={ClerkSignUpPage} />
        <Route path="/share/:id" component={ShareView} />
        <Route path="/inspection/:shareId" component={InspectionPublicPage} />
        <Route path="/landing" component={Landing} />
        <Route path="/">
          <Layout>
            <DiscoverPage />
          </Layout>
        </Route>
        <Route>
          <Layout>
            <Switch>
              {/* ── Public routes ── */}
              <Route path="/pricing" component={PricingPage} />
              <Route path="/build-my-site" component={BuildMySitePage} />
              <Route path="/promise" component={Promise} />
              <Route path="/showcase" component={Showcase} />
              <Route path="/discover" component={DiscoverPage} />
              <Route path="/press" component={PressHubPage} />
              <Route path="/press/:slug" component={PressArticlePage} />
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
                    <Route path="/sage"                   component={LearnWithSage as React.ComponentType} />
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
                    <Route path="/forge-uptime"          component={ForgeUptime} />
                    <Route path="/forge-storage"         component={ForgeStorage} />
                    <Route path="/forge-email"           component={ForgeEmail} />
                    <Route path="/forge-ai"              component={ForgeAi} />
                    <Route path="/forge-marketplace"     component={ForgeMarketplace} />
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
                    <Route path="/vault"                  component={VaultPage} />
                    <Route path="/activity"               component={ActivityPage} />
                    <Route path="/deploys"                component={DeploysPage} />
                    <Route path="/migrate"                component={MigratePage} />
                    <Route path="/get-forge"             component={GetForgePage} />
                    <Route path="/forge-coder"           component={ForgeCoderPage} />
                    <Route path="/project-room"          component={ProjectRoomPage} />
                    <Route path="/moons/ledger"          component={LedgerPage} />
                    <Route path="/moons/:moonId"         component={MoonPage} />
                    <Route path="/app-inspector"         component={AppInspectorPage} />
                    <Route path="/bug-checker"           component={BugCheckerPage} />
                    <Route path="/app-health"            component={AppHealthPage} />
                    <Route path="/freedom-center"        component={FreedomCenter} />
                    <Route path="/domain-hub"            component={DomainHub} />
                    <Route path="/code-vault"            component={CodeVaultPage} />
                    <Route path="/app-logs"              component={AppLogsPage} />
                    <Route path="/agent-bridge"          component={AgentBridgePage} />
                    <Route path="/referral"              component={ReferralPage} />
                    <Route path="/changelog"             component={ChangelogPage} />
                    <Route path="/usage"                 component={UsageDashboard} />
                    <Route path="/notifications"         component={NotificationsPage} />
                    <Route path="/analytics"             component={AnalyticsPage} />
                    <Route path="/env-manager"           component={EnvManagerPage} />
                    <Route path="/builder/:userId"       component={BuilderProfilePage} />
                    <Route path="/cron-jobs"             component={CronJobsPage} />
                    <Route path="/backup-restore"        component={BackupRestorePage} />
                    <Route path="/database-manager"      component={DatabaseManagerPage} />
                    <Route path="/team"                  component={TeamCollaborationPage} />
                    <Route path="/services"              component={ServicesPage} />
                    <Route path="/admin-hosting"         component={AdminHostingPage} />
                    <Route path="/admin/payment-funnel"  component={AdminPaymentFunnel} />
                    <Route path="/brand-scout"           component={BrandScoutPage} />
                    <Route path="/forge-press"           component={ForgePressPage} />
                    <Route path="/launch-kit"            component={LaunchKitPage} />
                    <Route path="/distribution-plan"     component={DistributionPlanPage} />
                    <Route path="/accounts"              component={AccountsPage} />
                    <Route path="/privacy"               component={PrivacyPage} />
                    <Route path="/terms"                 component={TermsPage} />
                    <Route path="/mobile-submission"     component={MobileSubmissionPage} />
                    <Route path="/discover"              component={DiscoverPage} />
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

const CLERK_PUBLISHABLE_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY as string | undefined;

// clerk-js is pre-loaded synchronously in index.html via document.write before
// React mounts. This is necessary because @clerk/clerk-react@5.61.3 tries to
// dynamically load clerk-js@5.61.3 which returns 404 on the Clerk FAPI CDN.
// When window.Clerk is already set by the time IsomorphicClerk initialises it
// skips its own broken dynamic load and uses the pre-loaded instance instead.

function App() {
  const inner = (
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

  if (!CLERK_PUBLISHABLE_KEY) return inner;

  return (
    <ClerkProvider
      publishableKey={CLERK_PUBLISHABLE_KEY}
      signInUrl="/sign-in"
      signUpUrl="/sign-up"
      afterSignInUrl="/x-auth/clerk-callback"
      afterSignUpUrl="/x-auth/clerk-callback"
    >
      {inner}
    </ClerkProvider>
  );
}

export default App;
