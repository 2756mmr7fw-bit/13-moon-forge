import { useEffect, useState } from "react";
import {
  useAuth as useClerkAuth,
  useSession,
} from "@clerk/clerk-react";

const CLERK_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY as string | undefined;

export default function ClerkCallbackPage() {
  const { isSignedIn, isLoaded } = useClerkAuth();
  const { session } = useSession();
  const [error, setError] = useState<string | null>(null);
  const [detail, setDetail] = useState<string | null>(null);

  useEffect(() => {
    if (!CLERK_KEY) { setError("No Clerk key configured"); return; }
    if (!isLoaded) return;
    if (!isSignedIn || !session) { setError("Not signed in to Clerk"); return; }

    session
      .getToken()
      .then((token) => {
        if (!token) { setError("getToken() returned null"); return; }
        return fetch("/x-auth/clerk-session", {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token, sessionId: session.id }),
        }).then(async (res) => {
          const body = await res.text();
          if (!res.ok) {
            setError(`Server returned ${res.status}`);
            setDetail(body);
            return;
          }
          window.location.href = "/";
        });
      })
      .catch((err: unknown) => {
        setError(String(err));
      });
  }, [isLoaded, isSignedIn, session]);

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-6">
        <div className="max-w-md w-full rounded-xl border border-destructive/40 bg-destructive/5 p-6 space-y-3">
          <p className="font-bold text-destructive text-lg">Sign-in error</p>
          <p className="text-sm font-mono bg-black/20 rounded p-2 break-all">{error}</p>
          {detail && (
            <p className="text-xs font-mono bg-black/20 rounded p-2 break-all">{detail}</p>
          )}
          <p className="text-xs text-muted-foreground">Take a photo of this screen and share it.</p>
          <button
            onClick={() => { window.location.href = "/sign-in"; }}
            className="text-sm underline text-primary"
          >
            Back to sign-in
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
    </div>
  );
}
