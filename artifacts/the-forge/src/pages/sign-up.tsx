import { SignUp } from "@clerk/clerk-react";

export default function SignUpPage() {
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
