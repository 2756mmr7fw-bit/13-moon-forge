import { lazy, Suspense, useEffect, useRef, Component, type ReactNode, type ErrorInfo } from "react";
import { Switch, Route, Router as WouterRouter, useLocation } from "wouter";
import { QueryClient, QueryClientProvider, useQueryClient } from "@tanstack/react-query";
import { ClerkProvider, SignIn, SignUp, useClerk, useAuth } from "@clerk/react";
import { setAuthTokenGetter } from "@workspace/api-client-react";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Layout } from "@/components/layout";
import { ProtectedRoute } from "@/components/protected-route";

// ── Eager — always needed immediately ──────────────────────────────────────
import Landing from "@/pages/landing";
import NotFound from "@/pages/not-found";

// ── Lazy — only loaded when the user navigates there ───────────────────────
const Dashboard        = lazy(() => import("@/pages/dashboard"));
const Projects         = lazy(() => import("@/pages/projects"));
const NewProject       = lazy(() => import("@/pages/new-project"));
const ProjectDetail    = lazy(() => import("@/pages/project-detail"));
const PageEditor       = lazy(() => import("@/pages/page-editor"));
const Pricing          = lazy(() => import("@/pages/pricing"));
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

const clerkPubKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;
const clerkProxyUrl = import.meta.env.VITE_CLERK_PROXY_URL;
const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

function stripBase(path: string): string {
  return basePath && path.startsWith(basePath)
    ? path.slice(basePath.length) || "/"
    : path;
}

const clerkAppearance = {
  options: {
    logoPlacement: "inside" as const,
    logoLinkUrl: basePath || "/",
    logoImageUrl: `${window.location.origin}${basePath}/logo.svg`,
  },
  variables: {
    colorPrimary: "hsl(20, 90%, 55%)",
    colorBackground: "hsl(0, 0%, 10%)",
    colorInputBackground: "hsl(0, 0%, 14%)",
    colorText: "hsl(0, 0%, 96%)",
    colorTextSecondary: "hsl(0, 0%, 60%)",
    colorInputText: "hsl(0, 0%, 96%)",
    colorNeutral: "hsl(0, 0%, 40%)",
    borderRadius: "0.625rem",
  },
  elements: {
    rootBox: "w-full",
    cardBox: "shadow-2xl rounded-2xl w-full overflow-hidden border border-white/10",
    card: "!shadow-none !border-0 !bg-transparent !rounded-none",
    footer: "!shadow-none !border-0 !bg-transparent !rounded-none",
    headerTitle: { color: "hsl(0, 0%, 96%)", fontWeight: "800" },
    headerSubtitle: { color: "hsl(0, 0%, 60%)" },
    socialButtonsBlockButtonText: { color: "hsl(0, 0%, 96%)" },
    formFieldLabel: { color: "hsl(0, 0%, 70%)", fontSize: "0.75rem", fontWeight: "600" },
    footerActionLink: { color: "hsl(20, 90%, 55%)" },
    footerActionText: { color: "hsl(0, 0%, 60%)" },
    dividerText: { color: "hsl(0, 0%, 50%)" },
    identityPreviewEditButton: { color: "hsl(20, 90%, 55%)" },
    formFieldSuccessText: { color: "hsl(142, 70%, 50%)" },
    alertText: { color: "hsl(0, 0%, 80%)" },
    logoBox: "flex justify-center py-2",
    logoImage: "h-12 w-12",
    socialButtonsBlockButton: "border-white/10 hover:border-white/20 !bg-white/5",
    formButtonPrimary: "bg-primary hover:bg-primary/90 text-white font-bold",
    formFieldInput: "bg-muted/30 border-white/10 text-foreground",
    footerAction: "border-t border-white/10",
    dividerLine: "bg-white/10",
    main: "gap-5",
  },
};

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

// Catches chunk-load failures and any other render errors — shows a simple
// "tap to reload" screen instead of a blank black page.
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

function ClerkQueryClientCacheInvalidator() {
  const { addListener } = useClerk();
  const qc = useQueryClient();
  const prevUserIdRef = useRef<string | null | undefined>(undefined);

  useEffect(() => {
    const unsub = addListener(({ user }) => {
      const uid = user?.id ?? null;
      if (prevUserIdRef.current !== undefined && prevUserIdRef.current !== uid) {
        qc.clear();
      }
      prevUserIdRef.current = uid;
    });
    return unsub;
  }, [addListener, qc]);

  return null;
}

function ClerkTokenInitializer() {
  const { getToken, isSignedIn } = useAuth();

  useEffect(() => {
    if (isSignedIn) {
      setAuthTokenGetter(() => getToken());
    } else {
      setAuthTokenGetter(null);
    }
  }, [isSignedIn, getToken]);

  return null;
}

const REFERRAL_CLAIMED_KEY = "forge:referral:claimed";
const API_BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

function ReferralClaimHandler() {
  const { getToken, isSignedIn } = useAuth();

  useEffect(() => {
    if (!isSignedIn) return;
    try {
      if (localStorage.getItem(REFERRAL_CLAIMED_KEY)) return;
      const params = new URLSearchParams(window.location.search);
      const ref = params.get("ref");
      if (!ref) return;
      (async () => {
        try {
          const token = await getToken();
          await fetch(`${API_BASE}/api/referral/claim`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              ...(token ? { Authorization: `Bearer ${token}` } : {}),
            },
            body: JSON.stringify({ code: ref }),
          });
          localStorage.setItem(REFERRAL_CLAIMED_KEY, "1");
        } catch { /* silent */ }
      })();
    } catch { /* silent */ }
  }, [isSignedIn, getToken]);

  return null;
}

function SignInPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <SignIn
        routing="path"
        path={`${basePath}/sign-in`}
        signUpUrl={`${basePath}/sign-up`}
        fallbackRedirectUrl={`${basePath}/dashboard`}
      />
    </div>
  );
}

function SignUpPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <SignUp
        routing="path"
        path={`${basePath}/sign-up`}
        signInUrl={`${basePath}/sign-in`}
        fallbackRedirectUrl={`${basePath}/dashboard`}
      />
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
              <Route path="/pricing" component={Pricing} />
              <Route path="/promise" component={Promise} />
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

function ClerkProviderWithRoutes() {
  const [, setLocation] = useLocation();

  return (
    <ClerkProvider
      publishableKey={clerkPubKey}
      proxyUrl={clerkProxyUrl}
      appearance={clerkAppearance}
      localization={{
        signIn: {
          start: {
            title: "Welcome back to Forge",
            subtitle: "Sign in to your sovereign workspace",
          },
        },
        signUp: {
          start: {
            title: "Join 13 Moon Forge",
            subtitle: "Build and own your digital infrastructure",
          },
        },
      }}
      routerPush={(to) => setLocation(stripBase(to))}
      routerReplace={(to) => setLocation(stripBase(to), { replace: true })}
    >
      <QueryClientProvider client={queryClient}>
        <ClerkQueryClientCacheInvalidator />
        <ClerkTokenInitializer />
        <ReferralClaimHandler />
        <TooltipProvider>
          <Router />
          <Toaster />
        </TooltipProvider>
      </QueryClientProvider>
    </ClerkProvider>
  );
}

function App() {
  return (
    <WouterRouter base={basePath}>
      <ClerkProviderWithRoutes />
    </WouterRouter>
  );
}

export default App;
