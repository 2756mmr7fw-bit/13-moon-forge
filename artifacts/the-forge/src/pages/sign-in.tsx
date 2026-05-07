import { SignIn } from "@clerk/clerk-react";

export default function SignInPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <SignIn
        routing="hash"
        forceRedirectUrl="/x-auth/clerk-callback"
        signUpForceRedirectUrl="/x-auth/clerk-callback"
      />
    </div>
  );
}
