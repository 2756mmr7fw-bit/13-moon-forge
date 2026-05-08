import { SignIn, useClerk } from "@clerk/clerk-react";

const CLERK_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY as string | undefined;

function ClerkSignInWidget() {
  const clerk = useClerk();

  if (!clerk.loaded) {
    return (
      <div className="text-center space-y-4">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent mx-auto" />
        <p className="text-sm text-muted-foreground">Connecting to auth service…</p>
        <p className="text-xs text-muted-foreground opacity-60">
          If this takes more than 10 seconds,{" "}
          <a
            href="https://accounts.13moonforge.ai/sign-in"
            className="underline text-primary"
          >
            sign in here instead
          </a>
        </p>
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
