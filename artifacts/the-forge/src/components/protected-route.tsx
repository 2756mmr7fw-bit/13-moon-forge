import { useAuth } from "@workspace/replit-auth-web";
import { useLocation, Redirect } from "wouter";

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { isAuthenticated, isLoading, login } = useAuth();
  const [location] = useLocation();

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!isAuthenticated) {
    void login;
    const returnPath = encodeURIComponent(location);
    return <Redirect to={`/sign-in?redirect_url=${returnPath}`} />;
  }

  return <>{children}</>;
}
