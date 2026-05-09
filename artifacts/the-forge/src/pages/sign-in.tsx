import { SignIn, useClerk } from "@clerk/clerk-react";
import { useEffect, useState } from "react";

const CLERK_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY as string | undefined;

interface DiagState {
  windowClerkExists: boolean;
  windowClerkHasLoad: boolean;
  clerkLoaded: boolean;
  error: string | null;
  loadCalled: boolean;
}

function ClerkSignInWidget() {
  const clerk = useClerk();
  const [diag, setDiag] = useState<DiagState | null>(null);
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => setElapsed((e) => e + 1), 1000);
    return () => clearInterval(interval);
  }, []);

  // After 6 seconds of still-spinning, capture live diagnostics visible on screen
  useEffect(() => {
    if (clerk.loaded) return;
    const timer = setTimeout(() => {
      const w = window as Record<string, unknown>;
      const wClerk = w["Clerk"] as Record<string, unknown> | undefined;
      const state: DiagState = {
        windowClerkExists: !!wClerk,
        windowClerkHasLoad: typeof wClerk?.["load"] === "function",
        clerkLoaded: !!wClerk?.["loaded"],
        error: null,
        loadCalled: false,
      };

      if (wClerk && typeof wClerk["load"] === "function") {
        state.loadCalled = true;
        (wClerk["load"] as (o: unknown) => Promise<void>)({ publishableKey: CLERK_KEY })
          .then(() => setDiag((p) => p ? { ...p, clerkLoaded: true } : p))
          .catch((err: unknown) =>
            setDiag((p) =>
              p ? { ...p, error: err instanceof Error ? err.message : String(err) } : p
            )
          );
      }

      setDiag(state);
    }, 6000);
    return () => clearTimeout(timer);
  }, [clerk.loaded]);

  if (!clerk.loaded) {
    return (
      <div className="text-center space-y-4 max-w-sm w-full px-4">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent mx-auto" />
        <p className="text-sm text-muted-foreground">Connecting to auth service… ({elapsed}s)</p>
        <p className="text-xs text-muted-foreground opacity-60">
          If this takes more than 10 seconds,{" "}
          <a href="https://accounts.13moonforge.ai/sign-in" className="underline text-primary">
            sign in here instead
          </a>
        </p>

        {diag && (
          <div className="mt-4 rounded-lg border border-yellow-500/40 bg-yellow-950/40 p-4 text-left text-xs space-y-1 font-mono">
            <p className="font-semibold text-yellow-400 mb-2 font-sans">Auth diagnostic</p>
            <p>
              window.Clerk:{" "}
              <span className={diag.windowClerkExists ? "text-green-400" : "text-red-400"}>
                {diag.windowClerkExists ? "found ✓" : "MISSING ✗"}
              </span>
            </p>
            <p>
              clerk.load():{" "}
              <span className={diag.windowClerkHasLoad ? "text-green-400" : "text-red-400"}>
                {diag.windowClerkHasLoad ? "present ✓" : "MISSING ✗"}
              </span>
            </p>
            <p>
              clerk.loaded:{" "}
              <span className={diag.clerkLoaded ? "text-green-400" : "text-yellow-400"}>
                {String(diag.clerkLoaded)}
              </span>
            </p>
            <p>
              load() called:{" "}
              <span className={diag.loadCalled ? "text-green-400" : "text-yellow-400"}>
                {String(diag.loadCalled)}
              </span>
            </p>
            {diag.error && (
              <p className="text-red-400 break-all mt-2">Error: {diag.error}</p>
            )}
            {!diag.windowClerkExists && (
              <p className="text-yellow-300 mt-2 font-sans">
                clerk-js script did not load — try Ctrl+Shift+R
              </p>
            )}
            {diag.windowClerkExists && !diag.clerkLoaded && !diag.error && (
              <p className="text-yellow-300 mt-2 font-sans">
                clerk-js is loaded but clerk.load() hasn't resolved yet…
              </p>
            )}
          </div>
        )}
      </div>
    );
  }

  return (
    <SignIn
      forceRedirectUrl="/x-auth/clerk-callback"
      signUpForceRedirectUrl="/x-auth/clerk-callback"
      signUpUrl="/sign-up"
    />
  );
}

export default function SignInPage() {
  if (!CLERK_KEY) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-center space-y-3 px-6">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center mx-auto">
            <span className="text-xl">🔒</span>
          </div>
          <p className="font-semibold text-foreground">Authentication not configured</p>
          <p className="text-sm text-muted-foreground max-w-xs">
            This deployment is missing a required key. Contact the site administrator.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <ClerkSignInWidget />
    </div>
  );
}
