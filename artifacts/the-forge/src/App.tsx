import { useEffect, useRef } from "react";
import { Switch, Route, Router as WouterRouter, useLocation } from "wouter";
import { QueryClient, QueryClientProvider, useQueryClient } from "@tanstack/react-query";
import { ClerkProvider, SignIn, SignUp, useClerk, useAuth } from "@clerk/react";
import { setAuthTokenGetter } from "@workspace/api-client-react";
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
import GameStudio from "@/pages/game-studio";
import LaunchKit from "@/pages/launch-kit";
import LegalDecoder from "@/pages/legal-decoder";
import LearnWithSage from "@/pages/learn-sage";
import AskHawk from "@/pages/ask-hawk";
import MigrationHub from "@/pages/migration-hub";
import AppHub from "@/pages/app-hub";
import MigrationWizard from "@/pages/migration-wizard";
import Leaving from "@/pages/leaving";
import SovereignStack from "@/pages/sovereign";
import GitHubConnect from "@/pages/github-connect";
import Registry from "@/pages/registry";
import Account from "@/pages/account";
import SecretsVault from "@/pages/secrets-vault";
import AdminPanel from "@/pages/admin";
import Connections from "@/pages/connections";
import Monitor from "@/pages/monitor";
import { ProtectedRoute } from "@/components/protected-route";

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

function SignInPage() {
  // To update login providers, app branding, or OAuth settings use the Auth
  // pane in the workspace toolbar. More information can be found in the Replit docs.
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <SignIn routing="path" path={`${basePath}/sign-in`} signUpUrl={`${basePath}/sign-up`} />
    </div>
  );
}

function SignUpPage() {
  // To update login providers, app branding, or OAuth settings use the Auth
  // pane in the workspace toolbar. More information can be found in the Replit docs.
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <SignUp routing="path" path={`${basePath}/sign-up`} signInUrl={`${basePath}/sign-in`} />
    </div>
  );
}

function Router() {
  return (
    <Switch>
      <Route path="/sign-in/*?" component={SignInPage} />
      <Route path="/sign-up/*?" component={SignUpPage} />
      <Route>
        <Layout>
          <Switch>
            {/* ── Public routes (no auth required) ── */}
            <Route path="/pricing" component={Pricing} />
            <Route path="/payment/success" component={PaymentSuccess} />

            {/* ── Protected routes (sign-in required) ── */}
            <Route>
              <ProtectedRoute>
                <Switch>
                  <Route path="/" component={Dashboard} />
                  <Route path="/projects" component={Projects} />
                  <Route path="/projects/new" component={NewProject} />
                  <Route path="/projects/:id" component={ProjectDetail} />
                  <Route path="/projects/:id/editor" component={PageEditor} />
                  <Route path="/brainstorm" component={Brainstorm} />
                  <Route path="/code-forge" component={CodeForge} />
                  <Route path="/tools" component={ForgeTools} />
                  <Route path="/game-doc" component={GameDoc} />
                  <Route path="/snippets" component={SnippetVault} />
                  <Route path="/game-tools" component={GameDesignTools} />
                  <Route path="/game-studio" component={GameStudio} />
                  <Route path="/launch" component={LaunchKit} />
                  <Route path="/legal" component={LegalDecoder} />
                  <Route path="/sage" component={LearnWithSage} />
                  <Route path="/hawk" component={AskHawk} />
                  <Route path="/migration" component={MigrationHub} />
                  <Route path="/app-hub" component={AppHub} />
                  <Route path="/wizard" component={MigrationWizard} />
                  <Route path="/leaving" component={Leaving} />
                  <Route path="/sovereign" component={SovereignStack} />
                  <Route path="/github" component={GitHubConnect} />
                  <Route path="/registry" component={Registry} />
                  <Route path="/account" component={Account} />
                  <Route path="/secrets" component={SecretsVault} />
                  <Route path="/connections" component={Connections} />
                  <Route path="/monitor" component={Monitor} />
                  <Route path="/admin" component={AdminPanel} />
                  <Route component={NotFound} />
                </Switch>
              </ProtectedRoute>
            </Route>
          </Switch>
        </Layout>
      </Route>
    </Switch>
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
