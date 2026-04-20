import { useAuth } from "@clerk/react";
import { useLocation, Redirect } from "wouter";

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { isSignedIn, isLoaded } = useAuth();
  const [location] = useLocation();

  if (!isLoaded) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!isSignedIn) {
    const returnPath = encodeURIComponent(location);
    return <Redirect to={`/sign-in?redirect_url=${returnPath}`} />;
  }

  return <>{children}</>;
}
