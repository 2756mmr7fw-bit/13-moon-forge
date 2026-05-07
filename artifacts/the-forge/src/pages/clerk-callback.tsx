import { useEffect } from "react";
import {
  useAuth as useClerkAuth,
  useSession,
} from "@clerk/clerk-react";
import { useLocation } from "wouter";

const CLERK_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY as string | undefined;

export default function ClerkCallbackPage() {
  const { isSignedIn, isLoaded } = useClerkAuth();
  const { session } = useSession();
  const [, navigate] = useLocation();

  useEffect(() => {
    if (!CLERK_KEY) {
      navigate("/sign-in");
      return;
    }
    if (!isLoaded) return;

    if (!isSignedIn || !session) {
      navigate("/sign-in");
      return;
    }

    session
      .getToken()
      .then((token) => {
        if (!token) {
          navigate("/sign-in");
          return;
        }
        return fetch("/x-auth/clerk-session", {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token }),
        });
      })
      .then((res) => {
        if (!res || !res.ok) throw new Error("session creation failed");
        window.location.href = "/";
      })
      .catch(() => navigate("/sign-in"));
  }, [isLoaded, isSignedIn, session, navigate]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
    </div>
  );
}
