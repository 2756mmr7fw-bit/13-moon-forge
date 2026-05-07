import { SignUp } from "@clerk/clerk-react";

const CLERK_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY as string | undefined;

export default function SignUpPage() {
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
      <SignUp
        routing="hash"
        forceRedirectUrl="/x-auth/clerk-callback"
        signInForceRedirectUrl="/x-auth/clerk-callback"
      />
    </div>
  );
}
